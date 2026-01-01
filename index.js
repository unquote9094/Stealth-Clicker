/**
 * test-browser.js
 * 브라우저 엔진 테스트 스크립트
 * 
 * 사용법: node index.js
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import readline from 'readline';

let engine = null;

async function main() {
    engine = new BrowserEngine();

    try {
        // 1. 브라우저 실행
        await engine.launch();

        // 2. 테스트 페이지 이동 (봇 감지 테스트 사이트)
        await engine.goto('https://bot.sannysoft.com/');

        // 3. 대기 (수동으로 사이트 탐색 가능)
        console.log('\n🔍 브라우저가 열려 있습니다!');
        console.log('   직접 북토끼 사이트로 이동해서 테스트하세요.\n');
        console.log('📌 명령어:');
        console.log('   [s] + Enter = 현재 페이지 HTML 저장');
        console.log('   [p] + Enter = 스크린샷 저장');
        console.log('   [q] + Enter = 종료\n');

        // 키보드 입력 처리
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('line', async (input) => {
            const cmd = input.trim().toLowerCase();
            if (cmd === 's') {
                const filename = `page_${Date.now()}.html`;
                await engine.saveHtml(filename);
                console.log(`✅ HTML 저장됨: ${filename}`);
            } else if (cmd === 'p') {
                const filename = `screenshot_${Date.now()}.png`;
                await engine.screenshot(filename);
                console.log(`✅ 스크린샷 저장됨: ${filename}`);
            } else if (cmd === 'q') {
                console.log('👋 종료 중...');
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
    if (engine) await engine.close();
    process.exit(0);
});

main();


