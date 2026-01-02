/**
 * auto-mine.js
 * 광산 채굴 완전 자동화 스크립트
 * 
 * 사용법: node auto-mine.js
 * 
 * 동작:
 * 1. 브라우저 실행 + 쿠키 로드 (로그인 유지)
 * 2. 자동으로 살아있는 광산 찾아서 이동
 * 3. 무한 채굴 루프 (Ctrl+C로 종료)
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import { MineGame } from './src/actions/MineGame.js';
import { CONFIG } from './src/config/config.js';

async function autoMine() {
    const engine = new BrowserEngine();
    let mineGame = null;

    try {
        console.log('🚀 자동 채굴 시작...\n');

        // 1. 브라우저 실행
        await engine.launch();

        // 2. 쿠키 복원 (로그인 유지)
        await engine.loadCookies();

        // 3. 뉴토끼 접속
        console.log('📌 뉴토끼 접속 중...');
        await engine.goto(CONFIG.SITE.BASE_URL);

        // 4. 로그인 확인
        const loggedIn = await engine.ensureLoggedIn();
        if (!loggedIn) {
            console.log('❌ 로그인 실패 - .env 파일 확인');
            await engine.close();
            return;
        }

        // 4. MineGame 초기화
        mineGame = new MineGame(engine);
        await mineGame.init();

        // 5. 살아있는 광산 자동 탐색 & 이동
        console.log('🔍 살아있는 광산 검색 중...');
        const success = await mineGame.autoNavigateToAliveMine();

        if (!success) {
            console.log('❌ 살아있는 광산을 찾을 수 없습니다.');
            await engine.close();
            return;
        }

        // 6. 무한 채굴 루프 시작
        console.log('\n⛏️ 무한 채굴 시작! (Ctrl+C로 종료)\n');
        console.log('━'.repeat(50));

        await mineGame.startMiningLoop({
            maxCount: 0, // 0 = 무제한
            onMine: (result, count, total) => {
                const time = new Date().toLocaleTimeString('ko-KR');
                if (result.success) {
                    console.log(`[${time}] ⛏️ 채굴 #${count} 성공! +${result.reward} MP (총 ${total} MP)`);
                } else {
                    console.log(`[${time}] ❌ 채굴 #${count} 실패`);
                }
            },
            onWait: (ms, min, sec) => {
                console.log(`[대기] ${min}분 ${sec}초 후 다음 채굴...`);
            }
        });

    } catch (error) {
        console.error('❌ 에러:', error.message);
    } finally {
        if (mineGame) mineGame.stop();
        await engine.close();
    }
}

// Ctrl+C 처리
process.on('SIGINT', async () => {
    console.log('\n\n👋 종료 중...');
    process.exit(0);
});

// 실행
autoMine();
