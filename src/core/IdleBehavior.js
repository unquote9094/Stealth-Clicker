/**
 * IdleBehavior.js
 * 대기 시간 동안 사람처럼 행동하는 모듈
 * 
 * 기능:
 * - 마우스 랜덤 이동
 * - 페이지 스크롤
 * - (향후) 다른 페이지 방문
 */

import { createLogger } from '../utils/logger.js';
import { randomInt, sleep } from '../utils/randomizer.js';

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
                const action = randomInt(1, 10);

                if (action <= 6) {
                    // 60% 확률: 마우스 이동
                    await this._randomMouseMove();
                } else if (action <= 9) {
                    // 30% 확률: 스크롤
                    await this._randomScroll();
                }
                // 10% 확률: 아무것도 안 함
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
     * 대기 중지
     */
    stop() {
        this.isActive = false;
    }
}

export default IdleBehavior;
