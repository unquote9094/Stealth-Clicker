/**
 * Human.js
 * 인간적 행동 통합 유틸리티
 * 
 * 모든 "사람처럼" 동작을 여기로 통합:
 * - 랜덤 대기
 * - 자연스러운 클릭
 * - 클라우드플레어 대기
 */

import { CONFIG } from '../config/config.js';
import { createLogger } from './logger.js';

const log = createLogger('Human');

/**
 * 랜덤 정수 반환
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 대기 함수
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * UI 상태 업데이트 콜백 (Scheduler에서 설정)
 */
let uiCallback = null;

/**
 * Human 유틸리티 객체
 * 모든 인간적 행동을 담당
 */
const Human = {
    /**
     * UI 콜백 설정 (Scheduler가 호출)
     */
    setUICallback(callback) {
        uiCallback = callback;
    },

    /**
     * UI 상태 표시 (콜백 있을 때만)
     */
    _updateUI(status) {
        if (uiCallback) {
            uiCallback(status);
        }
    },

    /**
     * 랜덤 대기 (밀리초)
     * @param {number} minMs - 최소 대기시간
     * @param {number} maxMs - 최대 대기시간
     */
    async wait(minMs, maxMs) {
        const ms = randomInt(minMs, maxMs);
        log.debug(`대기: ${(ms / 1000).toFixed(1)}초`);
        await sleep(ms);
        return ms;
    },

    /**
     * 사람처럼 클릭 (스크롤 + 이동 + 딜레이 + 클릭)
     * @param {import('puppeteer').Page} page - 페이지 객체
     * @param {string} selector - CSS 셀렉터
     * @returns {Promise<boolean>} 성공 여부
     */
    async click(page, selector) {
        try {
            // 1. 요소 찾기
            const el = await page.$(selector);
            if (!el) {
                log.warn(`요소 없음: ${selector}`);
                return false;
            }

            // 2. 화면에 보이게 스크롤
            await el.scrollIntoView();
            await this.wait(300, 600);

            // 3. 요소 위치 + 랜덤 오프셋
            const box = await el.boundingBox();
            if (!box) {
                log.warn(`boundingBox 없음: ${selector}`);
                return false;
            }

            const offsetX = randomInt(-5, 5);
            const offsetY = randomInt(-5, 5);
            const x = box.x + box.width / 2 + offsetX;
            const y = box.y + box.height / 2 + offsetY;

            // 4. 마우스 이동 (자연스럽게)
            const steps = randomInt(10, 25);
            await page.mouse.move(x, y, { steps });
            await this.wait(100, 300);

            // 5. 클릭
            await page.mouse.click(x, y);
            log.debug(`클릭: ${selector} (${Math.round(x)}, ${Math.round(y)})`);

            return true;
        } catch (error) {
            log.error(`클릭 실패 (${selector}): ${error.message}`);
            return false;
        }
    },

    /**
     * 좌표로 직접 클릭 (CF 체크박스용)
     * @param {import('puppeteer').Page} page - 페이지 객체
     * @param {number} targetX - X 좌표
     * @param {number} targetY - Y 좌표
     */
    async clickAt(page, targetX, targetY) {
        try {
            // 1. 마우스 천천히 이동
            const steps = randomInt(30, 50);
            await page.mouse.move(targetX, targetY, { steps });
            await this.wait(500, 1000);

            // 2. 클릭
            await page.mouse.click(targetX, targetY);
            log.info(`좌표 클릭: (${targetX}, ${targetY})`);

            return true;
        } catch (error) {
            log.error(`좌표 클릭 실패: ${error.message}`);
            return false;
        }
    },

    /**
     * 클라우드플레어 페이지인지 확인
     * @param {import('puppeteer').Page} page - 페이지 객체
     * @returns {Promise<'none'|'auto'|'checkbox'>} CF 타입
     */
    async checkCloudflare(page) {
        try {
            const title = await page.title();
            log.debug(`페이지 제목: "${title}"`);

            // CF 페이지 아님
            if (!title.includes('Just a moment') &&
                !title.includes('Checking your browser') &&
                !title.includes('Attention Required')) {
                return 'none';
            }

            log.info(`🔒 CF 페이지 감지: "${title}"`);

            // CF 페이지 감지됨 - 체크박스 있는지 확인 (잠시 대기 후)
            await sleep(2000);

            const hasCheckbox = await page.evaluate(() => {
                // iframe 체크
                const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
                if (iframe) return true;

                // 체크박스 텍스트 체크
                const body = document.body?.innerText || '';
                if (body.includes('Verify you are human') ||
                    body.includes('완료하여 사람임을 확인') ||
                    body.includes('I am human')) {
                    return true;
                }
                return false;
            });

            const cfType = hasCheckbox ? 'checkbox' : 'auto';
            log.info(`CF 타입: ${cfType} (체크박스: ${hasCheckbox})`);
            return cfType;
        } catch (error) {
            log.warn(`CF 체크 오류: ${error.message}`);
            return 'none';
        }
    },

    /**
     * 클라우드플레어 통과 대기 (개선됨)
     * @param {import('puppeteer').Page} page - 페이지 객체
     * @returns {Promise<boolean>} 통과 여부
     */
    async waitForCloudflare(page) {
        const cfType = await this.checkCloudflare(page);

        if (cfType === 'none') {
            return true; // CF 아님, 바로 통과
        }

        this._updateUI(`🔒 CF ${cfType} 처리 중...`);
        log.info(`⚠️ 클라우드플레어 감지됨: ${cfType}`);

        // 1. 자동 통과 시도 (모든 CF 페이지에서 먼저 시도)
        log.info('🔄 자동 통과 대기 중 (15~20초)...');
        this._updateUI('🔄 CF 자동 대기 중...');
        await this.wait(15000, 20000);

        // 통과 확인
        let stillCf = await this.checkCloudflare(page);
        if (stillCf === 'none') {
            log.info('✅ 클라우드플레어 자동 통과!');
            log.cfPass('auto'); // 타임라인 이벤트
            this._updateUI('✅ CF 통과!');
            return true;
        }

        // 2. 자동 통과 실패 → 체크박스 클릭 시도
        if (cfType === 'checkbox' || stillCf === 'checkbox') {
            log.info('🎯 자동 통과 실패 - 체크박스 클릭 시도...');
            this._updateUI('🎯 CF 체크박스 클릭...');

            // 설정에서 좌표 읽기 (기본값: 253, 289)
            const cfConfig = CONFIG.CLOUDFLARE || {};
            const x = cfConfig.CHECKBOX_X || 253;
            const y = cfConfig.CHECKBOX_Y || 289;

            await this.wait(2000, 3000); // 페이지 안정화 대기
            await this.clickAt(page, x, y);

            log.info('⏳ 체크박스 검증 대기 (10~15초)...');
            this._updateUI('⏳ CF 검증 대기...');
            await this.wait(10000, 15000); // 검증 대기

            // 통과 확인
            stillCf = await this.checkCloudflare(page);
            if (stillCf === 'none') {
                log.info('✅ 클라우드플레어 체크박스 통과!');
                log.cfPass('checkbox'); // 타임라인 이벤트
                this._updateUI('✅ CF 통과!');
                return true;
            }
        }

        log.warn('❌ 클라우드플레어 통과 실패 - 수동 개입 필요');
        log.cfFail(); // 타임라인 이벤트
        this._updateUI('❌ CF 통과 실패');
        return false;
    },

    /**
     * 페이지 이동 + CF 대기
     * @param {import('puppeteer').Page} page - 페이지 객체
     * @param {string} url - 이동할 URL
     */
    async goto(page, url) {
        log.info(`📍 이동: ${url}`);
        this._updateUI(`📍 이동 중...`);

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (error) {
            log.warn(`페이지 이동 경고: ${error.message}`);
        }

        await this.wait(2000, 4000); // 페이지 로드 대기

        // CF 체크 및 대기
        const passed = await this.waitForCloudflare(page);
        if (!passed) {
            log.warn('CF 통과 실패 - 작업 계속 시도');
        }
    },

    /**
     * 랜덤 페이지 방문 (사람처럼 보이기)
     * @param {import('puppeteer').Page} page - 페이지 객체
     */
    async visitRandomPage(page) {
        try {
            // 현재 URL에서 도메인 추출
            const currentUrl = page.url();
            const match = currentUrl.match(/(https?:\/\/[^/]+)/);
            if (!match) return;

            const domain = match[1];
            const pages = CONFIG.IDLE_BROWSING?.PAGES || ['/toki_free', '/humor'];
            const randomPage = pages[randomInt(0, pages.length - 1)];
            const visitUrl = `${domain}${randomPage}`;

            log.info(`🔀 랜덤 페이지 방문: ${randomPage}`);
            this._updateUI(`🔀 둘러보기: ${randomPage}`);

            await this.goto(page, visitUrl);

            // 체류 시간
            const stayTime = CONFIG.IDLE_BROWSING?.STAY_TIME || { MIN: 10000, MAX: 30000 };
            const stayMs = randomInt(stayTime.MIN, stayTime.MAX);
            log.info(`📖 체류 중: ${(stayMs / 1000).toFixed(0)}초`);
            this._updateUI(`📖 체류 중 (${(stayMs / 1000).toFixed(0)}초)...`);
            await sleep(stayMs);

            // 스크롤 (사람처럼)
            const scrollAmount = randomInt(-200, 300);
            await page.mouse.wheel({ deltaY: scrollAmount });

            log.info('✅ 랜덤 페이지 방문 완료');

        } catch (error) {
            log.warn(`랜덤 페이지 방문 실패: ${error.message}`);
        }
    },
};

export default Human;
export { Human, randomInt, sleep };
