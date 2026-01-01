/**
 * test-browser.js
 * 브라우저 엔진 테스트 스크립트
 * 
 * 사용법: node index.js
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';

async function main() {
    const engine = new BrowserEngine();

    try {
        // 1. 브라우저 실행
        await engine.launch();

        // 2. 테스트 페이지 이동 (봇 감지 테스트 사이트)
        await engine.goto('https://bot.sannysoft.com/');

        // 3. 잠시 대기 (결과 확인용)
        console.log('\n🔍 봇 감지 테스트 결과를 확인하세요...');
        console.log('   (브라우저 창에서 모든 항목이 초록색이면 성공!)');
        console.log('\n⏳ 10초 후 자동 종료됩니다...');

        await new Promise(resolve => setTimeout(resolve, 10000));

        // 4. 스크린샷 저장
        await engine.screenshot('test-result.png');

    } catch (error) {
        console.error('❌ 에러 발생:', error.message);
    } finally {
        // 5. 브라우저 종료
        await engine.close();
    }
}

main();
