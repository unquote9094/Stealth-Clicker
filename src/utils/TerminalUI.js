/**
 * TerminalUI.js
 * 터미널 실시간 모니터링 UI
 * 
 * 1초마다 화면 갱신, 현재 상태 표시
 */

import { CONFIG } from '../config/config.js';
import Logger from './logger.js';

/**
 * 터미널 UI 클래스
 */
export class TerminalUI {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.state = {
            status: '대기 중',
            mining: { count: 0, reward: 0, target: CONFIG.GOALS.DAILY_MINING_COUNT },
            raid: { count: 0, reward: 0 },
            download: { count: 0, target: CONFIG.GOALS.DAILY_FILES },
            currentMine: '',
            waitTime: 0,
            features: { ...CONFIG.FEATURES },
        };
    }

    /**
     * UI 시작 (1초마다 갱신)
     */
    start() {
        if (!CONFIG.DEBUG.TERMINAL_UI) return;

        // 터미널 UI 사용 시 Logger 콘솔 출력 끄기
        Logger.setConsoleOutput(false);

        this.isRunning = true;
        this.render();

        this.intervalId = setInterval(() => {
            if (this.isRunning) {
                this.render();
            }
        }, 1000);
    }

    /**
     * UI 중지
     */
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * 상태 업데이트
     */
    update(updates) {
        Object.assign(this.state, updates);
    }

    /**
     * 채굴 상태 업데이트
     */
    updateMining(count, reward) {
        this.state.mining.count = count;
        this.state.mining.reward = reward;
    }

    /**
     * 레이드 상태 업데이트
     */
    updateRaid(count, reward) {
        this.state.raid.count = count;
        this.state.raid.reward = reward;
    }

    /**
     * 다운로드 상태 업데이트
     */
    updateDownload(count) {
        this.state.download.count = count;
    }

    /**
     * 대기 시간 업데이트
     */
    updateWait(remainingMs) {
        this.state.waitTime = remainingMs;
    }

    /**
     * 화면 렌더링
     */
    render() {
        const s = this.state;
        const time = new Date().toLocaleTimeString('ko-KR');

        // 대기 시간 포맷
        const waitMin = Math.floor(s.waitTime / 60000);
        const waitSec = Math.floor((s.waitTime % 60000) / 1000);
        const waitStr = s.waitTime > 0 ? `${waitMin}분 ${waitSec}초` : '-';

        // 기능 상태
        const miningFlag = s.features.MINING ? '✅' : '❌';
        const raidFlag = s.features.RAID ? '✅' : '❌';
        const downloadFlag = s.features.DOWNLOAD ? '✅' : '❌';

        // 진행률 바
        const miningProgress = Math.min(100, Math.floor((s.mining.count / s.mining.target) * 100));
        const miningBar = this._progressBar(miningProgress, 15);

        // 화면 클리어 + 출력
        console.clear();
        console.log('┌─────────────────────────────────────────────────┐');
        console.log(`│ 🎮 Stealth-Clicker                    ${time} │`);
        console.log('├─────────────────────────────────────────────────┤');
        console.log(`│ 상태: ${this._pad(s.status, 40)} │`);
        console.log(`│ 광산: ${this._pad(s.currentMine || '-', 40)} │`);
        console.log(`│ 대기: ${this._pad(waitStr, 40)} │`);
        console.log('├─────────────────────────────────────────────────┤');
        console.log(`│ 채굴 ${miningFlag}  ${this._pad(`${s.mining.count}/${s.mining.target}회`, 8)} ${miningBar} ${this._pad(`${s.mining.reward} MP`, 10)} │`);
        console.log(`│ 레이드 ${raidFlag} ${this._pad(`${s.raid.count}회`, 10)} ${this._pad(`${s.raid.reward} 포인트`, 18)}     │`);
        console.log(`│ 다운 ${downloadFlag}  ${this._pad(`${s.download.count}/${s.download.target}개`, 12)}                      │`);
        console.log('└─────────────────────────────────────────────────┘');
        console.log('  [Ctrl+C] 종료');
    }

    /**
     * 진행률 바 생성
     * @private
     */
    _progressBar(percent, length) {
        const filled = Math.floor((percent / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * 문자열 패딩
     * @private
     */
    _pad(str, length) {
        const s = String(str);
        const padding = length - this._strWidth(s);
        return s + ' '.repeat(Math.max(0, padding));
    }

    /**
     * 문자열 폭 계산 (한글 = 2)
     * @private
     */
    _strWidth(str) {
        let width = 0;
        for (const char of str) {
            width += char.charCodeAt(0) > 127 ? 2 : 1;
        }
        return width;
    }
}

export default TerminalUI;
