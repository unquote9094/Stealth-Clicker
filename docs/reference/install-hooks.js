import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI 색상
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

function main() {
    log('\n🔧 Git Hooks 설치 스크립트\n', colors.cyan);

    // 1. .git/hooks 폴더 확인
    const gitHooksDir = path.join(process.cwd(), '.git', 'hooks');
    if (!fs.existsSync(gitHooksDir)) {
        log('❌ .git/hooks 폴더를 찾을 수 없습니다.', colors.red);
        log('   이 프로젝트가 Git 저장소인지 확인하세요.', colors.yellow);
        process.exit(1);
    }

    // 2. pre-commit hook 설치
    const sourcePath = path.join(__dirname, 'pre-commit.sh');
    const targetPath = path.join(gitHooksDir, 'pre-commit');

    if (!fs.existsSync(sourcePath)) {
        log('❌ scripts/pre-commit.sh 파일을 찾을 수 없습니다.', colors.red);
        process.exit(1);
    }

    // 기존 hook 백업
    if (fs.existsSync(targetPath)) {
        const backupPath = targetPath + '.backup';
        fs.copyFileSync(targetPath, backupPath);
        log(`📦 기존 hook 백업: ${backupPath}`, colors.yellow);
    }

    // hook 복사
    fs.copyFileSync(sourcePath, targetPath);

    // Windows가 아닌 경우 실행 권한 부여 (Windows에서는 무시됨)
    if (process.platform !== 'win32') {
        fs.chmodSync(targetPath, '755');
    }

    log('✅ Pre-commit hook 설치 완료!', colors.green);
    log(`   위치: ${targetPath}`, colors.cyan);
    log('\n📌 이제 git commit 시 자동으로 검사가 실행됩니다.', colors.green);
}

main();
