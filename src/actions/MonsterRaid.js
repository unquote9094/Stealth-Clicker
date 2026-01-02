/**
 * MonsterRaid.js
 * 뉴토끼 몬스터 레이드 자동화 모듈
 * 
 * 기능:
 * - 레이드 시간 확인 (XX:10, XX:40)
 * - 살아있는 레이드 찾기
 * - 첫 공격 1회만 수행 (캡차 우회)
 * - 10포인트 무료 획득
 */

import { createLogger } from '../utils/logger.js';
import { sleep, randomInt } from '../utils/randomizer.js';
import { CONFIG } from '../config/config.js';
import HumanMouse from '../core/HumanMouse.js';
import IdleBehavior from '../core/IdleBehavior.js';

const log = createLogger('Raid');

/**
 * 레이드 설정
 */
const RAID_CONFIG = {
    URLS: {
        LIST: '/monster',
    },

    SELECTORS: {
        // 레이드 목록
        LIST_CONTAINER: 'ul.list-body',
        LIST_ITEM: 'li.list-item',
        RAID_LINK: '.wr-subject a.item-subject',

        // 레이드 상세 (2026-01-02 HTML 분석 완료)
        ATTACK_BUTTON: 'button.comment-submit.raid_attack',
        ATTACK_TYPE_RADIO: 'input[name="wr_player_attack"]',
        ATTACK_FORM: '#fviewcomment',
    },

    // 레이드 시간 (분)
    RAID_MINUTES: [10, 40],
    RAID_DURATION: 10, // 약 10분간 지속
};

/**
 * 몬스터 레이드 클래스
 */
export class MonsterRaid {
    /**
     * @param {import('../core/BrowserEngine.js').BrowserEngine} browserEngine - 브라우저 엔진
     */
    constructor(browserEngine) {
        this.browserEngine = browserEngine;
        this.page = null;
        this.mouse = null;
        this.idleBehavior = null;
        this.attackCount = 0;

        // alert 처리용 변수
        this.lastAlertMessage = null;
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

        // HumanMouse 초기화 (자연스러운 마우스 이동)
        this.mouse = new HumanMouse(this.page);
        await this.mouse.init();

        // 대기 중 행동 모듈 초기화
        this.idleBehavior = new IdleBehavior(this.page, this.mouse);

        // alert(경고창) 핸들러 등록
        this._registerAlertHandler();

        log.info('몬스터 레이드 모듈 초기화 완료');
    }

    /**
     * alert 핸들러 등록
     * 브라우저에서 뜨는 경고창을 자동으로 처리하고 내용을 저장
     * @private
     */
    _registerAlertHandler() {
        if (this.alertHandlerRegistered) return;

        this.page.on('dialog', async (dialog) => {
            const message = dialog.message();
            this.lastAlertMessage = message;
            log.warn(`경고창 감지: ${message}`);

            // 사람처럼 1~3초 대기 후 확인 클릭 (봇 감지 방지)
            const delay = randomInt(1000, 3000);
            await sleep(delay);

            // 경고창 자동 확인 (이미 다른 핸들러가 처리했으면 무시)
            try {
                await dialog.accept();
            } catch (e) {
                // 이미 처리된 dialog는 무시 (MineGame과 충돌 방지)
                log.debug('Dialog 이미 처리됨 (무시)');
            }
        });

        this.alertHandlerRegistered = true;
        log.debug('Alert 핸들러 등록 완료');
    }

    /**
     * 현재 레이드 시간인지 확인
     * @returns {boolean}
     */
    isRaidTime() {
        const now = new Date();
        const minutes = now.getMinutes();

        // 10분 ~ 20분, 40분 ~ 50분
        for (const startMin of RAID_CONFIG.RAID_MINUTES) {
            const endMin = startMin + RAID_CONFIG.RAID_DURATION;
            if (minutes >= startMin && minutes < endMin) {
                return true;
            }
        }
        return false;
    }

    /**
     * 다음 레이드까지 남은 시간 (밀리초)
     * @returns {number}
     */
    getTimeUntilNextRaid() {
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        let nextRaidMin;
        if (minutes < 10) {
            nextRaidMin = 10;
        } else if (minutes < 40) {
            nextRaidMin = 40;
        } else {
            nextRaidMin = 70; // 다음 시간 10분 = 현재 + 70 - minutes
        }

        const waitMinutes = nextRaidMin - minutes;
        const waitSeconds = 60 - seconds;

        return (waitMinutes * 60 + waitSeconds) * 1000;
    }

    /**
     * 레이드 목록 페이지로 이동
     * @returns {Promise<boolean>}
     */
    async navigateToRaidList() {
        try {
            const currentUrl = this.page.url();
            const match = currentUrl.match(/(https?:\/\/newtoki\d+\.com)/);

            if (!match) {
                log.error('뉴토끼 도메인을 찾을 수 없습니다.');
                return false;
            }

            const domain = match[1];
            const listUrl = `${domain}${RAID_CONFIG.URLS.LIST}`;

            log.info(`레이드 목록 페이지 이동: ${listUrl}`);
            await this.browserEngine.goto(listUrl);

            await sleep(randomInt(2000, 3000));
            return true;
        } catch (error) {
            log.error(`레이드 목록 이동 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 살아있는 레이드 찾기
     * @returns {Promise<{url: string, name: string} | null>}
     */
    async findActiveRaid() {
        try {
            const raids = await this.page.$$eval(RAID_CONFIG.SELECTORS.LIST_ITEM, (items) => {
                return items.map(item => {
                    const linkEl = item.querySelector('.wr-subject a.item-subject');
                    const url = linkEl?.getAttribute('href') || '';
                    const name = linkEl?.textContent.trim().split('\n')[0].trim() || '';

                    // javascript: 로 시작하면 비활성
                    const isActive = url && !url.startsWith('javascript:');

                    return { url, name, isActive };
                }).filter(r => r.isActive);
            });

            if (raids.length === 0) {
                log.warn('살아있는 레이드가 없습니다.');
                return null;
            }

            const raid = raids[0];
            log.info(`살아있는 레이드 발견: ${raid.name}`);
            return raid;
        } catch (error) {
            log.error(`레이드 검색 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * 레이드 공격 1회 (첫 공격만 - 캡차 우회)
     * @returns {Promise<{success: boolean, reward: number}>}
     */
    async attackOnce() {
        try {
            // 1. 레이드 목록으로 이동
            const listLoaded = await this.navigateToRaidList();
            if (!listLoaded) {
                return { success: false, reward: 0 };
            }

            // 2. 살아있는 레이드 찾기
            const raid = await this.findActiveRaid();
            if (!raid) {
                return { success: false, reward: 0 };
            }

            // 3. 레이드 상세 페이지로 이동
            log.info(`레이드 이동: ${raid.name}`);
            await this.browserEngine.goto(raid.url);
            await sleep(randomInt(2000, 3000));

            // alert 초기화
            this.lastAlertMessage = null;

            // 4. 공격 버튼 대기 (화면에 나올 때까지)
            try {
                await this.page.waitForSelector(RAID_CONFIG.SELECTORS.ATTACK_BUTTON, {
                    visible: true,
                    timeout: 5000
                });
            } catch (e) {
                log.error('공격 버튼을 찾을 수 없습니다.');
                return { success: false, reward: 0 };
            }

            // 5. 공격 버튼 스크롤 (화면에 보이게)
            const attackButton = await this.page.$(RAID_CONFIG.SELECTORS.ATTACK_BUTTON);
            if (!attackButton) {
                log.error('공격 버튼을 찾을 수 없습니다.');
                return { success: false, reward: 0 };
            }
            await attackButton.scrollIntoView();
            await sleep(randomInt(1000, 2000)); // 스크롤 후 대기

            // 6. 공격 타입 랜덤 선택 (1~6: 근접/원거리/불/물/바람/땅)
            // 공격 타입은 포인트와 무관, 그냥 랜덤 선택
            const attackTypeId = randomInt(1, 6); // 1~6 (수정: 7 → 6)
            const attackTypeSelector = `#wr_player_attack_${attackTypeId}`;

            // HumanMouse로 공격 타입 선택 (실패해도 기본값이 선택되어 있으므로 무시)
            const attackTypeClicked = await this.mouse.click(attackTypeSelector);
            if (attackTypeClicked) {
                await sleep(randomInt(300, 600));
            }

            // 7. 공격 버튼 클릭 (HumanMouse 사용)
            await sleep(randomInt(200, 500));
            const clicked = await this.mouse.click(RAID_CONFIG.SELECTORS.ATTACK_BUTTON);

            if (!clicked) {
                log.error('공격 버튼 클릭 실패');
                return { success: false, reward: 0 };
            }

            await sleep(1500); // 서버 응답 대기

            // alert 메시지 확인
            if (this.lastAlertMessage) {
                const msg = this.lastAlertMessage;

                // "피해를 주었습니다" = 성공!
                if (msg.includes('피해를 주었습니다')) {
                    this.attackCount++;
                    log.info(`레이드 공격 성공! ${msg}`);
                    // 댓글에서 실제 포인트 파싱
                    const reward = await this._parseRewardFromComment();
                    return { success: true, reward };
                }

                // 레이드 종료 메시지 → 다음 레이드 필요
                if (msg.includes('처치') || msg.includes('죽') || msg.includes('끝') || msg.includes('종료')) {
                    log.warn(`레이드 종료됨: ${msg}`);
                    this.raidEnded = true; // 레이드 종료 플래그
                    return { success: false, reward: 0 };
                }

                // 그 외 메시지는 실패
                log.warn(`공격 실패: ${msg}`);
                return { success: false, reward: 0 };
            }

            // alert 없이도 성공으로 간주
            this.attackCount++;
            log.info(`레이드 공격 성공! (총 ${this.attackCount}회)`);

            // 댓글에서 실제 포인트 파싱 시도
            const reward = await this._parseRewardFromComment();
            return { success: true, reward };

        } catch (error) {
            log.error(`레이드 공격 실패: ${error.message}`);
            return { success: false, reward: 0 };
        }
    }

    /**
     * 댓글에서 내 닉네임의 최신 포인트 파싱
     * 형식: "N포인트를 흡수하였습니다" 또는 "N포인트를 빼앗겼습니다" (반격)
     * @private
     * @returns {Promise<number>}
     */
    async _parseRewardFromComment() {
        try {
            const nickname = CONFIG.AUTH.NICKNAME;

            // 댓글 목록에서 내 닉네임 찾기 (최신 3개만 확인)
            const comments = await this.page.$$eval(
                '#bo_vc .media',
                (els, nick) => {
                    return els.slice(0, 10).map(el => {
                        const nameEl = el.querySelector('.media-heading');
                        const contentEl = el.querySelector('.media-content');
                        return {
                            name: nameEl?.textContent.trim() || '',
                            content: contentEl?.textContent.trim() || ''
                        };
                    }).filter(c => c.name.includes(nick));
                },
                nickname
            );

            if (comments.length === 0) {
                log.debug('내 댓글을 찾을 수 없음');
                return 10; // 기본값
            }

            // 가장 최신 내 댓글
            const myComment = comments[0].content;
            log.debug(`내 댓글: ${myComment.substring(0, 50)}`);

            // "N포인트를 흡수하였습니다" 파싱
            const absorbMatch = myComment.match(/(\d+)포인트를 흡수/);
            if (absorbMatch) {
                const reward = parseInt(absorbMatch[1], 10);
                log.info(`포인트 흡수: ${reward} MP`);
                this.totalReward += reward;
                return reward;
            }

            // "N포인트를 빼앗겼습니다" (반격당함 - 손실)
            const lossMatch = myComment.match(/(\d+)포인트를 빼/);
            if (lossMatch) {
                const loss = parseInt(lossMatch[1], 10);
                log.warn(`포인트 손실: -${loss} MP (반격당함)`);
                this.totalReward -= loss;
                return -loss;
            }

            return 10; // 기본값
        } catch (error) {
            log.debug(`포인트 파싱 실패: ${error.message}`);
            return 10; // 기본값
        }
    }

    /**
     * 레이드 시간에만 공격 (자동 확인)
     * @returns {Promise<{success: boolean, reward: number}>}
     */
    async attackIfRaidTime() {
        if (!this.isRaidTime()) {
            const waitMs = this.getTimeUntilNextRaid();
            const waitMin = Math.floor(waitMs / 60000);
            log.info(`레이드 시간 아님. 다음 레이드까지 ${waitMin}분`);
            return { success: false, reward: 0 };
        }

        return await this.attackOnce();
    }

    /**
     * 현재 상태 반환
     */
    getStatus() {
        return {
            attackCount: this.attackCount,
            isRaidTime: this.isRaidTime(),
            timeUntilNextRaid: this.getTimeUntilNextRaid(),
        };
    }
}

export default MonsterRaid;
