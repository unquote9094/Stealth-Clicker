/**
 * auto-run.js
 * 통합 자동화 스크립트 (광산 + 레이드)
 * 
 * 사용법: node auto-run.js
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import { Orchestrator } from './src/core/Orchestrator.js';
import { CONFIG } from './src/config/config.js';
import Logger from './src/utils/logger.js';

async function main() {
    // 터미널 UI 사용 시 Logger 콘솔 출력 끄기 (시작 전에!)
    if (CONFIG.DEBUG.TERMINAL_UI) {
        Logger.setConsoleOutput(false);
    }

    const engine = new BrowserEngine();
    let orchestrator = null;

    try {
        // 터미널 UI 모드 아닐 때만 메시지 출력
        if (!CONFIG.DEBUG.TERMINAL_UI) {
            console.log('🚀 통합 자동화 시작...\n');
        }

        // 1. 브라우저 실행
        await engine.launch();

        // 2. 쿠키 복원 또는 자동 로그인
        const cookiesLoaded = await engine.loadCookies();

        // 3. 뉴토끼 접속
        if (!CONFIG.DEBUG.TERMINAL_UI) {
            console.log('📌 뉴토끼 접속 중...');
        }
        await engine.goto(CONFIG.SITE.BASE_URL);

        // 4. 로그인 확인 (쿠키 없거나 만료시 자동 로그인)
        const loggedIn = await engine.ensureLoggedIn();
        if (!loggedIn) {
            console.log('❌ 로그인 실패 - .env 파일에 NEWTOKI_ID, NEWTOKI_PW 설정 필요');
            await engine.close();
            return;
        }

        // 4. Orchestrator 초기화
        orchestrator = new Orchestrator(engine);
        await orchestrator.init();

        // 5. 메인 루프 시작 (UI 모드 아닐 때만 메시지)
        if (!CONFIG.DEBUG.TERMINAL_UI) {
            console.log('\n⛏️ 자동화 시작! (Ctrl+C로 종료)\n');
            console.log('━'.repeat(50));
        }

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
