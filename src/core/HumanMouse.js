/**
 * HumanMouse.js
 * ghost-cursor 래퍼 - 인간 같은 마우스 동작
 * 
 * 봇 감지 우회를 위한 자연스러운 마우스 움직임
 */

import { createCursor } from 'ghost-cursor';
import { createLogger } from '../utils/logger.js';
import { randomClickPosition, randomClickDelay, sleep } from '../utils/randomizer.js';
import { CONFIG } from '../config/config.js';

const log = createLogger('Mouse');

/**
 * 인간 마우스 클래스
 */
export class HumanMouse {
    /**
     * @param {import('puppeteer').Page} page - Puppeteer 페이지 객체
     */
    constructor(page) {
        this.page = page;
        this.cursor = null;
    }

    /**
     * 커서 초기화
     */
    async init() {
        this.cursor = createCursor(this.page);
        log.info('커서 초기화 완료');
    }

    /**
     * 요소로 이동 (베지어 곡선)
     * @param {string} selector - CSS 셀렉터
     * @returns {Promise<void>}
     */
    async moveTo(selector) {
        if (!this.cursor) await this.init();

        const element = await this.page.$(selector);
        if (!element) {
            log.warn(`요소 없음: ${selector}`);
            return;
        }

        await this.cursor.move(selector);
        log.debug(`이동: ${selector}`);
    }

    /**
     * 인간처럼 클릭 (이동 + 랜덤 딜레이 + 클릭)
     * @param {string} selector - CSS 셀렉터
     * @returns {Promise<boolean>} 성공 여부
     */
    async click(selector) {
        if (!this.cursor) await this.init();

        try {
            const element = await this.page.$(selector);
            if (!element) {
                log.warn(`클릭 대상 없음: ${selector}`);
                return false;
            }

            // 클릭 전 랜덤 딜레이
            await randomClickDelay();

            // ghost-cursor로 자연스럽게 클릭
            await this.cursor.click(selector);

            // 클릭 후 짧은 딜레이
            await sleep(50 + Math.random() * 100);

            log.debug(`클릭: ${selector}`);
            return true;
        } catch (error) {
            log.error(`클릭 실패 (${selector}): ${error.message}`);
            return false;
        }
    }

    /**
     * 좌표로 직접 클릭 (랜덤 오프셋 적용)
     * @param {Object} boundingBox - {x, y, width, height}
     * @returns {Promise<boolean>}
     */
    async clickAt(boundingBox) {
        if (!this.cursor) await this.init();

        try {
            const pos = randomClickPosition(boundingBox);

            await randomClickDelay();
            await this.cursor.moveTo({ x: pos.x, y: pos.y });
            await this.page.mouse.click(pos.x, pos.y);

            log.debug(`좌표 클릭: (${Math.round(pos.x)}, ${Math.round(pos.y)})`);
            return true;
        } catch (error) {
            log.error(`좌표 클릭 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 인간처럼 타이핑 (랜덤 딜레이)
     * @param {string} selector - 입력 필드 셀렉터
     * @param {string} text - 입력할 텍스트
     * @returns {Promise<boolean>}
     */
    async type(selector, text) {
        try {
            await this.click(selector);

            // 한 글자씩 랜덤 딜레이로 타이핑
            for (const char of text) {
                await this.page.keyboard.type(char);
                await sleep(50 + Math.random() * 100); // 50~150ms
            }

            log.debug(`타이핑: ${text.substring(0, 10)}...`);
            return true;
        } catch (error) {
            log.error(`타이핑 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 스크롤 (인간처럼 부드럽게)
     * @param {number} amount - 스크롤 양 (양수: 아래, 음수: 위)
     * @returns {Promise<void>}
     */
    async scroll(amount) {
        const steps = Math.abs(Math.floor(amount / 100));
        const direction = amount > 0 ? 100 : -100;

        for (let i = 0; i < steps; i++) {
            await this.page.mouse.wheel({ deltaY: direction });
            await sleep(30 + Math.random() * 50);
        }

        log.debug(`스크롤: ${amount}px`);
    }
}

export default HumanMouse;
