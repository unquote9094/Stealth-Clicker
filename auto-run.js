/**
 * auto-run.js
 * 통합 자동화 스크립트 (광산 + 레이드)
 * 
 * 사용법: node auto-run.js
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import { Orchestrator } from './src/core/Orchestrator.js';

async function main() {
    const engine = new BrowserEngine();
    let orchestrator = null;

    try {
        console.log('🚀 통합 자동화 시작...\n');

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

        // 4. Orchestrator 초기화
        orchestrator = new Orchestrator(engine);
        await orchestrator.init();

        // 5. 메인 루프 시작
        console.log('\n⛏️ 자동화 시작! (Ctrl+C로 종료)\n');
        console.log('━'.repeat(50));

        await orchestrator.start({
            dailyMiningGoal: 60, // 하루 60회 목표
        });

    } catch (error) {
        console.error('❌ 에러:', error.message);
    } finally {
        if (orchestrator) orchestrator.stop();
        await engine.close();
    }
}

// Ctrl+C 처리
process.on('SIGINT', async () => {
    console.log('\n\n👋 종료 중...');
    process.exit(0);
});

main();
