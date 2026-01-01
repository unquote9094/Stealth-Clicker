---
description: 새로운 작업 시작 시 GitHub 이슈 생성
---

# 📌 START-TASK

> **STATUS**: 권장 (안 해도 작업 가능하지만 이슈 추적이 안 됨)

## 실행 방법

```bash
npm run start-task -- <type> "제목"
```

| Type | 설명 | 예시 |
|---|---|---|
| `bug` | 버그 수정 | `npm run start-task -- bug "제목 미출력"` |
| `feat` | 새 기능 | `npm run start-task -- feat "멀티 다운로드"` |
| `enhance` | 개선 | `npm run start-task -- enhance "UI 개선"` |

## 자동으로 되는 것

1. GitHub Issue 생성 (상세 템플릿 포함)
2. `docs/ISSUES.md` 자동 동기화

---

> **작업 완료 시**: `/finish-task` 실행
