/**
 * IdleBehavior.js
 * 대기 시간 동안 사람처럼 행동하는 모듈
 * 
 * 기능:
 * - 마우스 랜덤 이동
 * - 페이지 스크롤
 * - 랜덤 페이지 방문 (웹툰, 커뮤니티 등)
 */

import { createLogger } from '../utils/logger.js';
import { randomInt, sleep } from '../utils/randomizer.js';
import { CONFIG } from '../config/config.js';

const log = createLogger('Idle');

/**
 * 대기 중 행동 클래스
 */
export class IdleBehavior {
    /**
     * @param {import('puppeteer').Page} page - Puppeteer 페이지
     * @param {import('./HumanMouse.js').HumanMouse} mouse - 마우스 객체
     */
    constructor(page, mouse) {
        this.page = page;
        this.mouse = mouse;
        this.isActive = false;
        this.visitCount = 0;  // 현재 대기 중 방문 횟수
        this.originalUrl = null;  // 원래 페이지 URL (복귀용)
    }

    /**
     * 대기 시간 동안 랜덤 행동 수행
     * @param {number} durationMs - 대기 시간 (밀리초)
     * @param {Object} options - 옵션
     * @param {Function} options.onTick - 매 초마다 콜백 (남은 시간 전달)
     * @returns {Promise<void>}
     */
    async idle(durationMs, options = {}) {
        const { onTick } = options;
        const endTime = Date.now() + durationMs;
        this.isActive = true;
        this.visitCount = 0;  // 초기화
        this.originalUrl = this.page.url();  // 원래 URL 저장

        log.debug(`대기 시작: ${Math.floor(durationMs / 1000)}초`);

        while (Date.now() < endTime && this.isActive) {
            const remaining = endTime - Date.now();

            // 남은 시간 콜백
            if (onTick) {
                onTick(remaining);
            }

            // 10~30초마다 랜덤 행동
            const actionInterval = randomInt(10000, 30000);
            const waitTime = Math.min(actionInterval, remaining);

            if (waitTime > 5000) {
                // 랜덤 행동 선택
                // 50% 마우스, 25% 스크롤, 15% 페이지 방문, 10% 대기
                const action = randomInt(1, 100);

                if (action <= 50) {
                    // 50% 확률: 마우스 이동
                    await this._randomMouseMove();
                } else if (action <= 75) {
                    // 25% 확률: 스크롤
                    await this._randomScroll();
                } else if (action <= 90) {
                    // 15% 확률: 랜덤 페이지 방문
                    await this._visitRandomPage();
                }
                // 10% 확률: 아무것도 안 함 (휴식)
            }

            // 대기 (1초 단위로 체크)
            const sleepTime = Math.min(waitTime, 1000);
            await sleep(sleepTime);
        }

        this.isActive = false;
        log.debug('대기 종료');
    }

    /**
     * 마우스 랜덤 이동
     * @private
     */
    async _randomMouseMove() {
        try {
            // 화면 내 랜덤 좌표
            const viewport = await this.page.viewport();
            const x = randomInt(100, (viewport?.width || 1200) - 100);
            const y = randomInt(100, (viewport?.height || 800) - 100);

            await this.mouse.cursor.moveTo({ x, y });
            log.debug(`마우스 이동: (${x}, ${y})`);
        } catch (error) {
            // 에러 무시 (대기 중 행동이라 중요하지 않음)
        }
    }

    /**
     * 랜덤 스크롤
     * @private
     */
    async _randomScroll() {
        try {
            const amount = randomInt(-300, 300);
            await this.mouse.scroll(amount);
            log.debug(`스크롤: ${amount}px`);
        } catch (error) {
            // 에러 무시
        }
    }

    /**
     * 랜덤 페이지 방문
     * 웹툰, 커뮤니티 등 페이지를 방문했다가 원래 페이지로 돌아옴
     * @private
     */
    async _visitRandomPage() {
        try {
            const config = CONFIG.IDLE_BROWSING;

            // 기능 OFF면 스킵
            if (!config.ENABLED) {
                return;
            }

            // 최대 방문 횟수 초과면 스킵
            if (this.visitCount >= config.MAX_VISITS) {
                log.debug('최대 방문 횟수 도달, 스킵');
                return;
            }

            // 확률 체크
            const chance = randomInt(1, 100);
            if (chance > config.VISIT_CHANCE) {
                log.debug('방문 확률 미달, 스킵');
                return;
            }

            // 현재 URL에서 도메인 추출
            const currentUrl = this.page.url();
            const match = currentUrl.match(/(https?:\/\/[^/]+)/);
            if (!match) {
                return;
            }
            const domain = match[1];

            // 원래 URL 저장 (아직 저장 안 됐으면)
            if (!this.originalUrl) {
                this.originalUrl = currentUrl;
            }

            // 랜덤 페이지 선택
            const pages = config.PAGES;
            const randomPage = pages[randomInt(0, pages.length - 1)];
            const visitUrl = `${domain}${randomPage}`;

            log.info(`🔀 랜덤 페이지 방문: ${randomPage}`);

            // 페이지 이동
            await this.page.goto(visitUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            this.visitCount++;

            // 체류 시간 (3~10초)
            const stayTime = randomInt(config.STAY_TIME.MIN, config.STAY_TIME.MAX);
            log.debug(`페이지 체류: ${(stayTime / 1000).toFixed(1)}초`);

            // 체류하면서 스크롤
            await sleep(stayTime / 2);
            await this._randomScroll();
            await sleep(stayTime / 2);

            // 원래 페이지로 복귀
            log.info(`↩️ 원래 페이지 복귀: ${this.originalUrl.substring(0, 50)}...`);
            await this.page.goto(this.originalUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            await sleep(randomInt(1000, 2000));

        } catch (error) {
            log.warn(`페이지 방문 실패 (무시): ${error.message}`);
            // 에러 시 원래 페이지로 복귀 시도
            if (this.originalUrl) {
                try {
                    await this.page.goto(this.originalUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
                } catch (e) {
                    // 복귀도 실패하면 그냥 무시
                }
            }
        }
    }

    /**
     * 대기 중지
     */
    stop() {
        this.isActive = false;
    }
}

export default IdleBehavior;

