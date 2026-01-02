/**
 * mine-test.js
 * 광산 채굴 테스트 스크립트
 * 
 * 사용법: node mine-test.js
 * 
 * 1. 브라우저 실행
 * 2. 수동으로 뉴토끼 로그인
 * 3. 명령어 입력:
 *    - 'a' = 자동으로 살아있는 광산 찾아서 이동 (신규!)
 *    - 'm' = 광산 목록 페이지 이동
 *    - '1' = 채굴 1회
 *    - 's' = 연속 채굴 5회
 *    - 'x' = 중지
 *    - 'q' = 종료
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import { MineGame, MINE_TOOLS } from './src/actions/MineGame.js';
import { CONFIG } from './src/config/config.js';
import readline from 'readline';

let engine = null;
let mineGame = null;

async function main() {
    engine = new BrowserEngine();

    try {
        // 1. 브라우저 실행
        await engine.launch();

        // 2. 쿠키 복원 시도
        const cookiesLoaded = await engine.loadCookies();

        // 3. 뉴토끼 메인 페이지로 이동
        console.log('\n📌 뉴토끼 사이트로 이동 중...');
        console.log('   (도메인 변경은 .env 파일에서 설정)\n');

        await engine.goto(CONFIG.SITE.BASE_URL);

        // 4. MineGame 초기화
        mineGame = new MineGame(engine);
        await mineGame.init();

        // 5. 안내 메시지
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 테스트 명령어:');
        console.log('   [l] + Enter = 로그인 상태 확인 후 쿠키 저장');
        console.log('   [a] + Enter = ⭐ 자동으로 살아있는 광산 찾아서 이동');
        console.log('   [m] + Enter = 광산 목록 페이지로 이동');
        console.log('   [1] + Enter = 채굴 1회 테스트');
        console.log('   [s] + Enter = 연속 채굴 시작 (5회)');
        console.log('   [x] + Enter = 채굴 중지');
        console.log('   [q] + Enter = 종료');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 키보드 입력 처리
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('line', async (input) => {
            const cmd = input.trim().toLowerCase();

            if (cmd === 'l') {
                // 로그인 상태에서 쿠키 저장
                await engine.saveCookies();
                console.log('✅ 쿠키 저장 완료!');

            } else if (cmd === 'a') {
                // ⭐ 신규: 자동으로 살아있는 광산 찾아서 이동
                console.log('🔍 살아있는 광산 자동 검색 중...');
                const success = await mineGame.autoNavigateToAliveMine();
                if (success) {
                    console.log('✅ 광산 이동 완료! 이제 [1] 또는 [s]로 채굴하세요.');
                } else {
                    console.log('❌ 살아있는 광산을 찾지 못했습니다.');
                }

            } else if (cmd === 'm') {
                // 광산 목록 페이지로 이동
                console.log('📌 광산 목록 페이지로 이동 중...');
                const success = await mineGame.navigateToMineList();
                if (success) {
                    console.log('✅ 광산 목록 페이지 로드 완료');

                    // 살아있는 광산 정보 출력
                    const aliveMine = await mineGame.findAliveMine();
                    if (aliveMine) {
                        console.log(`   → 살아있는 광산: ${aliveMine.name} (진행도: ${aliveMine.progress.toFixed(1)}%)`);
                        console.log('   → [a]를 입력하면 자동으로 이동합니다.');
                    }
                }

            } else if (cmd === '1') {
                // 단일 채굴 테스트
                console.log('⛏️ 채굴 1회 테스트...');
                const result = await mineGame.mineOnce();
                if (result.success) {
                    console.log(`✅ 채굴 성공! 보상: ${result.reward} MP`);
                } else {
                    console.log('❌ 채굴 실패 (대기 중이거나 오류)');
                }

            } else if (cmd === 's') {
                // 연속 채굴 시작
                console.log('⛏️ 연속 채굴 시작 (5회)...');
                console.log('   중지하려면 [x] 입력\n');

                mineGame.startMiningLoop({
                    maxCount: 5,
                    onMine: (result, count, total) => {
                        console.log(`[${count}] ${result.success ? '성공' : '실패'} - 총 ${total} MP`);
                    },
                    onWait: (ms, min, sec) => {
                        console.log(`⏳ 대기 중: ${min}분 ${sec}초`);
                    }
                });

            } else if (cmd === 'x') {
                // 채굴 중지
                mineGame.stop();
                console.log('🛑 채굴 중지됨');
                const status = mineGame.getStatus();
                console.log(`   총 ${status.mineCount}회, ${status.totalReward} MP 획득`);

            } else if (cmd === 'q') {
                console.log('👋 종료 중...');
                mineGame.stop();
                rl.close();
                await engine.close();
                process.exit(0);
            }
        });

        // 무한 대기
        await new Promise(() => { });

    } catch (error) {
        console.error('❌ 에러 발생:', error.message);
    } finally {
        await engine.close();
    }
}

// Ctrl+C 처리
process.on('SIGINT', async () => {
    console.log('\n👋 브라우저 종료 중...');
    if (mineGame) mineGame.stop();
    if (engine) await engine.close();
    process.exit(0);
});

main();
