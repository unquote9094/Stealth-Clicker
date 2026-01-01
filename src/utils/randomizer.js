/**
 * randomizer.js
 * 랜덤 값 생성 유틸리티
 * 
 * 봇 감지 우회를 위한 랜덤화 함수들
 */

import { CONFIG, getRandomDelay, addJitter } from '../config/config.js';

/**
 * 지정된 범위 내 랜덤 정수 반환
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number}
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 지정된 범위 내 랜덤 실수 반환
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number}
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 클릭 좌표 랜덤화 (정중앙 금지)
 * @param {Object} boundingBox - 요소의 boundingBox
 * @returns {{x: number, y: number}} 랜덤 좌표
 */
export function randomClickPosition(boundingBox) {
    const { x, y, width, height } = boundingBox;

    // 중앙 기준 ±10px 랜덤 오프셋
    const offsetX = randomInt(CONFIG.MOUSE.CLICK_OFFSET.MIN, CONFIG.MOUSE.CLICK_OFFSET.MAX);
    const offsetY = randomInt(CONFIG.MOUSE.CLICK_OFFSET.MIN, CONFIG.MOUSE.CLICK_OFFSET.MAX);

    // 중앙 좌표 + 오프셋
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return {
        x: centerX + offsetX,
        y: centerY + offsetY,
    };
}

/**
 * 클릭 전 랜덤 딜레이 (100~500ms)
 * @returns {Promise<void>}
 */
export async function randomClickDelay() {
    const delay = getRandomDelay(CONFIG.TIMING.CLICK_DELAY);
    await sleep(delay);
}

/**
 * 페이지 로드 후 랜덤 딜레이 (2~4초)
 * @returns {Promise<void>}
 */
export async function randomPageLoadDelay() {
    const delay = getRandomDelay(CONFIG.TIMING.PAGE_LOAD_DELAY);
    await sleep(delay);
}

/**
 * 다운로드 간격 랜덤 딜레이 (30~60초)
 * @returns {Promise<void>}
 */
export async function randomDownloadDelay() {
    const delay = getRandomDelay(CONFIG.TIMING.DOWNLOAD_DELAY);
    await sleep(delay);
}

/**
 * Jitter가 적용된 대기
 * @param {number} baseMs - 기본 대기 시간 (밀리초)
 * @param {number} jitterPercent - 변동 퍼센트 (기본 15%)
 * @returns {Promise<void>}
 */
export async function sleepWithJitter(baseMs, jitterPercent = 15) {
    const delay = addJitter(baseMs, jitterPercent);
    await sleep(delay);
}

/**
 * 기본 sleep 함수
 * @param {number} ms - 대기 시간 (밀리초)
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 휴식이 필요한지 확인 + 휴식 수행
 * @param {number} lastRestTime - 마지막 휴식 시간 (timestamp)
 * @returns {Promise<number>} 새로운 마지막 휴식 시간
 */
export async function checkAndRest(lastRestTime) {
    const now = Date.now();
    const elapsed = now - lastRestTime;

    // 휴식 간격이 지났으면 휴식
    if (elapsed >= CONFIG.TIMING.REST_INTERVAL) {
        const restDuration = getRandomDelay(CONFIG.TIMING.REST_DURATION);
        console.log(`☕ 휴식 중... (${Math.round(restDuration / 1000)}초)`);
        await sleep(restDuration);
        return now;
    }

    return lastRestTime;
}

/**
 * 현재 시간이 운영 시간 내인지 확인
 * @returns {boolean}
 */
export function isActiveHours() {
    const hour = new Date().getHours();
    const { START, END } = CONFIG.SCHEDULE.ACTIVE_HOURS;

    // END가 24면 자정까지
    if (END === 24) {
        return hour >= START;
    }

    return hour >= START && hour < END;
}

export default {
    randomInt,
    randomFloat,
    randomClickPosition,
    randomClickDelay,
    randomPageLoadDelay,
    randomDownloadDelay,
    sleepWithJitter,
    sleep,
    checkAndRest,
    isActiveHours,
};
