#!/bin/sh
# ============================================
# Pre-commit Hook for BookToKi v2.0
# ============================================
# 이 스크립트는 git commit 시 자동으로 실행됩니다.
# 설치: scripts/install-hooks.js 실행
# ============================================

echo "🔍 Pre-commit 검사 시작..."

# 1. TODO.md 변경 확인 (경고만, 차단 안 함)
if ! git diff --cached --name-only | grep -q "docs/TODO.md"; then
    echo "⚠️  경고: docs/TODO.md가 스테이징되지 않았습니다."
    echo "   작업 완료 시 TODO.md 업데이트를 권장합니다."
fi

# 2. 버그 키워드 커밋 시 버그해결기록.md 확인
# 커밋 메시지는 이 단계에서 접근 불가 (commit-msg hook에서 처리)
# 대신 staged 파일 기준으로 체크
STAGED_FILES=$(git diff --cached --name-only)

# src/*.js 파일 수정 시 테스트 통과 확인
if echo "$STAGED_FILES" | grep -qE "^src/.*\.js$"; then
    echo "📋 JavaScript 파일 변경 감지. 테스트 실행 중..."
    npm test --silent
    if [ $? -ne 0 ]; then
        echo "❌ 테스트 실패! 커밋이 거부되었습니다."
        echo "   먼저 npm test를 통과시키세요."
        exit 1
    fi
    echo "✅ 테스트 통과!"
fi

echo "✅ Pre-commit 검사 완료!"
exit 0
