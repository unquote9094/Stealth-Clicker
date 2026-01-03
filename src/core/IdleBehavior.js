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
     * @param {Function} options.onStatus - 상태 변경 콜백 (UI 표시용)
     * @returns {Promise<void>}
     */
    async idle(durationMs, options = {}) {
        const { onTick, onStatus } = options;
        this.onStatus = onStatus;  // 저장해서 다른 함수에서도 사용
        const endTime = Date.now() + durationMs;
        const startTime = Date.now();
        this.isActive = true;
        this.visitCount = 0;  // 초기화
        this.originalUrl = this.page.url();  // 원래 URL 저장
        this.hasRefreshed = false;  // 새로고침 여부 (대기당 1회)

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
                // 설정에서 새로고침 시간 읽기 (기본 2분)
                const refreshAfterMs = CONFIG.IDLE_BEHAVIOR?.REFRESH_AFTER_MS || 120000;
                const elapsed = Date.now() - startTime;
                if (!this.hasRefreshed && elapsed > refreshAfterMs) {
                    await this._refreshPage();
                    this.hasRefreshed = true;
                }

                // 설정에서 행동 확률 읽기
                const chances = CONFIG.IDLE_BEHAVIOR?.CHANCES || {
                    MOUSE_MOVE: 50,
                    SCROLL: 25,
                    PAGE_VISIT: 15,
                    REST: 10,
                };

                // 랜덤 행동 선택 (누적 확률)
                const action = randomInt(1, 100);
                const c1 = chances.MOUSE_MOVE;
                const c2 = c1 + chances.SCROLL;
                const c3 = c2 + chances.PAGE_VISIT;
                // REST는 나머지

                if (action <= c1) {
                    // 마우스 이동
                    this._setStatus('🖱️ 마우스 이동');
                    await this._randomMouseMove();
                } else if (action <= c2) {
                    // 스크롤
                    this._setStatus('📜 스크롤');
                    await this._randomScroll();
                } else if (action <= c3) {
                    // 랜덤 페이지 방문
                    await this._visitRandomPage();
                } else {
                    // 휴식
                    this._setStatus('💤 휴식');
                }
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
     * 페이지 새로고침 (클라우드플레어 세션 유지용)
     * Frame 분리 에러 방지를 위해 주기적으로 새로고침
     * @private
     */
    async _refreshPage() {
        try {
            this._setStatus('🔄 새로고침 중...');
            log.info('🔄 페이지 새로고침 (세션 유지)');

            // 새로고침
            await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });

            // 클라우드플레어 체크박스 캡차 감지 및 처리
            await this._handleCloudflareChallenge();

            // 현재 URL 갱신
            this.originalUrl = this.page.url();

            this._setStatus('⏳ 대기 중');
            log.info('✅ 새로고침 완료');
        } catch (error) {
            log.warn(`새로고침 실패 (무시): ${error.message}`);
            this._setStatus('⏳ 대기 중');
        }
    }

    /**
     * 클라우드플레어 챌린지 페이지 처리
     * 전체 페이지가 클라우드플레어 페이지로 바뀌는 경우와 iframe 체크박스 모두 처리
     * @private
     */
    async _handleCloudflareChallenge() {
        try {
            // 2초 대기 (페이지 로드)
            await sleep(2000);

            // 클라우드플레어 페이지 감지 방법들
            const isCloudflare = await this._isCloudflareChallengePage();

            if (isCloudflare) {
                log.info('⚠️ 클라우드플레어 챌린지 페이지 감지!');

                // 체크박스 iframe이 있는지 확인 (5초 대기하며 확인)
                this._setStatus('🔍 체크박스 확인 중...');
                log.info('🔍 체크박스 iframe 로드 대기 중... (최대 5초)');

                let hasCheckbox = false;
                for (let i = 0; i < 5; i++) {
                    const cfIframe = await this.page.$('iframe[src*="challenges.cloudflare.com"]');
                    if (cfIframe) {
                        hasCheckbox = true;
                        log.info('✅ 체크박스 iframe 발견!');
                        break;
                    }
                    await sleep(1000);
                }

                if (!hasCheckbox) {
                    // 체크박스 없음 = 자동 통과 대기
                    log.info('📌 체크박스 없음 - 자동 통과 대기 (10초)');
                    this._setStatus('⏳ 자동 통과 대기 (10초)');
                    await sleep(10000);
                    return; // 클릭하지 않고 종료
                }

                // 체크박스가 있으면 클릭 진행
                this._setStatus('🔐 캡차 처리 중...');

                // 체크박스 클릭 시도 (여러 셀렉터)
                const checkboxSelectors = [
                    // 클라우드플레어 Turnstile iframe
                    'iframe[src*="challenges.cloudflare.com"]',
                    'iframe[title*="Cloudflare"]',
                    '#turnstile-wrapper iframe',
                    '.cf-turnstile iframe',
                    // 페이지 내 직접 체크박스
                    'input[type="checkbox"]',
                    '.ctp-checkbox-container',
                    '#challenge-stage input',
                    'label[for*="challenge"]',
                ];

                let clicked = false;
                for (const selector of checkboxSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element) {
                            // iframe인 경우
                            if (selector.includes('iframe')) {
                                const box = await element.boundingBox();
                                if (box) {
                                    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                                    log.info(`✅ 클릭 성공: ${selector} (iframe 중앙)`);
                                    clicked = true;
                                    break;
                                }
                            } else {
                                // 일반 요소
                                await element.click();
                                log.info(`✅ 클릭 성공: ${selector}`);
                                clicked = true;
                                break;
                            }
                        }
                    } catch (e) {
                        // 다음 셀렉터 시도
                    }
                }

                if (!clicked) {
                    // 셀렉터 실패 시 고정 좌표로 클릭 (체크박스 위치)
                    // 뷰포트 1360x1542 기준 체크박스 위치: 약 (270, 310)
                    const checkboxX = 270;
                    const checkboxY = 310;

                    log.info(`🎯 고정 좌표로 클릭 시도: (${checkboxX}, ${checkboxY})`);

                    // 1. 페이지 로드 충분히 대기 (3-5초)
                    this._setStatus('⏳ 캡차 로딩 대기...');
                    const loadWait = randomInt(3000, 5000);
                    log.info(`⏳ 캡차 로딩 대기... (${(loadWait / 1000).toFixed(1)}초)`);
                    await sleep(loadWait);

                    // 2. 마우스 천천히 이동 (사람처럼)
                    this._setStatus('🖱️ 마우스 이동 중...');
                    log.info('🖱️ 마우스 천천히 이동 중...');
                    await this.page.mouse.move(checkboxX, checkboxY, { steps: 30 }); // 30단계로 천천히

                    // 3. 이동 후 잠시 대기 (1-2초)
                    const hoverWait = randomInt(1000, 2000);
                    await sleep(hoverWait);

                    // 4. 클릭
                    this._setStatus('🎯 체크박스 클릭!');
                    log.info('🎯 체크박스 클릭!');
                    await this.page.mouse.click(checkboxX, checkboxY);

                    // 5. 클릭 후 대기 (2-3초)
                    await sleep(randomInt(2000, 3000));

                    log.info('✅ 고정 좌표 클릭 완료');
                    clicked = true;
                }

                // 캡차 통과 대기 (최대 30초)
                log.info('⏳ 캡차 통과 대기 중... (수동 클릭 필요할 수 있음)');
                this._setStatus('⏳ 캡차 대기 (30초)');

                for (let i = 30; i > 0; i--) {
                    // 클라우드플레어 페이지가 아니면 통과
                    const stillCf = await this._isCloudflareChallengePage();
                    if (!stillCf) {
                        log.info('✅ 캡차 통과!');
                        await sleep(2000); // 페이지 로드 대기
                        break;
                    }

                    if (i % 10 === 0) {
                        log.info(`⏳ 캡차 대기 중... ${i}초`);
                    }
                    await sleep(1000);
                }
            } else {
                // 클라우드플레어 아니면 대기 없이 바로 진행
                log.debug('클라우드플레어 아님 - 바로 진행');
            }
        } catch (error) {
            log.warn(`캡차 처리 에러 (무시): ${error.message}`);
        }
    }

    /**
     * 클라우드플레어 챌린지 페이지인지 확인
     * @private
     * @returns {Promise<boolean>}
     */
    async _isCloudflareChallengePage() {
        try {
            // 페이지 정보 확인
            const title = await this.page.title();
            const url = this.page.url();

            // 방법 1: 페이지 제목 확인
            if (title.includes('Just a moment') ||
                title.includes('Checking your browser') ||
                title.includes('Attention Required') ||
                title.includes('보안검사')) {
                log.info(`[CF감지] 제목으로 감지: "${title}"`);
                return true;
            }

            // 방법 2: URL 확인
            if (url.includes('challenge') || url.includes('cdn-cgi')) {
                log.info(`[CF감지] URL로 감지: ${url}`);
                return true;
            }

            // 방법 3: 페이지 내 클라우드플레어 요소 확인
            const cfElements = await this.page.evaluate(() => {
                const selectors = [
                    '#cf-spinner-please-wait',
                    '#cf-please-wait',
                    '.cf-browser-verification',
                    '#challenge-running',
                    '#challenge-stage',
                    'div[id*="turnstile"]',
                    'div[class*="cf-turnstile"]',
                ];
                for (const sel of selectors) {
                    if (document.querySelector(sel)) return true;
                }
                // 텍스트로도 확인
                const body = document.body?.innerText || '';
                if (body.includes('Checking your browser') ||
                    body.includes('This process is automatic') ||
                    body.includes('Verify you are human')) {
                    return true;
                }
                return false;
            });

            return cfElements;
        } catch (error) {
            return false;
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

            // 확률 체크 제거됨 - idle()에서 이미 15% 확률로 호출됨

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

            // UI 상태 표시
            this._setStatus(`🔀 ${randomPage.split('?')[0]} 방문 중...`);
            log.info(`🔀 랜덤 페이지 방문: ${randomPage}`);

            // 페이지 이동
            await this.page.goto(visitUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            this.visitCount++;

            // 클라우드플레어 캡차 처리 (페이지 이동 후)
            await this._handleCloudflareChallenge();

            // 체류 시간 (설정에서 읽기)
            const stayTime = randomInt(config.STAY_TIME.MIN, config.STAY_TIME.MAX);
            log.debug(`페이지 체류: ${(stayTime / 1000).toFixed(1)}초`);

            // 체류하면서 스크롤
            await sleep(stayTime / 2);
            await this._randomScroll();
            await sleep(stayTime / 2);

            // 원래 페이지로 복귀
            this._setStatus('↩️ 광산 복귀 중...');
            log.info(`↩️ 원래 페이지 복귀: ${this.originalUrl.substring(0, 50)}...`);
            await this.page.goto(this.originalUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

            // 복귀 후에도 클라우드플레어 처리
            await this._handleCloudflareChallenge();

            await sleep(randomInt(1000, 2000));
            this._setStatus('⏳ 대기 중');

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
     * UI 상태 표시 헬퍼
     * @private
     */
    _setStatus(status) {
        if (this.onStatus) {
            this.onStatus(status);
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

