import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ANSI 색상 코드
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

function run(command, options = {}) {
    const timeout = options.timeout || 30000;
    try {
        log(`> ${command}`, colors.yellow);
        const result = execSync(command, {
            stdio: 'pipe',
            timeout,
            encoding: 'utf8',
            env: { ...process.env, GIT_PAGER: 'cat', GH_PAGER: '', PAGER: 'cat', CI: 'true' }
        });
        if (result && result.trim()) {
            console.log(result.trim());
        }
    } catch (error) {
        if (error.killed) {
            log(`⚠️ Command timed out (${timeout / 1000}s): ${command}`, colors.yellow);
            log(`   Assuming success and continuing...`, colors.yellow);
            return;
        }
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        log(`❌ Command failed: ${command}`, colors.red);
        process.exit(1);
    }
}

/**
 * 이슈 번호 필수 확인 (차단 모드)
 */
function checkIssueNumber(commitMsg) {
    const match = commitMsg.match(/#(\d+)/);
    if (!match) {
        throw new Error(
            "❌ COMMIT BLOCKED: 이슈 번호 (#N)가 없습니다!\n" +
            "   먼저 이슈를 생성하세요: npm run start-task -- bug \"제목\""
        );
    }
    return match[1];
}

/**
 * 모듈화 태그 확인 (src 수정 시)
 */
function checkModTag(commitMsg, stagedFiles) {
    const srcJsModified = stagedFiles.some(f =>
        f.match(/^src\/.*\.js$/) || f.match(/^src\\.*\.js$/)
    );

    if (srcJsModified) {
        const hasModTag = /\[(MOD|RAW|N\/A)\]/.test(commitMsg);
        if (!hasModTag) {
            throw new Error(
                "Source code modified. 모듈화 태그 필수:\n" +
                "   [MOD]: 모듈화 완료\n" +
                "   [RAW]: 의도적으로 안 함\n" +
                "   [N/A]: 해당 없음"
            );
        }
    }
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        log('❌ Usage: npm run finish -- "commit message (#N)"', colors.red);
        log('   Example: npm run finish -- "fix: 버그 수정 (#5)"', colors.yellow);
        return;
    }

    const commitMsg = args[0];
    log('\n🚀 Starting Finish-Task...\n', colors.cyan);

    // 1. 이슈 번호 확인 (차단!)
    log('1️⃣ Checking issue number...', colors.green);
    try {
        const issueNum = checkIssueNumber(commitMsg);
        log(`   ✅ Issue #${issueNum} found.`, colors.green);
    } catch (e) {
        log(`\n${e.message}`, colors.red);
        process.exit(1);
    }

    // 2. 모듈화 태그 확인
    log('2️⃣ Checking modularization tag...', colors.green);
    try {
        execSync('git add .', { stdio: 'pipe' });
        const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
            .split('\n').filter(Boolean);
        checkModTag(commitMsg, stagedFiles);
        log('   ✅ Tag check passed.', colors.green);
    } catch (e) {
        if (e.message) log(`\n❌ ${e.message}`, colors.red);
        process.exit(1);
    }

    // 3. 테스트 실행 (있으면)
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (pkg.scripts && pkg.scripts.test) {
            log('3️⃣ Running tests...', colors.green);
            try {
                execSync('npm test', { stdio: 'inherit' });
                log('   ✅ Tests passed.', colors.green);
            } catch (e) {
                log('\n❌ Tests failed! Commit aborted.', colors.red);
                process.exit(1);
            }
        }
    }

    // 4. Git commit & push
    log('4️⃣ Committing and pushing...', colors.green);
    run('git add .');
    run(`git commit -m "${commitMsg}"`);
    run('git push', { timeout: 10000 });

    // 5. ISSUES.md 동기화
    log('5️⃣ Syncing ISSUES.md...', colors.green);
    try {
        execSync('node scripts/sync-issues.js', { stdio: 'inherit', timeout: 10000 });
    } catch (e) {
        log('⚠️ Sync failed, but commit was successful.', colors.yellow);
    }

    log('\n✅ Task Finished Successfully!', colors.green);
}

main();
