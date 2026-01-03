/**
 * auto-run.js
 * 통합 자동화 스크립트 (광산 + 레이드)
 * 
 * 사용법: node auto-run.js
 * 
 * 키보드 단축키:
 *   s - 현재 페이지 저장 (HTML + 스크린샷)
 *   q - 종료
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import { Orchestrator } from './src/core/Orchestrator.js';
import { CONFIG } from './src/config/config.js';
import Logger from './src/utils/logger.js';
import fs from 'fs';
import readline from 'readline';

// 전역 변수 (키 입력에서 접근용)
let globalEngine = null;

async function main() {
    // 터미널 UI 사용 시 Logger 콘솔 출력 끄기 (시작 전에!)
    if (CONFIG.DEBUG.TERMINAL_UI) {
        Logger.setConsoleOutput(false);
    }

    const engine = new BrowserEngine();
    globalEngine = engine;  // 키 입력에서 접근 가능하게
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

/**
 * 현재 페이지 저장 (HTML + 스크린샷)
 */
async function saveCurrentPage() {
    if (!globalEngine || !globalEngine.page) {
        console.log('⚠️ 브라우저가 실행 중이 아닙니다.');
        return;
    }

    try {
        const page = globalEngine.page;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const title = await page.title();
        const url = page.url();

        // data 폴더 생성
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }

        // HTML 저장
        const htmlPath = `./data/page_${timestamp}.html`;
        const content = await page.content();
        fs.writeFileSync(htmlPath, content, 'utf8');

        // 스크린샷 저장
        const screenshotPath = `./data/page_${timestamp}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });

        console.log(`\n📸 페이지 저장 완료!`);
        console.log(`   제목: ${title}`);
        console.log(`   URL: ${url}`);
        console.log(`   HTML: ${htmlPath}`);
        console.log(`   스크린샷: ${screenshotPath}\n`);
    } catch (error) {
        console.log(`⚠️ 페이지 저장 실패: ${error.message}`);
    }
}

// 키 입력 리스너 설정
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on('keypress', async (str, key) => {
    // Ctrl+C 처리
    if (key.ctrl && key.name === 'c') {
        console.log('\n\n👋 종료 중...');
        process.exit(0);
    }

    // 's' 키: 페이지 저장
    if (key.name === 's') {
        await saveCurrentPage();
    }

    // 'q' 키: 종료
    if (key.name === 'q') {
        console.log('\n\n👋 종료 중...');
        process.exit(0);
    }
});

// Ctrl+C 처리 (fallback)
process.on('SIGINT', async () => {
    console.log('\n\n👋 종료 중...');
    process.exit(0);
});

main();

