/**
 * TerminalUI.js
 * 터미널 실시간 모니터링 UI (개선 버전)
 * 
 * - 다음 작업 표시
 * - 더 나은 상태 표시
 */

import { CONFIG } from '../config/config.js';
import Logger, { SESSION } from './logger.js';

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
            remaining: 0,       // 다음 채굴까지 남은 시간 (밀리초)
            nextAction: '',     // 다음 예정 작업
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
                // 남은 시간 자동 감소
                if (this.state.remaining > 0) {
                    this.state.remaining = Math.max(0, this.state.remaining - 1000);
                }
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
     * 남은 시간 업데이트
     */
    updateRemaining(remainingMs) {
        this.state.remaining = remainingMs;
    }

    /**
     * 다음 작업 표시 설정
     */
    updateNextAction(action) {
        this.state.nextAction = action;
    }

    /**
     * 화면 렌더링
     */
    render() {
        const s = this.state;
        const time = new Date().toLocaleTimeString('ko-KR');

        // 남은 시간 포맷
        let waitStr = '-';
        if (s.remaining > 0) {
            const waitMin = Math.floor(s.remaining / 60000);
            const waitSec = Math.floor((s.remaining % 60000) / 1000);
            waitStr = `${waitMin}분 ${waitSec}초`;
        } else if (s.status.includes('중...') || s.status.includes('처리')) {
            waitStr = '작업 중...';
        }

        // 다음 작업 계산
        let nextStr = s.nextAction || this._getNextActionStr();

        // 기능 상태
        const miningFlag = s.features.MINING ? '✅' : '❌';
        const raidFlag = s.features.RAID ? '✅' : '❌';
        const downloadFlag = s.features.DOWNLOAD ? '✅' : '❌';

        // 진행률 바
        const miningProgress = Math.min(100, Math.floor((s.mining.count / s.mining.target) * 100));
        const miningBar = this._progressBar(miningProgress, 15);

        // 화면 클리어 + 출력
        console.clear();
        console.log('┌───────────────────────────────────────────────────────┐');
        console.log(`│ 🎮 Stealth-Clicker                          ${time} │`);
        console.log('├───────────────────────────────────────────────────────┤');
        console.log(`│ 현재: ${this._pad(s.status, 47)} │`);
        console.log(`│ 대기: ${this._pad(waitStr, 47)} │`);
        console.log(`│ 다음: ${this._pad(nextStr, 47)} │`);
        console.log('├───────────────────────────────────────────────────────┤');
        console.log(`│ ⛏️ 채굴  ${miningFlag} ${this._pad(`${s.mining.count}/${s.mining.target}`, 6)} ${miningBar} ${this._pad(`${s.mining.reward} MP`, 10)} │`);
        console.log(`│ ⚔️ 레이드 ${raidFlag} ${this._pad(`${s.raid.count}회`, 8)} ${this._pad(`${s.raid.reward} XP`, 12)}              │`);
        console.log(`│ 📥 다운  ${downloadFlag} ${this._pad(`${s.download.count}/${s.download.target}`, 8)}                           │`);
        console.log('├───────────────────────────────────────────────────────┤');
        console.log(`│ 세션: ${this._pad(SESSION.ID, 47)} │`);
        console.log('└───────────────────────────────────────────────────────┘');
        console.log('  [Ctrl+C] 종료');
    }

    /**
     * 다음 작업 문자열 생성
     */
    _getNextActionStr() {
        const s = this.state;
        const parts = [];

        // 채굴 시간
        if (s.features.MINING && s.remaining > 0) {
            const min = Math.floor(s.remaining / 60000);
            const sec = Math.floor((s.remaining % 60000) / 1000);
            parts.push(`⛏️ 채굴 (${min}분 ${sec}초 후)`);
        } else if (s.features.MINING && s.remaining <= 0) {
            parts.push('⛏️ 채굴 (준비됨)');
        }

        // 레이드 시간 체크
        if (s.features.RAID) {
            const minutes = new Date().getMinutes();
            if (minutes >= 10 && minutes < 20) {
                parts.push('⚔️ 레이드 시간대!');
            } else if (minutes >= 40 && minutes < 50) {
                parts.push('⚔️ 레이드 시간대!');
            } else {
                // 다음 레이드 시간
                let nextRaid = '';
                if (minutes < 10) {
                    nextRaid = `${10 - minutes}분 후`;
                } else if (minutes < 40) {
                    nextRaid = `${40 - minutes}분 후`;
                } else {
                    nextRaid = `${70 - minutes}분 후`;
                }
                parts.push(`⚔️ 레이드 (${nextRaid})`);
            }
        }

        return parts.join(' | ') || '대기 중';
    }

    /**
     * 진행률 바 생성
     */
    _progressBar(percent, length) {
        const filled = Math.floor((percent / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * 문자열 패딩
     */
    _pad(str, length) {
        const s = String(str);
        const padding = length - this._strWidth(s);
        return s + ' '.repeat(Math.max(0, padding));
    }

    /**
     * 문자열 폭 계산 (한글 = 2)
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
