import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ANSI 색상 코드
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m"
};

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

function run(command) {
    try {
        log(`> ${command}`, colors.yellow);
        return execSync(command, {
            encoding: 'utf8',
            env: { ...process.env, GH_PAGER: '', PAGER: 'cat', CI: 'true' }
        }).trim();
    } catch (error) {
        log(`❌ Command failed: ${command}`, colors.red);
        process.exit(1);
    }
}

function main() {
    // 1. 인자 확인 (타입 + 타이틀)
    const args = process.argv.slice(2);
    if (args.length < 2) {
        log('❌ Usage: npm run start-task -- <type> "Task Title"', colors.red);
        log('   Types: bug, feat, enhance', colors.yellow);
        log('   Example: npm run start-task -- bug "소설 제목 미추출"', colors.yellow);
        return;
    }
    const type = args[0].toLowerCase();
    const title = args[1];

    // 타입별 prefix와 label 매핑
    const typeMap = {
        'bug': { prefix: '[버그]', label: 'bug' },
        'feat': { prefix: '[기능]', label: 'enhancement' },
        'enhance': { prefix: '[개선]', label: 'enhancement' },
        'fix': { prefix: '[수정]', label: 'bug' }
    };

    if (!typeMap[type]) {
        log(`❌ Unknown type: "${type}". Use: bug, feat, enhance, fix`, colors.red);
        return;
    }

    const { prefix, label } = typeMap[type];
    const fullTitle = `${prefix} ${title}`;

    log('\n🚀 Creating GitHub Issue...\n', colors.blue);

    // [PES] 0. Constitution 읽기
    const constitutionPath = path.join(process.cwd(), '.agent', 'constitution.md');
    if (fs.existsSync(constitutionPath)) {
        log('📜 [AGENT CONSTITUTION] Loading...', colors.yellow);
    }

    // 타입별 이슈 본문 생성
    const today = new Date().toISOString().split('T')[0];

    let issueBody;
    if (type === 'bug' || type === 'fix') {
        issueBody = `## 📋 한줄 요약
${title}

## 🔍 상세 설명
### 문제 상황
- (어떤 문제가 발생하는지 설명)

### 재현 방법
1. (단계 1)
2. (단계 2)
3. → 문제 발생!

### 기대 결과
- (정상 동작 시 어떻게 되어야 하는지)

## ✅ 완료 조건
- [ ] 버그 수정
- [ ] 테스트 통과

## 📝 진행 기록
| 날짜 | 내용 |
|:---|:---|
| ${today} | 이슈 생성 |`;
    } else {
        // feat, enhance
        issueBody = `## 📋 한줄 요약
${title}

## 🔍 상세 설명
### 목표
- (무엇을 구현/개선하는지)

### 구현 내용
- (예정된 구현 내용)

## ✅ 완료 조건
- [ ] 구현 완료
- [ ] 테스트 통과

## 📝 진행 기록
| 날짜 | 내용 |
|:---|:---|
| ${today} | 이슈 생성 |`;
    }

    // 임시 파일로 body 저장 (PowerShell 호환)
    const tempBodyPath = path.join(process.cwd(), '.issue_body_temp.md');
    fs.writeFileSync(tempBodyPath, issueBody, 'utf8');

    // GitHub 이슈 생성
    const url = run(`gh issue create --title "${fullTitle}" --label "${label}" --body-file "${tempBodyPath}"`);

    // 임시 파일 삭제
    fs.unlinkSync(tempBodyPath);

    // URL에서 이슈 번호 추출
    const issueNum = url.split('/').pop();
    log(`✅ Issue Created: #${issueNum} (${url})`, colors.green);
    log(`   Title: ${fullTitle}`, colors.yellow);

    // ISSUES.md 동기화 호출
    log('\n2️⃣ Syncing ISSUES.md...', colors.green);
    try {
        execSync('node scripts/sync-issues.js', { stdio: 'inherit' });
    } catch (e) {
        log('⚠️ Sync failed, but issue was created.', colors.yellow);
    }

    log('\n✨ Ready to Work!', colors.blue);
    log(`   커밋 시 #${issueNum} 사용하세요.`, colors.yellow);
}

main();
