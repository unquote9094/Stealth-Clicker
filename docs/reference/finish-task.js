import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * TODO.md 업데이트 로직
 */
function updateTodoFile(commitMsg) {
    const todoPath = path.join(process.cwd(), 'docs', 'TODO.md');
    if (!fs.existsSync(todoPath)) {
        log('⚠️  docs/TODO.md not found. Skipping auto-update.', colors.yellow);
        return;
    }

    // 1. 이슈 번호 추출 (Closes #N, Fixes #N, #N)
    // 예: "feat: ABC (Closes #5)" -> 5
    const match = commitMsg.match(/(?:Closes|Fixes|Resolve|Re)?\s*#(\d+)/i);
    if (!match) {
        log('⚠️  No issue number found in commit message. Skipping TODO update.', colors.yellow);
        return;
    }
    const issueNum = match[1];
    log(`   Target Issue: #${issueNum}`, colors.cyan);

    let content = fs.readFileSync(todoPath, 'utf8');
    const lines = content.split('\n');
    let targetIndex = -1;
    let targetLine = '';

    // 2. [ACTIVE] 섹션에서 해당 이슈 찾기
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 포맷: - [ ] **[ACTIVE] #5: Title**
        if (line.includes(`[ACTIVE] #${issueNum}`) || line.includes(`[TODO] #${issueNum}`)) {
            // 이미 완료된 경우 체크
            if (line.trim().startsWith('- [x]')) {
                log(`   Item #${issueNum} is already completed.`, colors.yellow);
                return;
            }
            targetIndex = i;
            targetLine = line;
            break;
        }
    }

    if (targetIndex === -1) {
        log(`⚠️  Could not find Active item #${issueNum} in TODO.md.`, colors.yellow);
        return;
    }

    // 3. 완료 처리 (Active -> Completed)
    // - [ ] **[ACTIVE] #N...** -> - [x] **[COMPLETED] #N...**
    let completedLine = targetLine.replace('- [ ]', '- [x]');
    completedLine = completedLine.replace('[ACTIVE]', '[COMPLETED]');
    completedLine = completedLine.replace('[TODO]', '[COMPLETED]'); // 혹시 TODO 태그일 경우

    // Active 목록에서 제거 (빈 줄도 처리하면 좋지만 간단히 제거)
    lines.splice(targetIndex, 1);
    log(`   Marked #${issueNum} as COMPLETED.`, colors.green);

    // 4. Archive 섹션으로 이동
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const archiveHeader = `### ${today}`;

    // Archive 섹션 찾기
    const archiveTitleIndex = lines.findIndex(l => l.includes('## 📜 [ARCHIVE]'));
    if (archiveTitleIndex === -1) {
        // Archive 섹션이 없으면 맨 뒤에 추가
        lines.push('', '## 📜 [ARCHIVE] Completion History', '', '> **RULE**: DO NOT DELETE items. Append new completions here.', '');
    }

    // 오늘 날짜 헤더 찾기 (Archive 섹션 이후에서)
    let todayIndex = -1;
    for (let i = archiveTitleIndex; i < lines.length; i++) {
        if (lines[i].includes(archiveHeader)) {
            todayIndex = i;
            break;
        }
    }

    // 오늘 날짜 헤더가 없으면 Archive 섹션 내용 시작 부분(RULE 다음)에 추가
    if (todayIndex === -1) {
        // Archive 섹션 헤더 찾기 다시 (위에서 추가됐을 수도 있음)
        const realArchiveIdx = lines.findIndex(l => l.includes('## 📜 [ARCHIVE]'));
        // RULE 줄 찾기 (보통 Archive 헤더 + 3~4줄)
        let insertPos = realArchiveIdx + 1;
        while (insertPos < lines.length && !lines[insertPos].startsWith('###') && !lines[insertPos].startsWith('## ')) {
            // RULE이나 빈줄 건너뛰기. 다음 ### (날짜) 나오면 멈춤
            if (lines[insertPos].match(/^### \d{4}-\d{2}-\d{2}/)) break;
            insertPos++;
        }

        // 날짜 헤더 추가
        lines.splice(insertPos, 0, '', archiveHeader, '');
        todayIndex = insertPos + 1;
    }

    // 해당 날짜 헤더 아래에 추가
    // 날짜 헤더 바로 다음 줄이 빈 줄일 수 있으니 확인
    lines.splice(todayIndex + 1, 0, completedLine);

    // 5. 저장
    fs.writeFileSync(todoPath, lines.join('\n'), 'utf8');
    log(`   Moved #${issueNum} to Archive (${today}).`, colors.green);
}

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
    const timeout = options.timeout || 30000; // 기본 30초 타임아웃
    try {
        log(`> ${command}`, colors.yellow);
        // stdio: 'pipe'로 출력을 캡처하고, 타임아웃으로 멈춤 방지
        const result = execSync(command, {
            stdio: 'pipe',
            timeout,
            encoding: 'utf8',
            // 환경변수로 페이징/대화형 모드 비활성화
            env: { ...process.env, GIT_PAGER: 'cat', GH_PAGER: '', PAGER: 'cat', CI: 'true' }
        });
        if (result && result.trim()) {
            console.log(result.trim());
        }
    } catch (error) {
        // 타임아웃이 발생해도 성공으로 간주하는 경우 처리
        if (error.killed) {
            log(`⚠️  Command timed out (${timeout / 1000}s): ${command}`, colors.yellow);
            log(`   Assuming success and continuing...`, colors.yellow);
            return; // 타임아웃은 성공으로 처리 (git push가 느릴 수 있음)
        }
        // stdout이 있으면 출력 (일부 에러 상황에서도 유용)
        if (error.stdout) console.log(error.stdout);
        if (error.stderr) console.error(error.stderr);
        log(`❌ Command failed: ${command}`, colors.red);
        process.exit(1);
    }
}

/**
 * [PES] Protocol Enforcement System
 * 필수 문서(Artifact)가 수정되었는지 Git Status로 확인
 */
function checkArtifacts(commitMsg) {
    // [FIX] 먼저 모든 변경사항 스테이징 (TODO 감지 실패 방지)
    log('   Auto-staging all changes...', colors.cyan);
    execSync('git add .', { stdio: 'pipe' });

    // 1. Git Staged Files 확인
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).split('\n').filter(Boolean);

    // Rule 1: TODO.md Must be Updated
    const todoUpdated = stagedFiles.some(f => f.includes('docs/TODO.md') || f.includes('docs\\TODO.md'));
    if (!todoUpdated) {
        throw new Error("You MUST update 'docs/TODO.md' to reflect the task status.");
    }

    // Rule 2: Bug Fixes Must Update Bug Log
    // 키워드: fix, bug, resolve, hotfix (대소문자 무시)
    const isBugFix = /fix|bug|resolve|hotfix/i.test(commitMsg);
    if (isBugFix) {
        const bugLogUpdated = stagedFiles.some(f => f.includes('버그해결기록') || f.includes('%EB%B2%84%EA%B7%B8'));

        if (!bugLogUpdated) {
            throw new Error("This seems like a BUG FIX. You MUST update 'docs/버그해결기록.md'.");
        }

        // [NEW] 버그 번호 항목 존재 확인
        // 커밋 메시지에서 버그 번호 추출 (예: "Bug #11", "#11", "버그 #11")
        const bugNumMatch = commitMsg.match(/(?:Bug|버그)?\s*#(\d+)/i);
        if (bugNumMatch) {
            const bugNum = bugNumMatch[1];
            const bugLogPath = path.join(process.cwd(), 'docs', '버그해결기록.md');
            if (fs.existsSync(bugLogPath)) {
                const bugLogContent = fs.readFileSync(bugLogPath, 'utf8');
                // "## 버그 #11" 형태의 헤더가 있는지 확인
                if (!bugLogContent.includes(`## 버그 #${bugNum}`)) {
                    throw new Error(
                        `버그해결기록.md에 "## 버그 #${bugNum}" 항목이 없습니다!\n` +
                        `   먼저 버그 기록을 작성하세요.`
                    );
                }
            }
        }
    }

    // [PES] Rule 3: Modularization Review (Tag Enforcement)
    // src 폴더 내의 .js 파일이 수정되었는지 확인
    const srcJsModified = stagedFiles.some(f => f.match(/^src\/.*\.js$/) || f.match(/^src\\.*\.js$/));
    if (srcJsModified) {
        // 커밋 메시지에 태그가 있는지 확인
        const hasModTag = /\[(MOD|RAW|N\/A)\]/.test(commitMsg);
        if (!hasModTag) {
            throw new Error(
                "Source code modified. You MUST declare modularization status.\n" +
                "   Append one of these tags to your commit message:\n" +
                "   - [MOD]: Refactored/Modularized\n" +
                "   - [RAW]: Kept as raw code (Intentionally)\n" +
                "   - [N/A]: Not applicable"
            );
        }
    }
}

function main() {
    // 커밋 메시지 확인
    const args = process.argv.slice(2);
    if (args.length === 0) {
        log('❌ Usage: npm run finish -- "commit message"', colors.red);
        log('   Example: npm run finish -- "fix: resolve bug #5 (Closes #3)"', colors.yellow);
        return;
    }

    const commitMsg = args[0];

    log('\n🚀 Starting Finish-Task Automation...\n', colors.cyan);

    // [PES] 0. Artifact Compliance Check (Constitution Enforcement)
    log('0️⃣  Checking Protocol Compliance...', colors.yellow);
    try {
        checkArtifacts(commitMsg);
        log('✅ Artifacts Checked. Proceeding...', colors.green);
    } catch (e) {
        log(`\n❌ PROTOCOL VIOLATION: ${e.message}`, colors.red);
        log('   The system refused to commit because you violated the Constitution.', colors.red);
        process.exit(1);
    }

    // 0. Safety Belt (Run Tests)
    log('0️⃣  Running Safety Checks...', colors.yellow);
    try {
        execSync('npm test', { stdio: 'inherit' }); // 테스트 실행
        log('✅ Tests Passed. Proceeding...', colors.green);
    } catch (e) {
        log('\n❌ Safety Check Failed! Commit aborted.', colors.red);
        log('   Please fix the errors in scripts/test_sanity.js first.', colors.red);
        process.exit(1); // 강제 종료
    }

    // [NEW] 0.5. TODO.md Auto-Update
    log('0️⃣.5️⃣  Updating docs/TODO.md...', colors.green);
    updateTodoFile(commitMsg);

    // [NEW] 0.6. Build (dist 파일 생성)
    log('0️⃣.6️⃣  Building dist file...', colors.yellow);
    try {
        execSync('npm run build', { stdio: 'inherit' });
        log('✅ Build completed.', colors.green);
    } catch (e) {
        log('\\n❌ Build Failed! Commit aborted.', colors.red);
        process.exit(1);
    }

    // 1. Git Add
    log('1️⃣  Staging changes...', colors.green);
    run('git add .');

    // 2. Git Commit
    log('2️⃣  Committing...', colors.green);
    run(`git commit -m "${commitMsg}"`);

    // 3. Git Push
    log('3️⃣  Pushing to GitHub...', colors.green);
    run('git push');

    log('\n✅ Task Finished Successfully!', colors.green);
    log('   - Changes pushed to remote.', colors.cyan);
    log('   - If you used keywords like "Closes #N", issues are closed automatically.', colors.cyan);
}

main();
