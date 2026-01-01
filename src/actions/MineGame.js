/**
 * MineGame.js
 * 뉴토끼 포인트 광산 채굴 자동화 모듈
 * 
 * 기능:
 * - 살아있는 광산 자동 선택 (목록에서 폐광 아닌 것 찾기)
 * - 배거288 장비 자동 선택 (가장 효율적)
 * - 채굴 버튼 클릭
 * - 경고창(alert) 처리 (쿨타임 등)
 * - 딜레이 대기 후 반복
 */

import { createLogger } from '../utils/logger.js';
import { CONFIG, addJitter } from '../config/config.js';
import { sleep, randomInt, checkAndRest } from '../utils/randomizer.js';
import HumanMouse from '../core/HumanMouse.js';

const log = createLogger('Mine');

/**
 * 광산 채굴 설정
 */
const MINE_CONFIG = {
    // URL 패턴
    URLS: {
        BASE: 'https://newtoki', // 도메인 숫자는 변할 수 있음
        LIST: '/mine',
        DETAIL: '/mine/',
    },

    // 셀렉터
    SELECTORS: {
        // 폼
        FORM: '#fviewcomment',
        // 채굴 버튼
        MINE_BUTTON: 'button.raid_mining#btn_submit',
        // 장비 라디오 버튼
        TOOLS: {
            BARE_HANDS: '#wr_player_mining_tool_1',      // 맨손 (0MP, 20초)
            PICKAXE: '#wr_player_mining_tool_2',        // 곡괭이 (30MP, 25초)
            ROTARY_DRILL: '#wr_player_mining_tool_3',   // 로터리드릴 (50MP, 30초)
            FORKLIFT: '#wr_player_mining_tool_4',       // 포크레인 (100MP, 40초)
            DYNAMITE: '#wr_player_mining_tool_5',       // 다이너마이트 (500MP, 150초)
            BAGGER288: '#wr_player_mining_tool_6',      // 배거288 (1000MP, 300초)
        },

        // 광산 목록 페이지 셀렉터
        MINE_LIST: {
            CONTAINER: 'ul.list-body',                    // 광산 목록 컨테이너
            ITEM: 'li.list-item',                         // 각 광산 아이템
            LINK: '.wr-subject a.item-subject',           // 광산 상세 링크
            THUMB: '.wr-thumb img',                       // 광산 상태 이미지
            PROGRESS: '.wr-progress .progress-bar-exp',   // 진행도 바
            START_DATE: '.wr-date:nth-of-type(1)',        // 시작일
            END_DATE: '.wr-date:nth-of-type(2)',          // 종료일 (비어있으면 살아있음)
        },

        // 광산 상세 페이지 셀렉터
        RESULT_MESSAGE: '.media-content',
        COMMENT_COUNT: '.comment-count',                  // 댓글 수 (채굴 전후 비교용)
    },

    // 광산 이미지로 상태 구분
    MINE_STATUS: {
        ALIVE: 'mine_coal.png',      // 살아있는 광산
        CLOSED: 'mine_closed.png',   // 폐광된 광산
    },

    // 장비별 딜레이 (밀리초)
    TOOL_DELAYS: {
        BARE_HANDS: 20 * 1000,
        PICKAXE: 25 * 1000,
        ROTARY_DRILL: 30 * 1000,
        FORKLIFT: 40 * 1000,
        DYNAMITE: 150 * 1000,
        BAGGER288: 300 * 1000,
    },

    // 기본 설정: 배거288 사용 (가장 효율적)
    DEFAULT_TOOL: 'BAGGER288',
};

/**
 * 광산 채굴 게임 클래스
 */
export class MineGame {
    /**
     * @param {import('../core/BrowserEngine.js').BrowserEngine} browserEngine - 브라우저 엔진
     */
    constructor(browserEngine) {
        this.browserEngine = browserEngine;
        this.page = null;
        this.mouse = null;
        this.isRunning = false;
        this.mineCount = 0;           // 채굴 횟수
        this.totalReward = 0;         // 총 획득 포인트
        this.currentTool = MINE_CONFIG.DEFAULT_TOOL;

        // 버그 수정: alert 처리용 변수
        this.lastAlertMessage = null;
        this.alertHandlerRegistered = false;

        // 버그 수정: 채굴 전 마지막 댓글 ID 저장 (결과 확인용)
        this.lastCommentId = null;
    }

    /**
     * 초기화
     * @returns {Promise<void>}
     */
    async init() {
        this.page = this.browserEngine.getPage();
        if (!this.page) {
            throw new Error('브라우저가 실행되지 않았습니다.');
        }

        this.mouse = new HumanMouse(this.page);
        await this.mouse.init();

        // 버그 수정: alert(경고창) 핸들러 등록
        this._registerAlertHandler();

        log.info('광산 채굴 모듈 초기화 완료');
    }

    /**
     * 버그 수정: alert 핸들러 등록
     * 브라우저에서 뜨는 경고창을 자동으로 처리하고 내용을 저장
     * @private
     */
    _registerAlertHandler() {
        if (this.alertHandlerRegistered) return;

        this.page.on('dialog', async (dialog) => {
            const message = dialog.message();
            this.lastAlertMessage = message;
            log.warn(`경고창 감지: ${message}`);

            // 경고창 자동 확인
            await dialog.accept();
        });

        this.alertHandlerRegistered = true;
        log.debug('Alert 핸들러 등록 완료');
    }

    /**
     * 광산 목록 페이지로 이동
     * @returns {Promise<boolean>}
     */
    async navigateToMineList() {
        try {
            // 현재 URL에서 도메인 추출
            const currentUrl = this.page.url();
            const match = currentUrl.match(/(https?:\/\/newtoki\d+\.com)/);

            if (!match) {
                log.error('뉴토끼 도메인을 찾을 수 없습니다. 먼저 뉴토끼 사이트에 접속하세요.');
                return false;
            }

            const domain = match[1];
            const listUrl = `${domain}${MINE_CONFIG.URLS.LIST}`;

            log.info(`광산 목록 페이지 이동: ${listUrl}`);
            await this.browserEngine.goto(listUrl);

            // 페이지 로드 대기
            await sleep(randomInt(2000, 3000));

            // 목록 존재 확인
            const listContainer = await this.page.$(MINE_CONFIG.SELECTORS.MINE_LIST.CONTAINER);
            if (!listContainer) {
                log.error('광산 목록을 찾을 수 없습니다.');
                return false;
            }

            log.info('광산 목록 페이지 로드 완료');
            return true;
        } catch (error) {
            log.error(`광산 목록 이동 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 살아있는 광산 찾기 (폐광되지 않은 첫 번째 광산)
     * @returns {Promise<{url: string, name: string, progress: number} | null>}
     */
    async findAliveMine() {
        try {
            // 광산 목록에서 모든 광산 정보 추출
            const mines = await this.page.$$eval(MINE_CONFIG.SELECTORS.MINE_LIST.ITEM, (items) => {
                return items.map(item => {
                    // 링크와 이름
                    const linkEl = item.querySelector('.wr-subject a.item-subject');
                    const url = linkEl?.getAttribute('href') || '';
                    const name = linkEl?.textContent.trim().split('\n')[0].trim() || '';

                    // 상태 이미지 (coal = 살아있음, closed = 폐광)
                    const imgEl = item.querySelector('.wr-thumb img');
                    const imgSrc = imgEl?.getAttribute('src') || '';
                    const isAlive = imgSrc.includes('mine_coal');

                    // 진행도
                    const progressEl = item.querySelector('.wr-progress .progress-bar-exp');
                    const progressStyle = progressEl?.getAttribute('style') || '';
                    const progressMatch = progressStyle.match(/width:\s*([\d.]+)%/);
                    const progress = progressMatch ? parseFloat(progressMatch[1]) : 0;

                    // 종료일 (비어있으면 살아있음)
                    const dateEls = item.querySelectorAll('.wr-date');
                    const endDate = dateEls.length >= 2 ? dateEls[1].textContent.trim() : '';
                    const hasEndDate = endDate.length > 0;

                    return {
                        url,
                        name: name.replace(/채굴.*회$/, '').trim(),
                        isAlive: isAlive && !hasEndDate,
                        progress,
                        endDate
                    };
                });
            });

            // 살아있는 광산 필터링
            const aliveMines = mines.filter(m => m.isAlive);

            if (aliveMines.length === 0) {
                log.warn('살아있는 광산이 없습니다. 모두 폐광됨.');
                return null;
            }

            const firstAlive = aliveMines[0];
            log.info(`살아있는 광산 발견: ${firstAlive.name} (진행도: ${firstAlive.progress.toFixed(1)}%)`);

            return {
                url: firstAlive.url,
                name: firstAlive.name,
                progress: firstAlive.progress
            };
        } catch (error) {
            log.error(`광산 검색 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * 자동으로 살아있는 광산을 찾아서 이동
     * @returns {Promise<boolean>}
     */
    async autoNavigateToAliveMine() {
        // 1. 광산 목록 페이지로 이동
        const listLoaded = await this.navigateToMineList();
        if (!listLoaded) {
            return false;
        }

        // 2. 살아있는 광산 찾기
        const aliveMine = await this.findAliveMine();
        if (!aliveMine) {
            return false;
        }

        // 3. 광산 상세 페이지로 이동
        log.info(`광산 이동: ${aliveMine.name}`);

        // 클릭으로 이동 (더 자연스러움)
        const linkSelector = `a.item-subject[href="${aliveMine.url}"]`;
        const clicked = await this.mouse.click(linkSelector);

        if (!clicked) {
            // 클릭 실패시 직접 이동
            await this.browserEngine.goto(aliveMine.url);
        }

        // 페이지 로드 대기
        await sleep(randomInt(2000, 3000));

        // 채굴 버튼 확인
        const mineButton = await this.page.$(MINE_CONFIG.SELECTORS.MINE_BUTTON);
        if (!mineButton) {
            log.error('채굴 버튼을 찾을 수 없습니다.');
            return false;
        }

        // 버그 수정: 버튼이 화면에 보이도록 스크롤 + 첫 클릭 준비 시간
        await mineButton.scrollIntoView();
        await sleep(randomInt(1000, 2000)); // 추가 대기 (ghost-cursor 초기화 시간)

        log.info(`광산 "${aliveMine.name}" 페이지 로드 완료`);
        return true;
    }

    /**
     * 광산 페이지로 이동 (수동 URL 지정)
     * @param {string} mineUrl - 광산 URL (예: /mine/207285818)
     * @returns {Promise<boolean>}
     */
    async navigateToMine(mineUrl) {
        try {
            // 현재 URL에서 도메인 추출
            const currentUrl = this.page.url();
            const match = currentUrl.match(/(https?:\/\/newtoki\d+\.com)/);

            if (!match) {
                log.error('뉴토끼 도메인을 찾을 수 없습니다. 먼저 뉴토끼 사이트에 접속하세요.');
                return false;
            }

            const domain = match[1];
            const fullUrl = mineUrl.startsWith('http') ? mineUrl : `${domain}${mineUrl}`;

            log.info(`광산 페이지 이동: ${fullUrl}`);
            await this.browserEngine.goto(fullUrl);

            // 페이지 로드 대기
            await sleep(randomInt(2000, 3000));

            // 채굴 버튼 존재 확인
            const mineButton = await this.page.$(MINE_CONFIG.SELECTORS.MINE_BUTTON);
            if (!mineButton) {
                log.error('채굴 버튼을 찾을 수 없습니다.');
                return false;
            }

            log.info('광산 페이지 로드 완료');
            return true;
        } catch (error) {
            log.error(`광산 페이지 이동 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 장비 선택
     * @param {string} toolKey - 장비 키 (BAGGER288, DYNAMITE 등)
     * @returns {Promise<boolean>}
     */
    async selectTool(toolKey = MINE_CONFIG.DEFAULT_TOOL) {
        const selector = MINE_CONFIG.SELECTORS.TOOLS[toolKey];
        if (!selector) {
            log.error(`알 수 없는 장비: ${toolKey}`);
            return false;
        }

        try {
            // 라디오 버튼이 이미 선택되어 있는지 확인
            const isChecked = await this.page.$eval(selector, el => el.checked);
            if (isChecked) {
                log.debug(`장비 이미 선택됨: ${toolKey}`);
                return true;
            }

            // 장비 선택 클릭
            const clicked = await this.mouse.click(selector);
            if (clicked) {
                this.currentTool = toolKey;
                log.info(`장비 선택: ${toolKey}`);
                return true;
            }

            return false;
        } catch (error) {
            log.error(`장비 선택 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 버그 수정: 채굴 전 마지막 댓글 ID 저장
     * 새로운 댓글이 추가되면 ID가 달라지므로 이를 비교
     * @private
     */
    async _saveLastCommentId() {
        try {
            // 첫 번째 댓글의 ID 저장 (예: "c_207320314")
            const firstCommentId = await this.page.$eval(
                '#bo_vc .media[id^="c_"]',
                el => el.id
            ).catch(() => null);

            this.lastCommentId = firstCommentId;
            log.debug(`현재 마지막 댓글 ID: ${this.lastCommentId || '없음'}`);
        } catch (error) {
            this.lastCommentId = null;
        }
    }

    /**
     * 채굴 버튼 클릭
     * @returns {Promise<boolean>}
     */
    async clickMine() {
        try {
            // alert 메시지 초기화
            this.lastAlertMessage = null;

            // 버그 수정: 버튼이 DOM에 준비될 때까지 대기 (첫 페이지 로드 시 필요)
            try {
                await this.page.waitForSelector(MINE_CONFIG.SELECTORS.MINE_BUTTON, {
                    visible: true,
                    timeout: 5000
                });
            } catch (e) {
                log.error('채굴 버튼을 찾을 수 없습니다.');
                return false;
            }

            // 버튼 활성화 상태 확인
            const isDisabled = await this.page.$eval(
                MINE_CONFIG.SELECTORS.MINE_BUTTON,
                el => el.disabled
            );

            if (isDisabled) {
                // 남은 시간 추출 시도
                const buttonText = await this.page.$eval(
                    MINE_CONFIG.SELECTORS.MINE_BUTTON,
                    el => el.textContent
                );
                log.warn(`채굴 대기 중: ${buttonText}`);
                return false;
            }

            // 버그 수정: 채굴 전 마지막 댓글 ID 저장
            await this._saveLastCommentId();

            // 사람처럼 약간 랜덤 딜레이 후 클릭
            await sleep(randomInt(200, 500));

            // 채굴 버튼 클릭
            const clicked = await this.mouse.click(MINE_CONFIG.SELECTORS.MINE_BUTTON);

            if (clicked) {
                // 클릭 후 잠시 대기 (서버 응답 + alert 처리 시간)
                await sleep(1500);

                // 버그 수정: alert가 떴으면 실패로 처리
                if (this.lastAlertMessage) {
                    log.warn(`채굴 실패 (경고): ${this.lastAlertMessage}`);
                    return false;
                }

                this.mineCount++;
                log.info(`채굴 버튼 클릭 성공 (총 ${this.mineCount}회)`);
                return true;
            }

            return false;
        } catch (error) {
            log.error(`채굴 버튼 클릭 실패: ${error.message}`);
            return false;
        }
    }

    /**
     * 버그 수정: 채굴 성공 여부 및 보상 확인 (개선됨)
     * 
     * 문제: AJAX로 댓글이 추가되지만 DOM 읽기 시점에 아직 갱신 안 됨
     * 해결: 새 댓글 ID 등장까지 polling 대기 (최대 5초)
     * 
     * @returns {Promise<{success: boolean, reward: number}>}
     */
    async checkResult() {
        try {
            // alert가 떴으면 이미 실패 처리됨 (clickMine에서)
            // alert 없이 여기 왔으면 서버에서 처리 완료된 것

            // 새 댓글 ID 등장까지 대기 (polling, 최대 5초)
            const maxWait = 5000;
            const pollInterval = 500;
            let waited = 0;
            let newCommentFound = false;

            while (waited < maxWait) {
                await sleep(pollInterval);
                waited += pollInterval;

                // 현재 첫 번째 댓글 ID 확인
                const currentFirstId = await this.page.$eval(
                    '#bo_vc .media[id^="c_"]',
                    el => el.id
                ).catch(() => null);

                // 이전 ID와 다르면 new comment!
                if (currentFirstId && currentFirstId !== this.lastCommentId) {
                    newCommentFound = true;
                    log.debug(`새 댓글 감지: ${currentFirstId} (이전: ${this.lastCommentId})`);
                    break;
                }
            }

            if (!newCommentFound) {
                // 5초 기다렸는데도 새 댓글 없음
                // 하지만 alert도 없었으니 성공으로 간주 (첫 채굴일 수 있음)
                if (!this.lastCommentId) {
                    log.info('첫 채굴 (이전 기록 없음) - 성공으로 간주');
                    return { success: true, reward: 0 };
                }
                log.warn('새 댓글 대기 시간 초과');
            }

            // 가장 최근 댓글(첫 번째)에서 결과 확인
            const resultMessages = await this.page.$$eval(
                '#bo_vc .media-content',
                els => els.map(el => el.textContent.trim())
            );

            if (resultMessages.length > 0) {
                const lastResult = resultMessages[0];
                log.debug(`최근 채굴 기록: ${lastResult.substring(0, 60)}`);

                // "아오지에서 배거288 채굴 성공 (채굴 보상 : 1266)" 형식
                const rewardMatch = lastResult.match(/채굴.*보상.*:\s*([\d,]+)/);
                if (rewardMatch) {
                    const reward = parseInt(rewardMatch[1].replace(/,/g, ''), 10);
                    this.totalReward += reward;
                    log.info(`채굴 성공! 보상: ${reward} MP (총 ${this.totalReward} MP)`);
                    return { success: true, reward };
                }
            }

            // 결과를 못 찾아도 alert 없었으니 성공으로 간주
            log.info('채굴 완료 (보상 금액 확인 불가)');
            return { success: true, reward: 0 };
        } catch (error) {
            log.error(`결과 확인 실패: ${error.message}`);
            return { success: false, reward: 0 };
        }
    }

    /**
     * 단일 채굴 수행
     * @returns {Promise<{success: boolean, reward: number}>}
     */
    async mineOnce() {
        // 1. 장비 선택
        const toolSelected = await this.selectTool(this.currentTool);
        if (!toolSelected) {
            return { success: false, reward: 0 };
        }

        // 장비 선택 후 잠시 대기
        await sleep(randomInt(300, 600));

        // 2. 채굴 버튼 클릭
        const clicked = await this.clickMine();
        if (!clicked) {
            return { success: false, reward: 0 };
        }

        // 3. 결과 확인
        const result = await this.checkResult();
        return result;
    }

    /**
     * 다음 채굴까지 대기 시간 (밀리초)
     * 서버 쿨다운: 300초 → 최소 300초 보장 + 랜덤 추가
     * @returns {number}
     */
    getWaitTime() {
        const baseDelay = MINE_CONFIG.TOOL_DELAYS[this.currentTool]; // 300000ms (300초)
        // 300초 + 0~100초 랜덤 추가 → 300~400초 범위
        const extraDelay = randomInt(0, 100000);
        return baseDelay + extraDelay;
    }

    /**
     * 연속 채굴 실행
     * @param {Object} options - 옵션
     * @param {number} options.maxCount - 최대 채굴 횟수 (0 = 무제한)
     * @param {Function} options.onMine - 채굴 시 콜백
     * @param {Function} options.onWait - 대기 시 콜백
     * @returns {Promise<void>}
     */
    async startMiningLoop(options = {}) {
        const { maxCount = 0, onMine, onWait } = options;

        this.isRunning = true;
        this.lastRestTime = Date.now(); // 휴식 패턴용
        log.info(`=== 채굴 시작 (장비: ${this.currentTool}) ===`);

        while (this.isRunning) {
            // 최대 횟수 체크 (루프 시작 시)
            if (maxCount > 0 && this.mineCount >= maxCount) {
                log.info(`목표 채굴 횟수 도달: ${maxCount}회`);
                break;
            }

            // 휴식 패턴: 30분마다 3~7분 휴식 (봇 감지 방지)
            this.lastRestTime = await checkAndRest(this.lastRestTime);

            // 채굴 수행
            const result = await this.mineOnce();

            if (onMine) {
                onMine(result, this.mineCount, this.totalReward);
            }

            if (!this.isRunning) break;

            // 버그 수정: 목표 횟수 도달하면 대기 없이 바로 종료
            if (maxCount > 0 && this.mineCount >= maxCount) {
                break;
            }

            // 대기 시간 계산 (랜덤 jitter 적용)
            const waitTime = this.getWaitTime();
            const waitMinutes = Math.floor(waitTime / 60000);
            const waitSeconds = Math.floor((waitTime % 60000) / 1000);

            log.info(`다음 채굴까지 대기: ${waitMinutes}분 ${waitSeconds}초`);

            if (onWait) {
                onWait(waitTime, waitMinutes, waitSeconds);
            }

            // 대기 (1초 간격으로 체크하여 중단 가능하게)
            const endTime = Date.now() + waitTime;
            while (Date.now() < endTime && this.isRunning) {
                await sleep(1000);
            }
        }

        log.info(`=== 채굴 종료 (총 ${this.mineCount}회, ${this.totalReward} MP) ===`);
    }

    /**
     * 채굴 중지
     */
    stop() {
        this.isRunning = false;
        log.info('채굴 중지 요청됨');
    }

    /**
     * 현재 상태 반환
     * @returns {{isRunning: boolean, mineCount: number, totalReward: number, currentTool: string}}
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            mineCount: this.mineCount,
            totalReward: this.totalReward,
            currentTool: this.currentTool,
        };
    }

    /**
     * 장비 변경
     * @param {string} toolKey - 장비 키
     */
    setTool(toolKey) {
        if (MINE_CONFIG.TOOL_DELAYS[toolKey]) {
            this.currentTool = toolKey;
            log.info(`장비 변경: ${toolKey}`);
        } else {
            log.error(`알 수 없는 장비: ${toolKey}`);
        }
    }
}

// 장비 목록 export (외부에서 참조용)
export const MINE_TOOLS = Object.keys(MINE_CONFIG.TOOL_DELAYS);

export default MineGame;
