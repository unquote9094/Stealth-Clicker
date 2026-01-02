/**
 * raid-test.js
 * 몬스터 레이드 테스트 스크립트
 * 
 * 사용법: node raid-test.js
 * 
 * 주의: 레이드는 XX:10, XX:40에만 가능합니다!
 */

import { BrowserEngine } from './src/core/BrowserEngine.js';
import MonsterRaid from './src/actions/MonsterRaid.js';
import { CONFIG } from './src/config/config.js';

async function testRaid() {
    const engine = new BrowserEngine();
    let raid = null;

    try {
        console.log('🚀 레이드 테스트 시작...\n');

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

        // 5. MonsterRaid 초기화
        raid = new MonsterRaid(engine);
        await raid.init();

        // 6. 레이드 시간 확인
        if (!raid.isRaidTime()) {
            const msUntilRaid = raid.getTimeUntilNextRaid();
            const minutes = Math.floor(msUntilRaid / 60000);
            const seconds = Math.floor((msUntilRaid % 60000) / 1000);
            console.log(`\n⏰ 레이드 시간이 아닙니다!`);
            console.log(`   다음 레이드까지: ${minutes}분 ${seconds}초`);
            console.log(`   (레이드는 매시 10분, 40분에 시작)`);

            // 대기할지 여부 확인
            console.log('\n🕐 레이드 시간까지 대기합니다...');
            await new Promise(resolve => setTimeout(resolve, msUntilRaid + 5000));
        }

        // 7. 레이드 공격 시도
        console.log('\n⚔️ 레이드 공격 시작!');
        const result = await raid.attackOnce();

        if (result.success) {
            console.log(`\n✅ 레이드 공격 성공! +${result.reward} MP`);
        } else {
            console.log('\n❌ 레이드 공격 실패');
        }

    } catch (error) {
        console.error('❌ 에러:', error.message);
    } finally {
        await engine.close();
    }
}

// Ctrl+C 처리
process.on('SIGINT', async () => {
    console.log('\n\n👋 종료 중...');
    process.exit(0);
});

testRaid();
