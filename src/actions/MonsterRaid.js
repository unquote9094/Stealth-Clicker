/**
 * MonsterRaid.js
 * 몬스터 레이드 모듈 (단순화 버전)
 * 
 * 역할: 레이드 이동 → 공격 → 결과 반환
 * Scheduler가 호출하며, 시간 관리는 Scheduler가 담당
 */

import { CONFIG } from '../config/config.js';
import { createLogger } from '../utils/logger.js';
import Human, { sleep } from '../utils/Human.js';

const log = createLogger('Raid');

/**
 * 셀렉터
 */
const SELECTORS = {
    // 레이드 목록
    LIST_ITEM: 'li.list-item',
    RAID_LINK: '.wr-subject a.item-subject',

    // 레이드 상세
    ATTACK_BUTTON: 'button.comment-submit.raid_attack',
    ATTACK_TYPE: 'input[name="wr_player_attack"]',
};

/**
 * 몬스터 레이드 클래스
 */
export class MonsterRaid {
    /**
     * @param {import('../core/BrowserEngine.js').BrowserEngine} browserEngine
     */
    constructor(browserEngine) {
        this.browserEngine = browserEngine;
        this.page = null;

        // alert 처리
        this.lastAlertMessage = null;
        this.lastDialog = null;
        this.alertHandlerRegistered = false;
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
        log.info('몬스터 레이드 모듈 초기화 완료');
    }

    /**
     * alert 핸들러 등록
     * @private
     */
    _registerAlertHandler() {
        if (this.alertHandlerRegistered) return;

        this.page.on('dialog', async (dialog) => {
            this.lastAlertMessage = dialog.message();
            this.lastDialog = dialog;
            log.warn(`경고창: ${this.lastAlertMessage.substring(0, 60)}...`);
        });

        this.alertHandlerRegistered = true;
    }

    /**
     * dialog 확인 클릭
     * @private
     */
    async _acceptDialog() {
        if (this.lastDialog) {
            try {
                await Human.wait(2000, 3000);
                await this.lastDialog.accept();
                this.lastDialog = null;
            } catch (e) {
                // 이미 처리됨
            }
        }
    }

    /**
     * 레이드 공격 수행 (메인 함수)
     * @returns {Promise<{success: boolean, reward: number}>}
     */
    async attack() {
        try {
            // 1. 살아있는 레이드로 이동
            const raidFound = await this._goToAliveRaid();
            if (!raidFound) {
                log.warn('살아있는 레이드 없음');
                return { success: false, reward: 0 };
            }

            // 2. 캡차 확인 (이미 공격한 레이드)
            const hasCaptcha = await this.page.$('img[src*="captcha"]');
            if (hasCaptcha) {
                log.warn('캡차 감지 - 이미 공격한 레이드');
                return { success: false, reward: 0 };
            }

            // 3. 공격 타입 랜덤 선택
            const attackTypeId = Math.floor(Math.random() * 6) + 1;
            const typeSelector = `#wr_player_attack_${attackTypeId}`;
            await Human.click(this.page, typeSelector).catch(() => { });
            await Human.wait(300, 600);

            // 4. 공격 버튼 클릭
            this.lastAlertMessage = null;
            const clicked = await Human.click(this.page, SELECTORS.ATTACK_BUTTON);
            if (!clicked) {
                log.error('공격 버튼 클릭 실패');
                return { success: false, reward: 0 };
            }

            // 5. alert 대기 (최대 10초)
            for (let i = 0; i < 20 && !this.lastAlertMessage; i++) {
                await sleep(500);
            }

            if (!this.lastAlertMessage) {
                log.warn('경고창 없음');
                return { success: false, reward: 0 };
            }

            // 6. alert 확인
            const msg = this.lastAlertMessage;
            await this._acceptDialog();

            // 레이드 종료 체크
            if (msg.includes('처치') || msg.includes('죽') || msg.includes('종료')) {
                log.warn(`레이드 종료됨`);
                return { success: false, reward: 0 };
            }

            // 공격 실패 체크
            if (!msg.includes('피해를') && !msg.includes('빼앗')) {
                log.warn(`알 수 없는 응답: ${msg.substring(0, 40)}`);
                return { success: false, reward: 0 };
            }

            // 7. 댓글에서 보상 파싱
            await Human.wait(2000, 3000);
            const reward = await this._parseReward();

            log.info(`레이드 공격 완료! ${reward >= 0 ? '+' : ''}${reward} XP`);
            return { success: true, reward };

        } catch (error) {
            log.error(`레이드 오류: ${error.message}`);
            return { success: false, reward: 0 };
        }
    }

    /**
     * 살아있는 레이드로 이동
     * @private
     */
    async _goToAliveRaid() {
        // 1. 레이드 목록 페이지로 이동
        const currentUrl = this.page.url();
        const match = currentUrl.match(/(https?:\/\/newtoki\d+\.com)/);
        if (!match) {
            log.error('뉴토끼 도메인을 찾을 수 없음');
            return false;
        }

        const domain = match[1];
        const listUrl = `${domain}/monster`;

        await Human.goto(this.page, listUrl);

        // 2. 살아있는 레이드 찾기
        const raids = await this.page.$$eval(SELECTORS.LIST_ITEM, (items) => {
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

        const aliveRaid = raids.find(r => r.isAlive);
        if (!aliveRaid) {
            log.warn('살아있는 레이드 없음');
            return false;
        }

        log.info(`레이드 발견: ${aliveRaid.name}`);

        // 3. 레이드 상세 페이지로 이동
        await Human.goto(this.page, aliveRaid.url);

        // 4. 공격 버튼 대기
        try {
            await this.page.waitForSelector(SELECTORS.ATTACK_BUTTON, {
                visible: true,
                timeout: 5000,
            });
        } catch (e) {
            log.error('공격 버튼을 찾을 수 없음');
            return false;
        }

        return true;
    }

    /**
     * 댓글에서 보상 파싱
     * @private
     */
    async _parseReward() {
        try {
            const nickname = CONFIG.AUTH?.NICKNAME || '';

            const comments = await this.page.$$eval(
                '#bo_vc .media',
                (els) => els.slice(0, 5).map(el => {
                    const nameEl = el.querySelector('.media-heading .member, .media-heading a');
                    const name = nameEl?.textContent.trim().split('\n')[0].trim() || '';
                    const timeEl = el.querySelector('.media-heading .pull-right, .media-heading small');
                    const timeText = timeEl?.textContent.trim() || '';
                    const contentEl = el.querySelector('.media-content');
                    const content = contentEl?.textContent.trim() || '';
                    return { name, timeText, content };
                })
            );

            // 30초 이내 내 댓글 찾기
            for (const comment of comments) {
                if (!comment.name.includes(nickname)) continue;

                // 시간 체크
                const secMatch = comment.timeText.match(/(\d+)초전/);
                if (secMatch && parseInt(secMatch[1], 10) > 30) continue;
                if (comment.timeText.includes('분전') || comment.timeText.includes('시간전')) continue;

                // "N포인트를 흡수"
                const absorbMatch = comment.content.match(/(\d+)포인트를 흡수/);
                if (absorbMatch) {
                    return parseInt(absorbMatch[1], 10);
                }

                // "N포인트를 빼앗"
                const lossMatch = comment.content.match(/(\d+)포인트를 빼/);
                if (lossMatch) {
                    return -parseInt(lossMatch[1], 10);
                }

                // 첫 공격 무료
                return 10;
            }

            // 기본값
            return 10;
        } catch (error) {
            log.warn(`보상 파싱 실패: ${error.message}`);
            return 10;
        }
    }
}

export default MonsterRaid;
