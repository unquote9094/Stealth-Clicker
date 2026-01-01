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
        return execSync(command, { encoding: 'utf8' }).trim();
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

    log('\n🚀 Starting New Task Automation...\n', colors.blue);

    // [PES] 0. Protocol Injection (Constitution)
    const constitutionPath = path.join(process.cwd(), '.agent', 'constitution.md');
    if (fs.existsSync(constitutionPath)) {
        log('\n📜 [AGENT CONSTITUTION] READING...', colors.red);
        log('---------------------------------------------------', colors.yellow);
        console.log(fs.readFileSync(constitutionPath, 'utf8'));
        log('---------------------------------------------------', colors.yellow);
        log('⚠️  DO NOT IGNORE THESE RULES.\n', colors.red);
    }

    // 2. GitHub 이슈 생성 (라벨 포함) - 상세 템플릿 사용
    log('1️⃣  Creating GitHub Issue...', colors.green);

    // 타입별 본문 템플릿 (UserDesc + 기술상세 2단계 구조)
    const bodyTemplates = {
        'bug': `## 🔍 한줄 요약 (UserDesc)
(비개발자도 이해할 수 있는 쉬운 설명)

## 📌 상세 설명
### 문제 (Problem)
(버그의 구체적인 증상)

### 재현 방법 (Steps)
1. (1단계)
2. (2단계)
3. → 버그 발생!

### 예상 동작 (Expected)
(정상적으로 동작해야 하는 방식)

## 🔧 기술적 원인 (Technical Cause)
(코드/함수 관련 원인 분석)

## ✅ 해결 방법 (Solution)
### 로직 흐름
\`\`\`
(수정 후 로직 흐름 다이어그램)
\`\`\`

### 수정 파일
- (파일 경로)

### 체크리스트
- [ ] 조사
- [ ] 구현
- [ ] 테스트

---
*이슈 생성: scripts/start-task.js*
*참조: docs/버그해결기록.md*`,

        'feat': `## 🔍 한줄 요약 (UserDesc)
(비개발자도 이해할 수 있는 기능 설명)

## 📌 상세 설명
### 기능 설명 (Feature Description)
(기능의 목적과 동작 방식)

### 사용 시나리오 (Use Case)
1. 사용자가 (행동)
2. 시스템이 (반응)
3. 결과: (결과)

## 🔧 기술적 구현 (Technical Implementation)
### 로직 흐름
\`\`\`
(구현 로직 다이어그램)
\`\`\`

### 관련 파일
- (파일 경로)

### 체크리스트
- [ ] 설계
- [ ] 구현
- [ ] 테스트
- [ ] TODO.md 업데이트

---
*이슈 생성: scripts/start-task.js*`,

        'enhance': `## 🔍 한줄 요약 (UserDesc)
(비개발자도 이해할 수 있는 개선 내용)

## 📌 상세 설명
### 현재 → 목표 (Current → Goal)
| 항목 | 현재 | 개선 후 |
|------|------|---------|
| (항목) | (현재 상태) | (개선 후 상태) |

### 개선 이유 (Why)
(왜 이 개선이 필요한지)

## 🔧 기술적 구현 (Technical Implementation)
### 로직 흐름
\`\`\`
(개선 로직 다이어그램)
\`\`\`

### 관련 파일
- (파일 경로)

### 체크리스트
- [ ] 분석
- [ ] 구현
- [ ] 확인

---
*이슈 생성: scripts/start-task.js*`,

        'fix': `## 🔍 한줄 요약 (UserDesc)
(비개발자도 이해할 수 있는 수정 내용)

## 📌 상세 설명
### 문제 (Problem)
(수정이 필요한 이유)

## 🔧 기술적 원인 (Technical Cause)
(코드/함수 관련 원인)

## ✅ 해결 방법 (Solution)
### 수정 파일
- (파일 경로)

### 체크리스트
- [ ] 수정
- [ ] 테스트

---
*이슈 생성: scripts/start-task.js*
*참조: docs/버그해결기록.md*`
    };

    const issueBody = bodyTemplates[type] || bodyTemplates['feat'];
    // PowerShell 호환을 위해 body를 파일로 임시 저장 후 사용
    const tempBodyPath = path.join(process.cwd(), '.issue_body_temp.md');
    fs.writeFileSync(tempBodyPath, issueBody, 'utf8');

    // gh issue create는 생성된 이슈의 URL을 반환함 (예: https://github.com/user/repo/issues/12)
    const url = run(`gh issue create --title "${fullTitle}" --label "${label}" --body-file "${tempBodyPath}"`);

    // 임시 파일 삭제
    fs.unlinkSync(tempBodyPath);

    // URL에서 이슈 번호 추출
    const issueNum = url.split('/').pop();
    log(`✅ Issue Created: #${issueNum} (${url})`, colors.green);
    log(`   Title: ${fullTitle}`, colors.yellow);
    log(`   Label: ${label}`, colors.yellow);

    // 3. TODO.md 업데이트
    log('2️⃣  Updating docs/TODO.md...', colors.green);
    const todoPath = path.join(process.cwd(), 'docs', 'TODO.md');

    if (!fs.existsSync(todoPath)) {
        log('⚠️  docs/TODO.md not found. Creating a new one...', colors.yellow);
        const template = `# [TRACKING] PROJECT_STATUS

## [ACTIVE] Work Queue

> **INSTRUCTION**: Focus on these tasks. Move to [ARCHIVE] upon completion.

## 📜 [ARCHIVE] Completion History

> **RULE**: DO NOT DELETE items. Append new completions here.
`;
        // docs 폴더가 없으면 생성
        const docsDir = path.dirname(todoPath);
        if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

        fs.writeFileSync(todoPath, template, 'utf8');
        log('✅ Created docs/TODO.md', colors.green);
    }

    let content = fs.readFileSync(todoPath, 'utf8');
    const newItem = `- [ ] **[ACTIVE] #${issueNum}: ${title}**\n`;

    // [ACTIVE] Work Queue 섹션 바로 아래에 추가
    if (content.includes('## [ACTIVE] Work Queue')) {
        content = content.replace(
            '## [ACTIVE] Work Queue',
            `## [ACTIVE] Work Queue\n\n${newItem}`
        );
        fs.writeFileSync(todoPath, content, 'utf8');
        log(`✅ Added to TODO.md: "${newItem.trim()}"`, colors.green);
    } else {
        log('⚠️  Could not find "[ACTIVE] Work Queue" section in TODO.md. Appending to bottom.', colors.yellow);
        fs.appendFileSync(todoPath, `\n${newItem}`);
    }

    log('\n✨ Ready to Work! Go ahead.', colors.blue);
}

main();
