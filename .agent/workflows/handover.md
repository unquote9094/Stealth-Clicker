---
description: 세션 핸드오버 문서 생성 - 다음 AI 세션에 맥락 전달
---

# 🔄 HANDOVER

> **트리거**: 스텝 300~400 도달 또는 사용자 요청

## 1. 트리거 조건

| 스텝 | 액션 |
|:---|:---|
| 300 도달 | `HANDOVER.md` 작성 시작 |
| 400 도달 | 작업 중단 후 핸드오버 완료 |

## 2. 정보 수집 (자동)

```bash
# 최근 커밋 5개
git log -5 --oneline

# 열린 GitHub 이슈 (command_status 스킵!)
gh issue list --state open --limit 10

# 현재 브랜치
git branch --show-current
```

## 3. HANDOVER.md 작성

`docs/HANDOVER.md` 파일을 **덮어쓰기**로 생성

### 템플릿

```markdown
# 🔄 세션 핸드오버 문서
> 생성일: [현재 날짜/시간]

---

## 📋 다음 세션 AI에게

> [!IMPORTANT]
> 아래 문서들을 반드시 먼저 읽고 작업을 시작하세요.

1. `.agent/constitution.md` - 핵심 규칙
2. `docs/ISSUES.md` - 열린 이슈 목록

---

## 📝 이번 세션 요약

### 완료한 작업
- (AI가 작성)

### 🔥 마지막 수행 동작
- **작업 내용**: (직전에 수정한 파일)
- **마지막 명령어**: (실행한 명령어)
- **결과 상태**: (성공/실패/진행 중)

### 다음에 해야 할 작업
- (AI가 작성)

---

## 🐛 열린 이슈
(gh issue list 결과)

## 🔧 최근 커밋
(git log 결과)
```

## 4. 완료 보고

생성 완료 후 사용자에게 알림
