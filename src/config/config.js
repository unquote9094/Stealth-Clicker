/**
 * config.js
 * 전역 설정값 관리
 * 
 * 모든 설정은 여기서 관리하여 유지보수 용이
 */

import 'dotenv/config';

export const CONFIG = {
    // ===== 로그인 정보 (.env에서 읽기) =====
    AUTH: {
        ID: process.env.NEWTOKI_ID || '',
        PW: process.env.NEWTOKI_PW || '',
    },

    // ===== 기능 ON/OFF =====
    FEATURES: {
        MINING: true,      // 채굴 기능
        RAID: true,        // 몬스터 레이드
        DOWNLOAD: false,   // 파일 다운로드 (10레벨+10일 필요)
    },

    // ===== 목표 설정 =====
    GOALS: {
        DAILY_FILES: 100,           // 하루 다운로드 목표
        // 자동 계산: 100파일 × 100MP = 10,000MP 필요
        // 채굴 1회당 평균 170MP → 약 60회 필요
        DAILY_MINING_COUNT: 60,     // 하루 채굴 목표 (회)
    },

    // ===== 사이트 설정 (.env에서 읽기) =====
    SITE: {
        DOMAINS: ['booktoki', 'newtoki'],
        // 뉴토끼: 광산/레이드 (게임)
        NEWTOKI_URL: `https://${process.env.NEWTOKI_DOMAIN || 'newtoki469.com'}`,
        // 북토끼: 파일 다운로드 (자료실)
        BOOKTOKI_URL: `https://${process.env.BOOKTOKI_DOMAIN || 'booktoki469.com'}`,
        // 기본 URL (레거시 호환)
        get BASE_URL() { return this.NEWTOKI_URL; },
    },

    // ===== 타이밍 설정 =====
    TIMING: {
        // 채굴 쿨다운 (밀리초)
        MINE_COOLDOWN: 300 * 1000,  // 300초
        MINE_EXTRA: {
            MIN: 0,
            MAX: 100 * 1000,  // 0~100초 추가 → 300~400초
        },

        // 다운로드 간격 (밀리초)
        DOWNLOAD_DELAY: {
            MIN: 30 * 1000,
            MAX: 60 * 1000,
        },

        // 클릭 전 대기 (밀리초)
        CLICK_DELAY: {
            MIN: 100,
            MAX: 500,
        },

        // 페이지 전환 후 대기 (밀리초)
        PAGE_LOAD_DELAY: {
            MIN: 2000,
            MAX: 5000,  // 2~5초로 확장
        },

        // 휴식 간격 (밀리초)
        REST_INTERVAL: 30 * 60 * 1000,  // 30분마다
        REST_DURATION: {
            MIN: 3 * 60 * 1000,   // 3분
            MAX: 7 * 60 * 1000,   // 7분
        },
    },

    // ===== 스케줄 설정 =====
    SCHEDULE: {
        ACTIVE_HOURS: {
            START: 8,   // 08:00 시작
            END: 24,    // 24:00 종료
        },
    },

    // ===== 마우스 설정 =====
    MOUSE: {
        CLICK_OFFSET: {
            MIN: -10,
            MAX: 10,
        },
    },

    // ===== 파일 경로 =====
    PATHS: {
        DOWNLOADS: './downloads',
        LOGS: './logs',
        COOKIES: './data/cookies.json',
        PROGRESS: './data/progress.json',
        HISTORY: './data/history.json',
    },

    // ===== 디버그 =====
    DEBUG: {
        HEADLESS: false,
        SCREENSHOTS: true,
        TERMINAL_UI: true,  // 터미널 UI 사용
    },
};

/**
 * 랜덤 범위 내 값 반환
 */
export function getRandomDelay(range) {
    return Math.floor(Math.random() * (range.MAX - range.MIN + 1)) + range.MIN;
}

/**
 * Jitter 추가 (±%)
 */
export function addJitter(value, percent = 15) {
    const variation = value * (percent / 100);
    const jitter = (Math.random() * 2 - 1) * variation;
    return Math.floor(value + jitter);
}

export default CONFIG;
