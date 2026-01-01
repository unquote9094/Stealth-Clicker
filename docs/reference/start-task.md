---
description: 새로운 작업 시작 시 GitHub 이슈 생성 (권장, 선택사항)
---

# 📌 START-TASK (권장)

> **STATUS**: 선택 사항 (안 해도 작업 가능)
> **BENEFIT**: 이슈 자동 생성 + TODO.md 자동 추가

## 실행 방법

```bash
npm run start-task -- <type> "제목"
```

| Type | 설명 | 예시 |
|---|---|---|
| `bug` | 버그 수정 | `npm run start-task -- bug "제목 미출력"` |
| `feat` | 새 기능 | `npm run start-task -- feat "멀티 다운로드"` |
| `enhance` | 개선 | `npm run start-task -- enhance "UI 개선"` |
| `fix` | 간단 수정 | `npm run start-task -- fix "오타 수정"` |

## 자동으로 되는 것

1. GitHub Issue 생성 (상세 템플릿 포함)
2. `docs/TODO.md`에 `[ACTIVE]` 항목 추가

## 안 하면?

- 작업은 가능하지만 이슈 추적이 안 됨
- 커밋 시 `Closes #N`을 쓸 수 없음

---

> **작업 완료 시**: `npm run finish -- "메시지 (Closes #N)"` 실행
