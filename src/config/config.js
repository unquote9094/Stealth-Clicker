/**
 * config.js
 * 전역 설정값 관리
 * 
 * 모든 설정은 여기서 관리하여 유지보수 용이
 */

export const CONFIG = {
    // ===== 사이트 설정 =====
    SITE: {
        // 타겟 도메인 패턴
        DOMAINS: ['booktoki', 'newtoki'],
        // 기본 URL (숫자는 바뀔 수 있음)
        BASE_URL: 'https://booktoki469.com',
    },

    // ===== 타이밍 설정 =====
    TIMING: {
        // 광산 채굴 대기 시간 (밀리초)
        MINE_COOLDOWN: 300 * 1000, // 300초 = 5분

        // 다운로드 간격 (밀리초)
        DOWNLOAD_DELAY: {
            MIN: 30 * 1000,  // 최소 30초
            MAX: 60 * 1000,  // 최대 60초
        },

        // 클릭 전 대기 (밀리초)
        CLICK_DELAY: {
            MIN: 100,
            MAX: 500,
        },

        // 페이지 전환 후 대기 (밀리초)
        PAGE_LOAD_DELAY: {
            MIN: 2000,
            MAX: 4000,
        },

        // 휴식 간격 (밀리초)
        REST_INTERVAL: 30 * 60 * 1000, // 30분마다
        REST_DURATION: {
            MIN: 3 * 60 * 1000,  // 최소 3분 휴식
            MAX: 7 * 60 * 1000,  // 최대 7분 휴식
        },
    },

    // ===== 스케줄 설정 =====
    SCHEDULE: {
        // 운영 시간 (24시간 형식)
        ACTIVE_HOURS: {
            START: 8,  // 08:00 시작
            END: 24,   // 24:00 (자정) 종료
        },

        // 하루 다운로드 제한
        DAILY_DOWNLOAD_LIMIT: 50,
    },

    // ===== 마우스 설정 =====
    MOUSE: {
        // 클릭 좌표 랜덤 오프셋 (픽셀)
        CLICK_OFFSET: {
            MIN: -10,
            MAX: 10,
        },

        // 마우스 이동 속도 (ghost-cursor용)
        MOVE_SPEED: {
            MIN: 1,
            MAX: 3,
        },
    },

    // ===== 파일 저장 경로 =====
    PATHS: {
        DOWNLOADS: './downloads',       // 다운로드 파일 저장
        LOGS: './logs',                 // 로그 파일
        COOKIES: './data/cookies.json', // 쿠키 저장
        PROGRESS: './data/progress.json', // 진행 상황 저장
    },

    // ===== 디버그 설정 =====
    DEBUG: {
        HEADLESS: false,  // 브라우저 표시 (디버깅용)
        SCREENSHOTS: true, // 에러 시 스크린샷 저장
    },
};

/**
 * 랜덤 범위 내 값 반환 (밀리초)
 * @param {{MIN: number, MAX: number}} range - 범위 객체
 * @returns {number} 랜덤 값
 */
export function getRandomDelay(range) {
    return Math.floor(Math.random() * (range.MAX - range.MIN + 1)) + range.MIN;
}

/**
 * Jitter 추가 (±10~20%)
 * @param {number} value - 기본값
 * @param {number} percent - 변동 퍼센트 (기본 15%)
 * @returns {number} Jitter 적용된 값
 */
export function addJitter(value, percent = 15) {
    const variation = value * (percent / 100);
    const jitter = (Math.random() * 2 - 1) * variation;
    return Math.floor(value + jitter);
}

export default CONFIG;
