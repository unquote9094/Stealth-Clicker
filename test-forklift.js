/**
 * test-forklift.js
 * 포크레인(40초 쿨다운)으로 동작 테스트
 * 
 * 사용법: node test-forklift.js
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import { MineGame } from './src/actions/MineGame.js';

async function testForklift() {
    const engine = new BrowserEngine();
    let mineGame = null;

    try {
        console.log('🧪 포크레인 테스트 (40초 쿨다운)\n');

        // 1. 브라우저 실행
        await engine.launch();

        // 2. 쿠키 복원
        const cookiesLoaded = await engine.loadCookies();
        if (!cookiesLoaded) {
            console.log('⚠️ 쿠키 없음 - 먼저 mine-test.js로 로그인하세요');
            await engine.close();
            return;
        }

        // 3. 뉴토끼 접속
        console.log('📌 뉴토끼 접속 중...');
        await engine.goto('https://newtoki469.com');

        // 4. MineGame 초기화
        mineGame = new MineGame(engine);
        await mineGame.init();

        // 5. 포크레인으로 장비 변경!
        mineGame.setTool('FORKLIFT');
        console.log('🚜 장비: 포크레인 (40초 쿨다운)');

        // 6. 살아있는 광산 자동 이동
        console.log('🔍 살아있는 광산 검색 중...');
        const success = await mineGame.autoNavigateToAliveMine();

        if (!success) {
            console.log('❌ 살아있는 광산을 찾을 수 없습니다.');
            await engine.close();
            return;
        }

        // 7. 3회 채굴 테스트
        console.log('\n⛏️ 3회 채굴 테스트 시작!\n');
        console.log('━'.repeat(50));

        await mineGame.startMiningLoop({
            maxCount: 3, // 3회만 테스트
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

        console.log('\n✅ 테스트 완료!');

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
testForklift();
