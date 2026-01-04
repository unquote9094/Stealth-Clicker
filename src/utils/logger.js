/**
 * logger.js
 * 로그 및 세션 리포트 시스템
 * 
 * 기능:
 * - 세션별 로그 파일 (스크립트 실행마다 새 파일)
 * - 타임라인 이벤트 기록
 * - 세션 리포트 생성
 * - 레벨별 로깅 (info, warn, error, debug)
 */

import fs from 'fs';
import path from 'path';

// 로그 저장 경로
const LOG_DIR = path.join(process.cwd(), 'logs');

// 세션 정보 (스크립트 시작 시 고정)
const SESSION_START = new Date();
const SESSION_ID = formatDateTime(SESSION_START).replace(/[: ]/g, '-');

// 타임라인 이벤트 저장
const timeline = [];

// 세션 통계
const sessionStats = {
    mineCount: 0,
    mineReward: 0,
    raidCount: 0,
    raidReward: 0,
    downloadCount: 0,
    cfAutoPass: 0,
    cfCheckboxPass: 0,
    cfFail: 0,
    errors: 0,
};

// ANSI 색상 코드
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
};

/**
 * 로그 디렉토리 생성 (없으면)
 */
function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

/**
 * 날짜+시간 문자열 (YYYY-MM-DD HH:MM:SS)
 */
function formatDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${sec}`;
}

/**
 * 시간 문자열 (HH:MM:SS)
 */
function getTimeString() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

/**
 * 로그 메시지 포맷팅
 */
function formatMessage(level, message) {
    const time = getTimeString();
    return `[${time}] [${level.toUpperCase()}] ${message}`;
}

/**
 * 파일에 로그 저장
 */
function writeToFile(filename, message) {
    ensureLogDir();
    const filePath = path.join(LOG_DIR, filename);
    fs.appendFileSync(filePath, message + '\n', 'utf8');
}

/**
 * 세션 로그 파일명
 */
function getSessionLogFile() {
    return `session_${SESSION_ID}.log`;
}

/**
 * 세션 리포트 파일명
 */
function getSessionReportFile() {
    return `session_${SESSION_ID}_report.md`;
}

/**
 * 타임라인에 이벤트 추가
 */
function addTimelineEvent(icon, event, detail) {
    const time = getTimeString();
    const entry = { time, icon, event, detail };
    timeline.push(entry);

    // 타임라인 로그 출력 (간결하게)
    const logLine = `${icon} ${event} → ${detail}`;
    writeToFile(getSessionLogFile(), `[${time}] [TIMELINE] ${logLine}`);

    return entry;
}

/**
 * Logger 클래스
 */
class Logger {
    constructor(prefix = '') {
        this.prefix = prefix;
        this.consoleOutput = true;
    }

    /**
     * 콘솔 출력 ON/OFF
     */
    static setConsoleOutput(enabled) {
        Logger._consoleEnabled = enabled;
    }

    _shouldLog() {
        return Logger._consoleEnabled !== false && this.consoleOutput;
    }

    /**
     * 일반 정보 로그
     */
    info(message) {
        const msg = this.prefix ? `[${this.prefix}] ${message}` : message;
        const formatted = formatMessage('INFO', msg);
        if (this._shouldLog()) {
            console.log(`${colors.green}${formatted}${colors.reset}`);
        }
        writeToFile(getSessionLogFile(), formatted);
    }

    /**
     * 경고 로그
     */
    warn(message) {
        const msg = this.prefix ? `[${this.prefix}] ${message}` : message;
        const formatted = formatMessage('WARN', msg);
        if (this._shouldLog()) {
            console.log(`${colors.yellow}${formatted}${colors.reset}`);
        }
        writeToFile(getSessionLogFile(), formatted);
    }

    /**
     * 에러 로그
     */
    error(message) {
        const msg = this.prefix ? `[${this.prefix}] ${message}` : message;
        const formatted = formatMessage('ERROR', msg);
        if (this._shouldLog()) {
            console.log(`${colors.red}${formatted}${colors.reset}`);
        }
        writeToFile(getSessionLogFile(), formatted);
        sessionStats.errors++;
    }

    /**
     * 디버그 로그 (파일만)
     */
    debug(message) {
        const msg = this.prefix ? `[${this.prefix}] ${message}` : message;
        const formatted = formatMessage('DEBUG', msg);
        writeToFile(getSessionLogFile(), formatted);
    }

    /**
     * ========== 타임라인 이벤트 ==========
     */

    /**
     * 채굴 완료 이벤트
     */
    mineComplete(reward, total) {
        sessionStats.mineCount++;
        sessionStats.mineReward = total;
        addTimelineEvent('⛏️', `채굴 #${sessionStats.mineCount}`, `+${reward} MP (총: ${total} MP)`);
    }

    /**
     * 레이드 완료 이벤트
     */
    raidComplete(reward, total) {
        sessionStats.raidCount++;
        sessionStats.raidReward = total;
        addTimelineEvent('⚔️', `레이드 #${sessionStats.raidCount}`, `+${reward} XP (총: ${total} XP)`);
    }

    /**
     * 다운로드 완료 이벤트
     */
    downloadComplete(filename) {
        sessionStats.downloadCount++;
        addTimelineEvent('📥', `다운로드 #${sessionStats.downloadCount}`, filename);
    }

    /**
     * CF 통과 이벤트
     */
    cfPass(type) {
        if (type === 'auto') {
            sessionStats.cfAutoPass++;
            addTimelineEvent('🔓', 'CF 자동 통과', '성공');
        } else {
            sessionStats.cfCheckboxPass++;
            addTimelineEvent('✅', 'CF 체크박스', '통과');
        }
    }

    /**
     * CF 실패 이벤트
     */
    cfFail() {
        sessionStats.cfFail++;
        addTimelineEvent('❌', 'CF 통과 실패', '수동 개입 필요');
    }

    /**
     * 세션 시작 이벤트
     */
    sessionStart() {
        addTimelineEvent('🚀', '세션 시작', formatDateTime(SESSION_START));
        this.info(`세션 시작: ${SESSION_ID}`);
    }

    /**
     * ========== 세션 리포트 ==========
     */

    /**
     * 세션 리포트 생성
     */
    generateReport() {
        const now = new Date();
        const duration = Math.floor((now - SESSION_START) / 1000);
        const durationStr = `${Math.floor(duration / 60)}분 ${duration % 60}초`;

        let report = `# 🎮 세션 리포트\n\n`;
        report += `> **세션 ID**: ${SESSION_ID}  \n`;
        report += `> **시작**: ${formatDateTime(SESSION_START)}  \n`;
        report += `> **종료**: ${formatDateTime(now)}  \n`;
        report += `> **소요 시간**: ${durationStr}\n\n`;

        report += `---\n\n`;
        report += `## 📊 통계\n\n`;
        report += `| 항목 | 횟수 | 획득 |\n`;
        report += `|:---|:---:|:---|\n`;
        report += `| ⛏️ 채굴 | ${sessionStats.mineCount}회 | ${sessionStats.mineReward} MP |\n`;
        report += `| ⚔️ 레이드 | ${sessionStats.raidCount}회 | ${sessionStats.raidReward} XP |\n`;
        report += `| 📥 다운로드 | ${sessionStats.downloadCount}개 | - |\n`;
        report += `| 🔓 CF 자동 | ${sessionStats.cfAutoPass}회 | - |\n`;
        report += `| ✅ CF 체크박스 | ${sessionStats.cfCheckboxPass}회 | - |\n`;
        report += `| ❌ CF 실패 | ${sessionStats.cfFail}회 | - |\n`;
        report += `| ⚠️ 오류 | ${sessionStats.errors}회 | - |\n`;

        report += `\n---\n\n`;
        report += `## 📅 타임라인\n\n`;
        report += `| 시간 | 이벤트 | 결과 |\n`;
        report += `|:---|:---|:---|\n`;
        for (const e of timeline) {
            report += `| ${e.time} | ${e.icon} ${e.event} | ${e.detail} |\n`;
        }

        report += `\n---\n\n`;
        report += `## 📁 로그 파일\n\n`;
        report += `- [세션 로그](${getSessionLogFile()})\n`;

        // 파일 저장
        ensureLogDir();
        const filePath = path.join(LOG_DIR, getSessionReportFile());
        fs.writeFileSync(filePath, report, 'utf8');

        this.info(`세션 리포트 생성: ${getSessionReportFile()}`);
        return filePath;
    }

    /**
     * 현재 통계 반환 (UI용)
     */
    getStats() {
        return { ...sessionStats };
    }

    /**
     * 타임라인 반환
     */
    getTimeline() {
        return [...timeline];
    }
}

// 기본 로거 인스턴스
export const logger = new Logger();

// 모듈별 로거 생성 함수
export function createLogger(prefix) {
    return new Logger(prefix);
}

// 세션 정보 export
export const SESSION = {
    ID: SESSION_ID,
    START: SESSION_START,
    getLogFile: getSessionLogFile,
    getReportFile: getSessionReportFile,
};

export default Logger;
