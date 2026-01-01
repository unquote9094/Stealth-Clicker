---
description: 작업 완료 시 실행 (필수)
---

# 🎯 FINISH-TASK (필수)

> **STATUS**: 필수 (자동 검증됨)
> **TRIGGER**: 작업 완료 후 커밋 전

## 실행 방법

```bash
npm run finish -- "type: 메시지 (Closes #N)"
```

### 예시

```bash
npm run finish -- "fix: 제목 추출 버그 수정 (Closes #5) [N/A]"
npm run finish -- "feat: 멀티 다운로드 구현 (Closes #10) [MOD]"
```

## 자동으로 되는 것

| 단계 | 내용 |
|---|---|
| 1 | `docs/TODO.md` 업데이트 확인 |
| 2 | 버그면 `버그해결기록.md` 항목 확인 |
| 3 | `npm test` 실행 |
| 4 | 모듈화 태그 확인 (`[MOD/RAW/N/A]`) |
| 5 | `git add . && commit && push` |

## 실패 시

- 검증 통과 못하면 커밋 거부됨
- 에러 메시지에 해결 방법 안내됨

---

> **Tip**: 이슈 자동 Close를 원하면 `Closes #N` 키워드 사용
