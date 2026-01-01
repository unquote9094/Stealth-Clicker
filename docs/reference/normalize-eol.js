import fs from 'fs';
import path from 'path';

// 대상 확장자 목록
const extensions = ['.md', '.js', '.json', '.txt', '.html', '.css'];
// 제외할 폴더
const ignoreDirs = ['.git', 'node_modules', 'dist'];

function getAllFiles(dir, fileList = []) {
    try {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            // .git 폴더 등 제외
            if (ignoreDirs.some(ignore => filePath.includes(path.sep + ignore + path.sep) || filePath.endsWith(path.sep + ignore))) {
                return;
            }
            if (ignoreDirs.includes(file)) return;

            try {
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    getAllFiles(filePath, fileList);
                } else {
                    const ext = path.extname(file).toLowerCase();
                    if (extensions.includes(ext)) {
                        fileList.push(filePath);
                    }
                }
            } catch (err) {
                // 권한 문제 등으로 접근 불가 시 무시
            }
        });
    } catch (err) {
        // 디렉토리 읽기 실패 시 무시
    }
    return fileList;
}

function normalizeFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        // CRLF를 LF로 변경
        const normalized = content.replace(/\r\n/g, '\n');

        // 변경사항이 있을 때만 저장
        if (content !== normalized) {
            fs.writeFileSync(filePath, normalized, 'utf8');
            console.log(`Updated (LF): ${filePath}`);
            return true;
        }
        return false;
    } catch (err) {
        console.error(`Error processing ${filePath}: ${err.message}`);
        return false;
    }
}

console.log('Starting Line Ending Normalization (to LF)...');
const rootDir = process.cwd();
const files = getAllFiles(rootDir);
let count = 0;

files.forEach(file => {
    if (normalizeFile(file)) {
        count++;
    }
});

console.log(`Normalization Complete. ${count} files updated.`);
