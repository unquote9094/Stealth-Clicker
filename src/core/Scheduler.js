/**
 * Scheduler.js
 * 메인 스케줄러 - 채굴/레이드/다운로드 순차 실행
 * 
 * 핵심 원칙:
 * - 단순한 while 루프 + sleep(1초)
 * - 시간 기반 작업 트리거 (쿨타임 관리)
 * - 한 번에 하나만 실행 (순차적)
 */

import { CONFIG } from '../config/config.js';
import { createLogger } from '../utils/logger.js';
import Human, { sleep } from '../utils/Human.js';
import { TerminalUI } from '../utils/TerminalUI.js';
import { MineGame } from '../actions/MineGame.js';
import { MonsterRaid } from '../actions/MonsterRaid.js';

const log = createLogger('Scheduler');

/**
 * 메인 스케줄러 클래스
 */
export class Scheduler {
    /**
     * @param {import('./BrowserEngine.js').BrowserEngine} browserEngine
     */
    constructor(browserEngine) {
        this.browserEngine = browserEngine;
        this.page = null;
        this.ui = null;
        this.isRunning = false;

        // 타이머 (timestamp)
        this.nextMineTime = 0;           // 다음 채굴 시간
        this.lastRaidSlot = null;        // 마지막 레이드 슬롯 (중복 방지)

        // 다운로드 시간 할당 (채굴 쿨타임 내에서)
        this.downloadStartTime = 0;      // 다운로드 시작 시간
        this.downloadEndTime = 0;        // 다운로드 종료 시간
        this.isDownloading = false;      // 다운로드 중 여부

        // 통계
        this.stats = {
            mineCount: 0,
            mineReward: 0,
            raidCount: 0,
            raidReward: 0,
            downloadCount: 0,
        };

        // 액션 모듈
        this.mineGame = null;
        this.monsterRaid = null;
    }

    /**
     * 초기화
     */
    async init() {
        log.info('스케줄러 초기화 중...');

        this.page = this.browserEngine.getPage();
        if (!this.page) {
            throw new Error('브라우저가 실행되지 않았습니다.');
        }

        // UI 초기화
        this.ui = new TerminalUI();

        // Human 모듈에 UI 콜백 연결 (CF 처리 등 상태 표시용)
        Human.setUICallback((status) => this._updateUI(status));

        // 액션 모듈 초기화
        if (CONFIG.FEATURES.MINING) {
            this.mineGame = new MineGame(this.browserEngine);
            await this.mineGame.init();
        }

        if (CONFIG.FEATURES.RAID) {
            this.monsterRaid = new MonsterRaid(this.browserEngine);
            await this.monsterRaid.init();
        }

        log.info('스케줄러 초기화 완료');
    }

    /**
     * 메인 루프 시작
     */
    async run() {
        this.isRunning = true;
        this.ui.start();

        log.info('=== 스케줄러 시작 ===');
        log.sessionStart(); // 타임라인 세션 시작 이벤트
        this._updateUI('시작 중...');

        // 첫 채굴은 즉시
        this.nextMineTime = Date.now();

        while (this.isRunning) {
            try {
                await this._tick();
            } catch (error) {
                log.error(`오류 발생: ${error.message}`);
                this._updateUI('⚠️ 오류 - 30초 후 재시도');
                await sleep(30000);
            }

            // 1초마다 루프
            await sleep(1000);
        }

        this.ui.stop();
        this._printStats();
        log.generateReport(); // 세션 리포트 생성
        log.info('=== 스케줄러 종료 ===');
    }

    /**
     * 매 초마다 실행되는 틱
     * @private
     */
    async _tick() {
        const now = Date.now();

        // ACTIVE_HOURS 체크 (설정된 시간대에만 동작)
        if (!this._isActiveHours()) {
            this._updateUI('💤 비활성 시간대 (휴식 중)');
            return;
        }

        // 우선순위 1: 채굴 (시간 되면)
        if (CONFIG.FEATURES.MINING && now >= this.nextMineTime) {
            await this._doMine();
            return; // 한 틱에 하나만
        }

        // 우선순위 2: 레이드 (시간대 맞으면)
        if (CONFIG.FEATURES.RAID && this._isRaidTime()) {
            await this._doRaid();
            return;
        }

        // 우선순위 3: 다운로드 시간대 (채굴 후 할당된 시간)
        if (this._isDownloadTime()) {
            await this._doDownload();
            return;
        }

        // 남는 시간: 랜덤 페이지 방문 (가끔)
        if (this._shouldVisitRandomPage()) {
            await this._doRandomVisit();
            return;
        }

        // 상태 상세 표시 + UI 갱신
        this._updateDetailedStatus();
    }

    /**
     * 활성 시간대인지 확인
     * @private
     */
    _isActiveHours() {
        const hour = new Date().getHours();
        const { START, END } = CONFIG.SCHEDULE?.ACTIVE_HOURS || { START: 0, END: 24 };

        // END가 24면 자정까지
        if (END === 24) {
            return hour >= START;
        }

        // START > END면 야간 시간대 (예: 22시~6시)
        if (START > END) {
            return hour >= START || hour < END;
        }

        return hour >= START && hour < END;
    }

    /**
     * 채굴 수행
     * @private
     */
    async _doMine() {
        this._updateUI('⛏️ 채굴 중...');
        log.info('채굴 시작');

        const result = await this.mineGame.mine();

        if (result.success) {
            this.stats.mineCount++;
            this.stats.mineReward += result.reward;
            log.info(`채굴 완료! +${result.reward} MP (총 ${this.stats.mineReward} MP)`);
            log.mineComplete(result.reward, this.stats.mineReward); // 타임라인
        } else {
            log.warn('채굴 실패 (살아있는 광산 없음 또는 폐광)');
        }

        // 다음 채굴 시간 설정
        const cooldown = CONFIG.TIMING.MINE_COOLDOWN || 300000;
        const extraMin = CONFIG.TIMING.MINE_EXTRA?.MIN || 0;
        const extraMax = CONFIG.TIMING.MINE_EXTRA?.MAX || 120000;
        const extra = Math.floor(Math.random() * (extraMax - extraMin + 1)) + extraMin;
        const totalWait = cooldown + extra;

        this.nextMineTime = Date.now() + totalWait;

        const waitSec = Math.floor(totalWait / 1000);
        log.info(`다음 채굴까지: ${Math.floor(waitSec / 60)}분 ${waitSec % 60}초`);

        // 다운로드 시간 할당 (채굴 쿨타임 내에서 60초 후부터 다운로드 시간)
        this._allocateDownloadTime(totalWait);

        // UI 갱신 (채굴 후 즉시 대기시간 표시!)
        this.ui.updateMining(this.stats.mineCount, this.stats.mineReward);
        this.ui.updateRemaining(totalWait); // 채굴 후 즉시 시간 표시
        this._updateUI('⏳ 대기 중 (레이드/다운로드 대기)');
    }

    /**
     * 다운로드 시간 할당 (채굴 후)
     * @param {number} totalWaitMs - 전체 대기시간 (밀리초)
     * @private
     */
    _allocateDownloadTime(totalWaitMs) {
        const now = Date.now();

        // 채굴 후 60초 대기, 그 다음 다운로드 시간대 시작
        // 다운로드 예상 시간: 3분 (180초)
        const downloadDelay = 60000; // 60초 후 시작
        const downloadDuration = CONFIG.TIMING.DOWNLOAD_DURATION || 180000; // 3분

        // 다운로드 시간대 설정
        this.downloadStartTime = now + downloadDelay;
        this.downloadEndTime = this.downloadStartTime + downloadDuration;
        this.isDownloading = false;

        const startSec = Math.floor(downloadDelay / 1000);
        const durationSec = Math.floor(downloadDuration / 1000);
        log.info(`다운로드 예정: ${startSec}초 후 시작, ${Math.floor(durationSec / 60)}분 동안`);
    }

    /**
     * 다운로드 시간대인지 확인
     * @private
     */
    _isDownloadTime() {
        const now = Date.now();
        // 다운로드 시간대이고, 아직 다운로드 안 했으면
        return now >= this.downloadStartTime &&
            now < this.downloadEndTime &&
            !this.isDownloading;
    }

    /**
     * 레이드 수행
     * @private
     */
    async _doRaid() {
        // 현재 슬롯
        const slot = this._getCurrentRaidSlot();

        // 이미 이 슬롯에서 공격했으면 스킵
        if (slot === this.lastRaidSlot) {
            return;
        }

        this._updateUI('⚔️ 레이드 공격!');
        log.info('레이드 공격 시작');

        const result = await this.monsterRaid.attack();

        if (result.success) {
            this.stats.raidCount++;
            this.stats.raidReward += result.reward;
            log.info(`레이드 완료! +${result.reward} XP`);
            log.raidComplete(result.reward, this.stats.raidReward); // 타임라인
        } else {
            log.warn('레이드 실패 (살아있는 몬스터 없음 또는 이미 공격)');
        }

        // 이 슬롯 기록
        this.lastRaidSlot = slot;

        // UI 갱신
        this.ui.updateRaid(this.stats.raidCount, this.stats.raidReward);
        this._updateUI('⏳ 대기 중');
    }

    /**
     * 다운로드 수행 (현재는 더미 - 시간만 예약)
     * @private
     */
    async _doDownload() {
        this.isDownloading = true;

        const downloadDuration = CONFIG.TIMING.DOWNLOAD_DURATION || 180000;
        const durationSec = Math.floor(downloadDuration / 1000);

        this._updateUI(`📥 다운로드 중 (${Math.floor(durationSec / 60)}분)...`);
        log.info(`다운로드 시작 (더미: ${Math.floor(durationSec / 60)}분 대기)`);

        // 다운로드 시간 동안 상태 업데이트
        const startTime = Date.now();
        const endTime = startTime + downloadDuration;

        while (Date.now() < endTime && this.isRunning) {
            const remaining = endTime - Date.now();
            const remainMin = Math.floor(remaining / 60000);
            const remainSec = Math.floor((remaining % 60000) / 1000);

            this._updateUI(`📥 다운로드 중 (남은: ${remainMin}분 ${remainSec}초)`);

            // 채굴 시간이 되면 즉시 중단
            if (Date.now() >= this.nextMineTime) {
                log.info('채굴 시간 도래 - 다운로드 중단');
                break;
            }

            await sleep(5000); // 5초마다 상태 갱신
        }

        this.stats.downloadCount++;
        log.info(`다운로드 ${this.stats.downloadCount}개 완료 (더미)`);
        log.downloadComplete(`더미 파일 #${this.stats.downloadCount}`); // 타임라인

        this.isDownloading = false;
        this.ui.updateDownload(this.stats.downloadCount);
        this._updateUI('⏳ 대기 중 (휴식)');
    }

    /**
     * 랜덤 페이지 방문
     * @private
     */
    async _doRandomVisit() {
        this._updateUI('🔀 둘러보기 중...');
        await Human.visitRandomPage(this.page);
        this._updateUI('⏳ 대기 중');
    }

    /**
     * 상태 상세 표시
     * @private
     */
    _updateDetailedStatus() {
        const now = Date.now();
        const remaining = Math.max(0, this.nextMineTime - now);
        this.ui.updateRemaining(remaining);

        // 다음 작업 결정
        let status = '⏳ 대기 중';

        if (remaining > 0) {
            const min = Math.floor(remaining / 60000);
            const sec = Math.floor((remaining % 60000) / 1000);

            // 다운로드 시간대 전
            if (now < this.downloadStartTime) {
                const dlWait = Math.floor((this.downloadStartTime - now) / 1000);
                status = `⏳ 휴식 중 (다운로드 ${dlWait}초 후)`;
            }
            // 다운로드 시간대 (이미 처리됨)
            else if (now >= this.downloadStartTime && now < this.downloadEndTime) {
                status = `📥 다운로드 시간대`;
            }
            // 다운로드 후
            else {
                status = `⏳ 휴식 중 (채굴 ${min}분 ${sec}초 후)`;
            }
        }

        this._updateUI(status);
    }

    /**
     * 레이드 시간인지 확인 (10분~20분, 40분~50분)
     * @private
     */
    _isRaidTime() {
        const minutes = new Date().getMinutes();
        return (minutes >= 10 && minutes < 20) || (minutes >= 40 && minutes < 50);
    }

    /**
     * 현재 레이드 슬롯 (HH:10 또는 HH:40)
     * @private
     */
    _getCurrentRaidSlot() {
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();

        if (minutes >= 10 && minutes < 20) {
            return `${hour}:10`;
        } else if (minutes >= 40 && minutes < 50) {
            return `${hour}:40`;
        }
        return null;
    }

    /**
     * 랜덤 페이지 방문 여부 (낮은 확률)
     * @private
     */
    _shouldVisitRandomPage() {
        // 다운로드 시간대면 랜덤 방문 안 함
        const now = Date.now();
        if (now >= this.downloadStartTime && now < this.downloadEndTime) {
            return false;
        }

        // 2% 확률
        const chance = CONFIG.IDLE_BEHAVIOR?.RANDOM_VISIT_CHANCE || 2;
        return Math.random() * 100 < chance;
    }

    /**
     * UI 상태 업데이트
     * @private
     */
    _updateUI(status) {
        this.ui.update({ status });
    }

    /**
     * 중지
     */
    stop() {
        this.isRunning = false;
        log.info('스케줄러 중지 요청됨');
    }

    /**
     * 통계 출력
     * @private
     */
    _printStats() {
        console.log('\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 최종 통계:');
        console.log(`   채굴: ${this.stats.mineCount}회, ${this.stats.mineReward} MP`);
        console.log(`   레이드: ${this.stats.raidCount}회, ${this.stats.raidReward} XP`);
        console.log(`   다운로드: ${this.stats.downloadCount}개`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}

export default Scheduler;
