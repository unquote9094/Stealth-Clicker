/**
 * BrowserEngine.js
 * Puppeteer + Stealth 기반 브라우저 엔진
 * 
 * 봇 감지를 우회하기 위한 스텔스 설정 적용
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { CONFIG } from '../config/config.js';

// 스텔스 플러그인 적용
puppeteer.use(StealthPlugin());

// 로거 생성
const log = createLogger('Browser');

/**
 * 브라우저 설정 옵션
 * @typedef {Object} BrowserOptions
 * @property {boolean} headless - 헤드리스 모드 (기본: false, 디버깅용)
 * @property {number} width - 뷰포트 너비
 * @property {number} height - 뷰포트 높이
 * @property {string} userAgent - 커스텀 User-Agent
 */

/**
 * 브라우저 엔진 클래스
 */
export class BrowserEngine {
    constructor() {
        /** @type {import('puppeteer').Browser | null} */
        this.browser = null;
        /** @type {import('puppeteer').Page | null} */
        this.page = null;
    }

    /**
     * 브라우저 실행
     * @param {Partial<BrowserOptions>} options - 브라우저 옵션
     * @returns {Promise<import('puppeteer').Page>} 페이지 객체
     */
    async launch(options = {}) {
        // 랜덤 뷰포트 생성 (1920x1080 고정 방지)
        const viewport = this._randomViewport();

        // 랜덤 User-Agent 생성
        const userAgent = new UserAgent({ deviceCategory: 'desktop' });
        this.currentUserAgent = userAgent.toString();

        const defaultOptions = {
            headless: CONFIG.DEBUG.HEADLESS,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--disable-dev-shm-usage',
                `--window-size=${viewport.width},${viewport.height}`,
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            defaultViewport: null,
        };

        log.info('브라우저 실행 중...');
        this.browser = await puppeteer.launch({ ...defaultOptions, ...options });

        // 첫 번째 페이지 가져오기
        const pages = await this.browser.pages();
        this.page = pages[0] || await this.browser.newPage();

        // 뷰포트 설정
        await this.page.setViewport({
            width: viewport.width,
            height: viewport.height,
        });

        // User-Agent 설정 (랜덤)
        await this.page.setUserAgent(this.currentUserAgent);

        log.info(`뷰포트: ${viewport.width}x${viewport.height}`);
        log.debug(`User-Agent: ${this.currentUserAgent}`);
        log.info('브라우저 준비 완료');

        return this.page;
    }

    /**
     * 쿠키 저장
     * @returns {Promise<void>}
     */
    async saveCookies() {
        if (!this.page) return;

        const cookies = await this.page.cookies();
        const cookiePath = path.resolve(CONFIG.PATHS.COOKIES);
        const dir = path.dirname(cookiePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
        log.info(`쿠키 저장 완료: ${cookiePath}`);
    }

    /**
     * 쿠키 복원
     * @returns {Promise<boolean>} 성공 여부
     */
    async loadCookies() {
        if (!this.page) return false;

        const cookiePath = path.resolve(CONFIG.PATHS.COOKIES);

        if (!fs.existsSync(cookiePath)) {
            log.warn('저장된 쿠키 없음');
            return false;
        }

        try {
            const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
            await this.page.setCookie(...cookies);
            log.info('쿠키 복원 완료');
            return true;
        } catch (error) {
            log.error(`쿠키 복원 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * URL 이동
     * @param {string} url - 이동할 URL
     * @param {Object} options - 이동 옵션
     * @returns {Promise<void>}
     */
    async goto(url, options = {}) {
        if (!this.page) {
            throw new Error('브라우저가 실행되지 않았습니다. launch()를 먼저 호출하세요.');
        }

        const defaultOptions = {
            waitUntil: 'networkidle2',
            timeout: 30000,
        };

        log.info(`이동 중: ${url}`);
        await this.page.goto(url, { ...defaultOptions, ...options });

        // 사람처럼: 페이지 로드 후 2~5초 랜덤 대기
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(r => setTimeout(r, delay));

        log.info(`페이지 로드 완료 (${(delay / 1000).toFixed(1)}초 대기)`);
    }

    /**
     * 스크린샷 저장
     * @param {string} filename - 파일명
     * @returns {Promise<void>}
     */
    async screenshot(filename = 'screenshot.png') {
        if (!this.page) return;
        await this.page.screenshot({ path: filename, fullPage: true });
        log.info(`스크린샷 저장: ${filename}`);
    }

    /**
     * 현재 페이지 HTML 저장
     * @param {string} filename - 파일명
     * @returns {Promise<void>}
     */
    async saveHtml(filename = 'page.html') {
        if (!this.page) return;
        const html = await this.page.content();
        fs.writeFileSync(filename, html, 'utf8');
        log.info(`HTML 저장: ${filename}`);
    }

    /**
     * 로그인 수행
     * @returns {Promise<boolean>} 성공 여부
     */
    async login() {
        const { ID, PW } = CONFIG.AUTH;

        if (!ID || !PW) {
            log.warn('로그인 정보 없음 (.env 파일에 NEWTOKI_ID, NEWTOKI_PW 설정 필요)');
            return false;
        }

        try {
            const loginUrl = `${CONFIG.SITE.BASE_URL}/bbs/login.php`;
            log.info('로그인 페이지 이동...');
            await this.goto(loginUrl);

            // 셀렉터 (2026-01-02 분석)
            const SELECTORS = {
                ID: '#login_id',
                PW: '#login_pw',
                CAPTCHA: '#captcha_key',
                SUBMIT: 'button.btn-color',
            };

            // 캡차 존재 확인
            const hasCaptcha = await this.page.$(SELECTORS.CAPTCHA);
            if (hasCaptcha) {
                log.warn('⚠️ 로그인 페이지에 캡차(CAPTCHA)가 있습니다!');
                log.warn('👉 브라우저에서 직접 로그인해주세요. (30초 대기)');

                // 30초 동안 수동 로그인 대기
                for (let i = 30; i > 0; i--) {
                    // 이미 로그인 되었는지 확인
                    const currentUrl = this.page.url();
                    if (!currentUrl.includes('login')) {
                        log.info('✅ 로그인 감지됨!');
                        await this.saveCookies();
                        return true;
                    }

                    if (i % 10 === 0) {
                        log.info(`⏳ 수동 로그인 대기 중... ${i}초`);
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }

                log.error('❌ 수동 로그인 시간 초과');
                return false;
            }

            // 캡차 없으면 자동 로그인 시도
            await this.page.waitForSelector(SELECTORS.ID, { timeout: 5000 });
            await this.page.type(SELECTORS.ID, ID, { delay: 50 });
            await this.page.type(SELECTORS.PW, PW, { delay: 50 });
            await this.page.click(SELECTORS.SUBMIT);

            // 페이지 이동 대기
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

            // 로그인 성공 확인
            const logoutBtn = await this.page.$('a[href*="logout"]');
            if (logoutBtn) {
                log.info('✅ 로그인 성공!');
                await this.saveCookies();
                return true;
            } else {
                log.error('❌ 로그인 실패 (ID/PW 확인)');
                return false;
            }
        } catch (error) {
            log.error(`로그인 에러: ${error.message}`);
            return false;
        }
    }


    /**
     * 로그인 상태 확인 및 필요시 로그인
     * @returns {Promise<boolean>} 로그인 상태
     */
    async ensureLoggedIn() {
        // 현재 페이지에서 로그인 상태 확인
        const logoutBtn = await this.page.$('a[href*="logout"]');

        if (logoutBtn) {
            log.info('이미 로그인 상태');
            return true;
        }

        log.info('로그인 필요 - 로그인 시도...');
        return await this.login();
    }

    /**
     * 브라우저 종료
     * @returns {Promise<void>}
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            log.info('브라우저 종료');
        }
    }

    /**
     * 현재 페이지 가져오기
     * @returns {import('puppeteer').Page | null}
     */
    getPage() {
        return this.page;
    }

    /**
     * 뷰포트 크기 반환 (CONFIG에서 고정값 사용)
     * @private
     * @returns {{width: number, height: number}}
     */
    _randomViewport() {
        // CONFIG에서 고정 크기 읽기 (기본값: 1360x1542)
        return {
            width: CONFIG.BROWSER?.WIDTH || 1360,
            height: CONFIG.BROWSER?.HEIGHT || 1542,
        };
    }
}

// 싱글톤 인스턴스 export (편의용)
export const browserEngine = new BrowserEngine();
export default BrowserEngine;
