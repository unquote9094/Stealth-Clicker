/**
 * logger.js
 * 로그 파일 저장 및 콘솔 출력 유틸리티
 * 
 * 기능:
 * - 콘솔 출력 + 파일 저장
 * - 날짜별 로그 파일 분리
 * - 레벨별 로깅 (info, warn, error, debug)
 */

import fs from 'fs';
import path from 'path';

// 로그 저장 경로
const LOG_DIR = path.join(process.cwd(), 'logs');

// ANSI 색상 코드
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
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
 * 현재 날짜 문자열 (YYYY-MM-DD)
 */
function getDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * 현재 시간 문자열 (HH:MM:SS)
 */
function getTimeString() {
    return new Date().toTimeString().split(' ')[0];
}

/**
 * 로그 메시지 포맷팅
 * @param {string} level - 로그 레벨
 * @param {string} message - 메시지
 * @returns {string} 포맷된 메시지
 */
function formatMessage(level, message) {
    const time = getTimeString();
    return `[${time}] [${level.toUpperCase()}] ${message}`;
}

/**
 * 파일에 로그 저장
 * @param {string} filename - 파일명
 * @param {string} message - 메시지
 */
function writeToFile(filename, message) {
    ensureLogDir();
    const filePath = path.join(LOG_DIR, filename);
    fs.appendFileSync(filePath, message + '\n', 'utf8');
}

/**
 * Logger 클래스
 */
class Logger {
    constructor(prefix = '') {
        this.prefix = prefix;
        // CONFIG.DEBUG.TERMINAL_UI가 true면 콘솔 출력 비활성화
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
        writeToFile(`${getDateString()}.log`, formatted);
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
        writeToFile(`${getDateString()}.log`, formatted);
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
        writeToFile(`${getDateString()}.log`, formatted);
        writeToFile(`${getDateString()}_errors.log`, formatted);
    }

    /**
     * 디버그 로그 (파일만 저장, 콘솔 출력 X)
     */
    debug(message) {
        const msg = this.prefix ? `[${this.prefix}] ${message}` : message;
        const formatted = formatMessage('DEBUG', msg);
        writeToFile(`${getDateString()}_debug.log`, formatted);
    }

    /**
     * 다운로드 기록 (별도 파일)
     * @param {Object} record - 다운로드 기록 객체
     */
    download(record) {
        const time = `${getDateString()} ${getTimeString()}`;
        const line = `${time} | 게시물#${record.postId || '?'} | ${record.filename || '?'} | ${record.size || '?'}`;

        console.log(`${colors.cyan}📥 다운로드: ${record.filename}${colors.reset}`);
        writeToFile('downloads.log', line);
    }

    /**
     * 채굴 기록 (별도 파일)
     * @param {Object} record - 채굴 기록 객체
     */
    mining(record) {
        const time = `${getDateString()} ${getTimeString()}`;
        const line = `${time} | 광산#${record.mineId || '?'} | +${record.points || 0}MP | 대기:${record.cooldown || 300}초`;

        console.log(`${colors.green}⛏️ 채굴: +${record.points}MP${colors.reset}`);
        writeToFile('mining.log', line);
    }
}

// 기본 로거 인스턴스
export const logger = new Logger();

// 모듈별 로거 생성 함수
export function createLogger(prefix) {
    return new Logger(prefix);
}

export default Logger;
