/**
 * Orchestrator.js
 * 통합 스케줄러 - 광산/레이드/다운로드 관리
 * 
 * 기능 ON/OFF는 CONFIG.FEATURES로 제어
 */

import { createLogger } from '../utils/logger.js';
import { sleep, randomInt } from '../utils/randomizer.js';
import { CONFIG } from '../config/config.js';
import { MineGame } from '../actions/MineGame.js';
import { MonsterRaid } from '../actions/MonsterRaid.js';
import { TerminalUI } from '../utils/TerminalUI.js';

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
        this.terminalUI = null;
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

        // 광산 채굴 모듈 (FEATURES 확인)
        if (CONFIG.FEATURES.MINING) {
            this.mineGame = new MineGame(this.browserEngine);
            await this.mineGame.init();
        }

        // 몬스터 레이드 모듈 (FEATURES 확인)
        if (CONFIG.FEATURES.RAID) {
            this.monsterRaid = new MonsterRaid(this.browserEngine);
            await this.monsterRaid.init();
        }

        // 터미널 UI
        this.terminalUI = new TerminalUI();

        log.info('통합 스케줄러 준비 완료');
    }

    /**
     * 메인 루프 시작
     */
    async start(options = {}) {
        const dailyMiningGoal = options.dailyMiningGoal || CONFIG.GOALS.DAILY_MINING_COUNT;
        this.isRunning = true;

        // 터미널 UI 시작
        this.terminalUI.start();
        this._updateUI('시작 중...');

        log.info('=== 통합 스케줄러 시작 ===');

        while (this.isRunning) {
            try {
                // 1. 채굴 (MINING ON일 때만)
                if (CONFIG.FEATURES.MINING) {
                    const mineFound = await this._tryMining();

                    if (!mineFound) {
                        // 2. 광산 없으면 대체 행동
                        await this._doAlternativeActions();
                    }

                    // 목표 달성 확인
                    if (dailyMiningGoal > 0 && this.mineGame?.mineCount >= dailyMiningGoal) {
                        this._updateUI('🎯 목표 달성!');
                        log.info(`🎯 하루 목표 달성! (${dailyMiningGoal}회)`);
                        break;
                    }
                } else {
                    // 채굴 OFF면 대체 행동만
                    await this._doAlternativeActions();
                }

            } catch (error) {
                log.error(`오류 발생: ${error.message}`);
                this._updateUI('⚠️ 오류 - 1분 후 재시도');
                await sleep(60000);
            }
        }

        this.terminalUI.stop();
        log.info('=== 통합 스케줄러 종료 ===');
        this._printStats();
    }

    /**
     * 광산 채굴 시도
     * @private
     */
    async _tryMining() {
        this._updateUI('📍 광산 확인 중...');

        const success = await this.mineGame.autoNavigateToAliveMine();

        if (!success) {
            this._updateUI('❌ 광산 없음 (폐광)');
            return false;
        }

        // 채굴 수행
        this._updateUI('⛏️ 채굴 중...');
        const result = await this.mineGame.mineOnce();

        if (result.success) {
            this.stats.miningReward += result.reward;
            this.terminalUI.updateMining(
                this.mineGame.mineCount,
                this.stats.miningReward
            );
        }

        // 대기 시간
        const waitTime = this.mineGame.getWaitTime();
        this._updateUI('⏳ 대기 중');
        this.terminalUI.updateWait(waitTime);

        // 대기 (UI 갱신 포함)
        await this._waitWithUIUpdate(waitTime);

        return true;
    }

    /**
     * 대체 행동 (광산 없을 때)
     * @private
     */
    async _doAlternativeActions() {
        this._updateUI('🔄 대체 행동 중...');

        const maxWait = 30 * 60 * 1000;
        const endTime = Date.now() + maxWait;

        while (Date.now() < endTime && this.isRunning) {
            // 레이드 (RAID ON일 때만)
            if (CONFIG.FEATURES.RAID && this.monsterRaid?.isRaidTime()) {
                this._updateUI('⚔️ 레이드 공격!');
                const result = await this.monsterRaid.attackOnce();

                if (result.success) {
                    this.stats.raidReward += result.reward;
                    this.terminalUI.updateRaid(
                        this.monsterRaid.attackCount,
                        this.stats.raidReward
                    );
                }

                await sleep(5 * 60 * 1000);
                break;
            }

            // TODO: 다운로드 (DOWNLOAD ON일 때만)
            // if (CONFIG.FEATURES.DOWNLOAD && this.downloader) { ... }

            // 5분 대기 후 광산 재확인
            this._updateUI('💤 5분 대기...');
            await this._waitWithUIUpdate(5 * 60 * 1000);

            // 광산 확인 (MINING ON일 때만)
            if (CONFIG.FEATURES.MINING) {
                await this.mineGame.navigateToMineList();
                const aliveMine = await this.mineGame.findAliveMine();
                if (aliveMine) {
                    this._updateUI('✅ 새 광산 발견!');
                    break;
                }
            }
        }
    }

    /**
     * UI 갱신하면서 대기 (레이드 시간 체크 포함)
     * @private
     */
    async _waitWithUIUpdate(durationMs) {
        const endTime = Date.now() + durationMs;
        let lastRaidCheck = 0;

        while (Date.now() < endTime && this.isRunning) {
            const remaining = endTime - Date.now();
            this.terminalUI.updateWait(remaining);

            // 레이드 시간 체크 (1분마다)
            const now = Date.now();
            if (CONFIG.FEATURES.RAID && this.monsterRaid && now - lastRaidCheck > 60000) {
                lastRaidCheck = now;

                if (this.monsterRaid.isRaidTime()) {
                    this._updateUI('⚔️ 레이드 시간!');
                    log.info('대기 중 레이드 시간 감지 - 공격 시도');

                    // 레이드로 이동 전 대기 (사람처럼)
                    await sleep(randomInt(3000, 5000));

                    const result = await this.monsterRaid.attackOnce();

                    if (result.success) {
                        this.stats.raidReward += result.reward;
                        this.terminalUI.updateRaid(
                            this.monsterRaid.attackCount,
                            this.stats.raidReward
                        );
                        log.info(`레이드 공격 완료! +${result.reward} MP`);
                    }

                    // 레이드 후 광산 페이지로 복귀 전 대기
                    this._updateUI('⏳ 광산 복귀 중...');
                    await sleep(randomInt(3000, 5000));
                    await this.mineGame?.navigateToMine?.() ?? await sleep(2000);
                    this._updateUI('⏳ 대기 중');
                }
            }

            await sleep(1000);
        }

        this.terminalUI.updateWait(0);
    }

    /**
     * UI 상태 업데이트 헬퍼
     * @private
     */
    _updateUI(status) {
        this.terminalUI.update({ status });
    }

    /**
     * 중지
     */
    stop() {
        this.isRunning = false;
        if (this.mineGame) this.mineGame.stop();
        if (this.terminalUI) this.terminalUI.stop();
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
        console.log(`   채굴: ${this.mineGame?.mineCount || 0}회, ${this.stats.miningReward} MP`);
        console.log(`   레이드: ${this.monsterRaid?.attackCount || 0}회, ${this.stats.raidReward} 포인트`);
        console.log(`   다운로드: ${this.stats.downloadCount}개`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
