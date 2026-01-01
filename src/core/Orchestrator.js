/**
 * Orchestrator.js
 * 통합 스케줄러 - 광산/레이드/다운로드 관리
 * 
 * 동작 흐름:
 * 1. 살아있는 광산 있으면 → 채굴
 * 2. 광산 없으면 (폐광) → 대체 행동
 *    - 레이드 시간이면 → 공격 1회
 *    - 아니면 → 파일 다운로드 (향후)
 * 3. 30분 후 광산 재확인 → 1번으로
 */

import { createLogger } from '../utils/logger.js';
import { sleep, randomInt } from '../utils/randomizer.js';
import { MineGame } from '../actions/MineGame.js';
import { MonsterRaid } from '../actions/MonsterRaid.js';

const log = createLogger('Orchestrator');

/**
 * 통합 스케줄러 클래스
 */
export class Orchestrator {
    /**
     * @param {import('../core/BrowserEngine.js').BrowserEngine} browserEngine
     */
    constructor(browserEngine) {
        this.browserEngine = browserEngine;
        this.mineGame = null;
        this.monsterRaid = null;
        this.isRunning = false;

        // 통계
        this.stats = {
            miningReward: 0,
            raidReward: 0,
            downloadCount: 0,
        };
    }

    /**
     * 초기화
     */
    async init() {
        log.info('통합 스케줄러 초기화 중...');

        // 광산 채굴 모듈
        this.mineGame = new MineGame(this.browserEngine);
        await this.mineGame.init();

        // 몬스터 레이드 모듈
        this.monsterRaid = new MonsterRaid(this.browserEngine);
        await this.monsterRaid.init();

        log.info('통합 스케줄러 준비 완료');
    }

    /**
     * 메인 루프 시작
     * @param {Object} options
     * @param {number} options.dailyMiningGoal - 하루 채굴 목표 (0 = 무제한)
     */
    async start(options = {}) {
        const { dailyMiningGoal = 0 } = options;
        this.isRunning = true;

        log.info('=== 통합 스케줄러 시작 ===');
        if (dailyMiningGoal > 0) {
            log.info(`하루 목표: ${dailyMiningGoal}회 채굴`);
        }

        while (this.isRunning) {
            try {
                // 1. 살아있는 광산 확인
                const mineFound = await this._tryMining();

                if (!mineFound) {
                    // 2. 광산 없으면 대체 행동
                    await this._doAlternativeActions();
                }

                // 목표 달성 확인
                if (dailyMiningGoal > 0 && this.mineGame.mineCount >= dailyMiningGoal) {
                    log.info(`🎯 하루 목표 달성! (${dailyMiningGoal}회)`);
                    break;
                }

            } catch (error) {
                log.error(`오류 발생: ${error.message}`);
                await sleep(60000); // 1분 대기 후 재시도
            }
        }

        log.info('=== 통합 스케줄러 종료 ===');
        this._printStats();
    }

    /**
     * 광산 채굴 시도
     * @returns {Promise<boolean>} 광산 있으면 true
     * @private
     */
    async _tryMining() {
        log.info('📍 살아있는 광산 확인 중...');

        const success = await this.mineGame.autoNavigateToAliveMine();

        if (!success) {
            log.info('❌ 살아있는 광산 없음 (폐광됨)');
            return false;
        }

        // 채굴 1회 수행
        log.info('⛏️ 채굴 시작...');
        const result = await this.mineGame.mineOnce();

        if (result.success) {
            this.stats.miningReward += result.reward;
            log.info(`✅ 채굴 성공! +${result.reward} MP (총 ${this.stats.miningReward} MP)`);
        }

        // 대기 시간
        const waitTime = this.mineGame.getWaitTime();
        const waitMin = Math.floor(waitTime / 60000);
        const waitSec = Math.floor((waitTime % 60000) / 1000);
        log.info(`⏳ 다음 채굴까지 ${waitMin}분 ${waitSec}초`);

        // 대기 중 IdleBehavior 사용
        if (this.mineGame.idleBehavior) {
            await this.mineGame.idleBehavior.idle(waitTime);
        } else {
            await sleep(waitTime);
        }

        return true;
    }

    /**
     * 대체 행동 (광산 없을 때)
     * @private
     */
    async _doAlternativeActions() {
        log.info('🔄 대체 행동 시작 (최대 30분 대기)');

        const maxWait = 30 * 60 * 1000; // 30분
        const endTime = Date.now() + maxWait;

        while (Date.now() < endTime && this.isRunning) {
            // 레이드 시간 확인
            if (this.monsterRaid.isRaidTime()) {
                log.info('⚔️ 레이드 시간! 공격 시도...');
                const result = await this.monsterRaid.attackOnce();

                if (result.success) {
                    this.stats.raidReward += result.reward;
                    log.info(`✅ 레이드 공격 성공! +${result.reward} 포인트`);
                }

                // 레이드 후 5분 대기 (다시 광산 확인)
                await sleep(5 * 60 * 1000);
                break;
            }

            // TODO: 파일 다운로드 (향후 구현)
            // if (this.downloader) {
            //     await this.downloader.downloadOne();
            // }

            // 5분마다 광산 재확인
            log.info('💤 5분 대기 후 광산 재확인...');
            await sleep(5 * 60 * 1000);

            // 광산 확인
            await this.mineGame.navigateToMineList();
            const aliveMine = await this.mineGame.findAliveMine();
            if (aliveMine) {
                log.info('✅ 새 광산 발견!');
                break;
            }
        }
    }

    /**
     * 중지
     */
    stop() {
        this.isRunning = false;
        if (this.mineGame) this.mineGame.stop();
        log.info('스케줄러 중지 요청됨');
    }

    /**
     * 통계 출력
     * @private
     */
    _printStats() {
        log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log.info('📊 최종 통계:');
        log.info(`   채굴: ${this.mineGame?.mineCount || 0}회, ${this.stats.miningReward} MP`);
        log.info(`   레이드: ${this.monsterRaid?.attackCount || 0}회, ${this.stats.raidReward} 포인트`);
        log.info(`   다운로드: ${this.stats.downloadCount}개`);
        log.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * 현재 상태
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            mining: this.mineGame?.getStatus(),
            raid: this.monsterRaid?.getStatus(),
            stats: this.stats,
        };
    }
}

export default Orchestrator;
