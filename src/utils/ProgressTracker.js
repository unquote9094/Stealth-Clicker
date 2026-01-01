/**
 * ProgressTracker.js
 * 진행 상황 추적기 - 탐색/다운로드 기록
 * 
 * 로그와 별도로 진행 상황을 JSON 파일로 저장
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { CONFIG } from '../config/config.js';

const log = createLogger('Progress');

// 기본 진행 상황 구조
const DEFAULT_PROGRESS = {
    // 마지막 탐색 위치
    lastScannedPostId: 0,

    // 오늘 다운로드 수
    todayDownloads: 0,
    todayDate: null,

    // 총 통계
    totalDownloads: 0,
    totalMiningPoints: 0,
    totalMiningCount: 0,

    // 마지막 업데이트 시간
    lastUpdated: null,
};

// 별도 다운로드 기록 파일 구조
// downloads_history.json: [{postId, filename, date, size}, ...]

/**
 * 진행 추적기 클래스
 */
export class ProgressTracker {
    constructor() {
        this.progressPath = path.resolve(CONFIG.PATHS.PROGRESS);
        this.historyPath = path.resolve('./data/downloads_history.json');
        this.progress = null;
    }

    /**
     * 진행 상황 로드
     * @returns {Object} 진행 상황 객체
     */
    load() {
        const dir = path.dirname(this.progressPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (fs.existsSync(this.progressPath)) {
            try {
                this.progress = JSON.parse(fs.readFileSync(this.progressPath, 'utf8'));
                log.info(`진행 상황 로드: 게시물 #${this.progress.lastScannedPostId}까지 탐색됨`);
            } catch (error) {
                log.error(`진행 상황 파싱 오류: ${error.message}`);
                this.progress = { ...DEFAULT_PROGRESS };
            }
        } else {
            this.progress = { ...DEFAULT_PROGRESS };
            log.info('새 진행 상황 시작');
        }

        // 날짜 체크 (새 날이면 오늘 다운로드 수 리셋)
        const today = new Date().toISOString().split('T')[0];
        if (this.progress.todayDate !== today) {
            this.progress.todayDownloads = 0;
            this.progress.todayDate = today;
        }

        return this.progress;
    }

    /**
     * 진행 상황 저장
     */
    save() {
        this.progress.lastUpdated = new Date().toISOString();
        fs.writeFileSync(this.progressPath, JSON.stringify(this.progress, null, 2));
        log.debug('진행 상황 저장됨');
    }

    /**
     * 마지막 탐색 게시물 ID 업데이트
     * @param {number} postId - 게시물 ID
     */
    updateLastScanned(postId) {
        this.progress.lastScannedPostId = postId;
        this.save();
    }

    /**
     * 다운로드 기록 추가
     * @param {Object} record - {postId, filename, size}
     */
    recordDownload(record) {
        // 통계 업데이트
        this.progress.todayDownloads++;
        this.progress.totalDownloads++;
        this.save();

        // 히스토리 파일에 추가
        const historyEntry = {
            postId: record.postId,
            filename: record.filename,
            size: record.size || 'unknown',
            date: new Date().toISOString(),
        };

        let history = [];
        if (fs.existsSync(this.historyPath)) {
            try {
                history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
            } catch (e) {
                history = [];
            }
        }

        history.push(historyEntry);
        fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));

        log.info(`다운로드 기록: #${record.postId} - ${record.filename}`);
    }

    /**
     * 채굴 기록 추가
     * @param {number} points - 획득 포인트
     */
    recordMining(points) {
        this.progress.totalMiningPoints += points;
        this.progress.totalMiningCount++;
        this.save();

        log.info(`채굴 기록: +${points} MP (총 ${this.progress.totalMiningPoints} MP)`);
    }

    /**
     * 오늘 다운로드 제한 확인
     * @returns {boolean} 제한 초과 여부
     */
    isDownloadLimitReached() {
        return this.progress.todayDownloads >= CONFIG.SCHEDULE.DAILY_DOWNLOAD_LIMIT;
    }

    /**
     * 현재 상태 요약
     * @returns {Object}
     */
    getSummary() {
        return {
            lastScanned: this.progress.lastScannedPostId,
            todayDownloads: `${this.progress.todayDownloads}/${CONFIG.SCHEDULE.DAILY_DOWNLOAD_LIMIT}`,
            totalDownloads: this.progress.totalDownloads,
            totalMP: this.progress.totalMiningPoints,
        };
    }

    /**
     * 게시물이 이미 다운로드 되었는지 확인
     * @param {number} postId - 게시물 ID
     * @returns {boolean}
     */
    isAlreadyDownloaded(postId) {
        if (!fs.existsSync(this.historyPath)) return false;

        try {
            const history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
            return history.some(entry => entry.postId === postId);
        } catch (e) {
            return false;
        }
    }
}

// 싱글톤 인스턴스
export const progressTracker = new ProgressTracker();
export default ProgressTracker;
