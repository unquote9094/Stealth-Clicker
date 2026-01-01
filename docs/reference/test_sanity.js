/**
 * test_sanity.js
 * 프로젝트 전체의 건전성을 검증하는 "통합 테스트 러너 (Safety Belt)"
 * finish-task 실행 시 자동으로 호출되어, 하나라도 실패하면 커밋/배포를 막습니다.
 */

// ==========================================
// 🧪 테스트 스위트 (프로젝트별 로직을 여기에 작성하세요)
// ==========================================
const checks = [
    {
        name: "0. Basic Environment Check",
        fn: async () => {
            // Node 버전이 너무 낮으면 에러
            if (process.version.startsWith('v0')) throw new Error("Node version too old");
            // 필수 폴더 체크
            // import fs from 'fs'; (ESM에서는 상단 선언이 필요하므로 여기선 생략하거나 동적 임포트)
        }
    },
    // [Example] SmartSorter Integration (Optional)
    // 이 부분은 SmartSorter 모듈이 있을 때만 실행됩니다.
    {
        name: "SmartSorter v2 Post-Number Based Test",
        fn: async () => {
            try {
                // 동적 Import
                const modulePath = '../src/utils/SmartSorter.js';
                const { SmartSorter } = await import(modulePath);

                // v2 테스트 시나리오:
                // 게시물번호와 제목 숫자가 매칭되면 → 그 숫자가 chapter
                // 매칭 안되면 → 게시물번호 = chapter (신뢰)

                let raw = [];
                // 1~30: 정상 (ID와 제목 숫자 일치)
                for (let i = 1; i <= 30; i++) raw.push({ id: i, title: `제${i}화` });

                // 31~40: 2부 시작 (ID와 제목 숫자 불일치)
                raw.push({ id: 31, title: "2부 1화 시작" }); // 2부 명시
                for (let i = 2; i <= 10; i++) raw.push({ id: 30 + i, title: `${i}화` }); // 제목은 2~10화

                // 41~50: ID와 제목 불일치 (제목은 50~41화)
                for (let i = 0; i < 10; i++) {
                    raw.push({ id: 41 + i, title: `${50 - i}화` });
                }

                console.log(`      Generating ${raw.length} episodes for v2 test...`);

                const sorter = new SmartSorter();
                const sorted = await sorter.sort(raw);

                // 검증 1: 전체 개수
                if (sorted.length !== 50) throw new Error(`Count mismatch: ${sorted.length}`);

                // 검증 2: 첫 번째가 1화여야 함 (chapter=1)
                if (!sorted[0].title.includes("1")) throw new Error(`Start mismatch: ${sorted[0].title}`);

                // 검증 3: [v2] 마지막은 chapter=50 (게시물번호 50, 제목 41화)
                // 게시물번호 기반이므로 ID 50이 마지막이어야 함
                const last = sorted[sorted.length - 1];
                if (last.id !== 50) throw new Error(`End mismatch: expected ID 50, got ${last.id}`);

                // 검증 4: 2부 승계 확인
                const ep2_2 = sorted.find(e => e.id === 32);
                if (ep2_2._sort.volume !== 2) throw new Error("Ambiguity Fix Failed (Vol 2 check)");

            } catch (e) {
                if (e.code === 'ERR_MODULE_NOT_FOUND') return;
                throw e;
            }
        }
    },
    // [v2.2] urlParser 테스트
    {
        name: "urlParser URL Validation Test",
        fn: async () => {
            try {
                const { validateUrl, parseNovelUrl, isValidBooktokiDomain, getNovelId } = await import('../src/utils/urlParser.js');

                // 유효한 URL 테스트
                const validUrls = [
                    'https://booktoki123.com/novel/12345678',
                    'https://www.booktoki456.net/novel/87654321',
                    'http://booktoki.org/12345'
                ];

                for (const url of validUrls) {
                    if (!isValidBooktokiDomain(url)) {
                        throw new Error(`Domain should be valid: ${url}`);
                    }
                }

                // 무효한 URL 테스트
                const invalidUrls = [
                    'https://google.com',
                    'https://naver.com/novel/123',
                    'not-a-url',
                    null,
                    123
                ];

                for (const url of invalidUrls) {
                    if (isValidBooktokiDomain(url)) {
                        throw new Error(`Domain should be invalid: ${url}`);
                    }
                }

                // parseNovelUrl 테스트
                const parsed = parseNovelUrl('https://booktoki123.com/novel/12345678');
                if (!parsed.isValid) throw new Error('parseNovelUrl failed');
                if (!parsed.novelId) throw new Error('novelId missing');

                // getNovelId 테스트
                const novelId = getNovelId('https://booktoki99.com/novel/99999999');
                if (!novelId) throw new Error('getNovelId failed');

            } catch (e) {
                if (e.code === 'ERR_MODULE_NOT_FOUND') return;
                throw e;
            }
        }
    },
    // [v2.2] StatsDisplay 포맷팅 테스트
    {
        name: "StatsDisplay Formatting Test",
        fn: async () => {
            try {
                const { formatTime, formatBytes } = await import('../src/utils/StatsDisplay.js');

                // formatTime 테스트
                if (formatTime(0) !== '0초') throw new Error(`formatTime(0) = ${formatTime(0)}`);
                if (formatTime(1000) !== '1초') throw new Error(`formatTime(1000) = ${formatTime(1000)}`);
                if (formatTime(60000) !== '1분 0초') throw new Error(`formatTime(60000) = ${formatTime(60000)}`);
                if (formatTime(3600000) !== '1시간 0분 0초') throw new Error(`formatTime(3600000) = ${formatTime(3600000)}`);
                if (formatTime(61000) !== '1분 1초') throw new Error(`formatTime(61000) = ${formatTime(61000)}`);

                // formatBytes 테스트
                if (formatBytes(0) !== '0B') throw new Error(`formatBytes(0) = ${formatBytes(0)}`);
                if (formatBytes(1024) !== '1.0KB') throw new Error(`formatBytes(1024) = ${formatBytes(1024)}`);
                if (formatBytes(1048576) !== '1.0MB') throw new Error(`formatBytes(1048576) = ${formatBytes(1048576)}`);

            } catch (e) {
                if (e.code === 'ERR_MODULE_NOT_FOUND') return;
                throw e;
            }
        }
    }
];

// ==========================================
// 🚀 테스트 실행기 (건드리지 마세요)
// ==========================================
(async () => {
    console.log(`\n🛡️  [Safety Belt] Running ${checks.length} checks...\n`);
    let passed = 0;
    let failed = 0;

    for (const check of checks) {
        try {
            process.stdout.write(`   👉 Checking [${check.name}] ... `);
            await check.fn();
            console.log("\x1b[32mOK\x1b[0m"); // Green OK
            passed++;
        } catch (e) {
            console.log("\x1b[31mFAIL\x1b[0m"); // Red FAIL
            console.error(`      └─ ❌ Error: ${e.message}`);
            failed++;
        }
    }

    console.log(`\n📊 Result: ${passed} Passed, ${failed} Failed.`);

    if (failed > 0) {
        console.error("\x1b[31m⛔ CRITICAL: Some tests failed. Process aborted.\x1b[0m");
        process.exit(1); // 에러 발생 -> 커밋 중단
    } else {
        console.log("\x1b[32m✅ All Systems Operational.\x1b[0m");
        process.exit(0); // 성공
    }
})();
