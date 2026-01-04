/**
 * MineGame.js
 * 광산 채굴 모듈 (단순화 버전)
 * 
 * 역할: 광산 이동 → 채굴 → 결과 반환
 * Scheduler가 호출하며, 시간 관리는 Scheduler가 담당
 */

import { CONFIG } from '../config/config.js';
import { createLogger } from '../utils/logger.js';
import Human, { sleep } from '../utils/Human.js';

const log = createLogger('Mine');

/**
 * 셀렉터
 */
const SELECTORS = {
    // 광산 목록
    LIST_ITEM: 'li.list-item',
    MINE_LINK: '.wr-subject a.item-subject',

    // 광산 상세
    MINE_BUTTON: 'button.raid_mining#btn_submit',
    BAGGER288: '#wr_player_mining_tool_6',

    // 결과
    RESULT_MESSAGE: '#bo_vc .media-content',
};

/**
 * 광산 채굴 클래스
 */
export class MineGame {
    /**
     * @param {import('../core/BrowserEngine.js').BrowserEngine} browserEngine
     */
    constructor(browserEngine) {
        this.browserEngine = browserEngine;
        this.page = null;

        // alert 처리
        this.lastAlertMessage = null;
        this.alertHandlerRegistered = false;

        // 채굴 전 마지막 댓글 ID (결과 확인용)
        this.lastCommentId = null;
    }

    /**
     * 초기화
     */
    async init() {
        this.page = this.browserEngine.getPage();
        if (!this.page) {
            throw new Error('브라우저가 실행되지 않았습니다.');
        }

        this._registerAlertHandler();
        log.info('광산 채굴 모듈 초기화 완료');
    }

    /**
     * alert 핸들러 등록
     * @private
     */
    _registerAlertHandler() {
        if (this.alertHandlerRegistered) return;

        this.page.on('dialog', async (dialog) => {
            this.lastAlertMessage = dialog.message();
            log.warn(`경고창: ${this.lastAlertMessage}`);

            // 사람처럼 1~3초 후 확인
            await Human.wait(1000, 3000);
            try {
                await dialog.accept();
            } catch (e) {
                // 이미 처리됨
            }
        });

        this.alertHandlerRegistered = true;
    }

    /**
     * 채굴 수행 (메인 함수)
     * @returns {Promise<{success: boolean, reward: number}>}
     */
    async mine() {
        try {
            // 1. 살아있는 광산으로 이동
            const mineFound = await this._goToAliveMine();
            if (!mineFound) {
                log.warn('살아있는 광산 없음');
                return { success: false, reward: 0 };
            }

            // 2. 장비 선택 (배거288)
            await Human.click(this.page, SELECTORS.BAGGER288);
            await Human.wait(300, 600);

            // 3. 채굴 전 댓글 ID 저장
            await this._saveLastCommentId();

            // 4. 채굴 버튼 클릭
            this.lastAlertMessage = null;
            const clicked = await Human.click(this.page, SELECTORS.MINE_BUTTON);
            if (!clicked) {
                log.error('채굴 버튼 클릭 실패');
                return { success: false, reward: 0 };
            }

            // 5. alert 대기 (3~5초)
            await Human.wait(3000, 5000);

            // 6. alert로 실패 확인
            if (this.lastAlertMessage) {
                const msg = this.lastAlertMessage;
                if (msg.includes('끝난') || msg.includes('폐광') || msg.includes('종료')) {
                    log.warn(`광산 종료됨: ${msg}`);
                    return { success: false, reward: 0 };
                }
                log.warn(`채굴 실패: ${msg}`);
                return { success: false, reward: 0 };
            }

            // 7. 결과 확인
            const result = await this._parseResult();
            return result;

        } catch (error) {
            log.error(`채굴 오류: ${error.message}`);
            return { success: false, reward: 0 };
        }
    }

    /**
     * 살아있는 광산으로 이동
     * @private
     */
    async _goToAliveMine() {
        // 1. 광산 목록 페이지로 이동
        const currentUrl = this.page.url();
        const match = currentUrl.match(/(https?:\/\/newtoki\d+\.com)/);
        if (!match) {
            log.error('뉴토끼 도메인을 찾을 수 없음');
            return false;
        }

        const domain = match[1];
        const listUrl = `${domain}/mine`;

        await Human.goto(this.page, listUrl);

        // 2. 살아있는 광산 찾기
        const mines = await this.page.$$eval(SELECTORS.LIST_ITEM, (items) => {
            return items.map(item => {
                const linkEl = item.querySelector('.wr-subject a.item-subject');
                const url = linkEl?.getAttribute('href') || '';
                const name = linkEl?.textContent.trim().split('\n')[0].trim() || '';

                // 종료일 없으면 = 살아있음
                const dateEls = item.querySelectorAll('.wr-date');
                const endDate = dateEls.length >= 2 ? dateEls[1].textContent.trim() : '';
                const isAlive = endDate.length === 0;

                return { url, name, isAlive };
            });
        });

        const aliveMine = mines.find(m => m.isAlive);
        if (!aliveMine) {
            log.warn('살아있는 광산 없음');
            return false;
        }

        log.info(`광산 발견: ${aliveMine.name}`);

        // 3. 광산 상세 페이지로 이동
        await Human.goto(this.page, aliveMine.url);

        // 4. 채굴 버튼 대기
        try {
            await this.page.waitForSelector(SELECTORS.MINE_BUTTON, {
                visible: true,
                timeout: 10000,
            });
        } catch (e) {
            log.error('채굴 버튼을 찾을 수 없음');
            return false;
        }

        return true;
    }

    /**
     * 채굴 전 마지막 댓글 ID 저장
     * @private
     */
    async _saveLastCommentId() {
        try {
            this.lastCommentId = await this.page.$eval(
                '#bo_vc .media[id^="c_"]',
                el => el.id
            );
        } catch (e) {
            this.lastCommentId = null;
        }
    }

    /**
     * 채굴 결과 파싱
     * @private
     */
    async _parseResult() {
        // 새 댓글 대기 (최대 5초)
        for (let i = 0; i < 10; i++) {
            await sleep(500);

            const currentId = await this.page.$eval(
                '#bo_vc .media[id^="c_"]',
                el => el.id
            ).catch(() => null);

            if (currentId && currentId !== this.lastCommentId) {
                break;
            }
        }

        // 최근 댓글에서 결과 확인
        const messages = await this.page.$$eval(
            SELECTORS.RESULT_MESSAGE,
            els => els.map(el => el.textContent.trim())
        ).catch(() => []);

        if (messages.length > 0) {
            const lastResult = messages[0];

            // "채굴 성공 (채굴 보상 : 1266)"
            const successMatch = lastResult.match(/채굴 성공.*채굴 보상.*:\s*([\d,]+)/);
            if (successMatch) {
                const gross = parseInt(successMatch[1].replace(/,/g, ''), 10);
                const net = gross - 1000; // 배거288 사용료
                log.info(`채굴 성공! 순이익: ${net} MP`);
                return { success: true, reward: net };
            }

            // "채굴 실패 (실패 보상 : 163)"
            const failMatch = lastResult.match(/채굴 실패.*실패 보상.*:\s*([\d,]+)/);
            if (failMatch) {
                const refund = parseInt(failMatch[1].replace(/,/g, ''), 10);
                const loss = 1000 - refund;
                log.warn(`채굴 실패! 손해: -${loss} MP`);
                return { success: false, reward: -loss };
            }
        }

        // 결과 파싱 실패해도 alert 없었으면 성공으로 간주
        log.info('채굴 완료 (보상 확인 불가)');
        return { success: true, reward: 0 };
    }
}

export default MineGame;
