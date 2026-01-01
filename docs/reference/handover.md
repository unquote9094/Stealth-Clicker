---
description: 세션 핸드오버 문서 생성 - 다음 AI 세션에 맥락 전달
---

# /handover 워크플로우

> 사용자가 이 명령을 실행하면, AI는 아래 체크리스트를 **반드시** 수행해야 합니다.

## 1. 정보 수집 (자동)

다음 명령어들을 실행하여 정보를 수집합니다:

```bash
# 최근 커밋 5개
git log -5 --oneline

# 최근 수정 파일
git diff --name-only HEAD~3

# 열린 GitHub 이슈
gh issue list --state open --limit 10

# 현재 브랜치
git branch --show-current
```

## 2. Brain 문서 백업 (Assetization)

현재 세션의 "뇌"에 있는 휘발성 문서들을 영구 저장소로 백업합니다.

1. `docs/session_backup/` 폴더를 생성합니다 (없으면 생성).
2. 현재 Brain 경로에 있는 다음 파일들이 존재하면 복사합니다:
    - `task.md`
    - `implementation_plan.md`
    - `walkthrough.md`
    - (`.agent/brain/` 등의 임시 경로에서 `docs/session_backup/`으로 복사)

> **Note**: 이 파일들은 다음 세션 AI가 "참조(Reference)"할 수 있는 상세 기록이 됩니다.

## 3. 세션 요약 작성 (AI 판단)

이번 대화 세션에서 수행한 작업을 요약합니다:

- 완료한 작업
- 진행 중인 작업
- 발생한 문제/해결 방법
- 다음에 해야 할 작업

## 4. HANDOVER.md 생성

`docs/HANDOVER.md` 파일을 **덮어쓰기**로 생성합니다.

### 템플릿

```markdown
# 🔄 세션 핸드오버 문서
> 생성일: [현재 날짜/시간]

---

## 📋 다음 세션 AI에게 필수 명령

> [!IMPORTANT]
> 아래 문서들을 반드시 먼저 읽고 작업을 시작하세요.

1. `docs/TODO.md` - 현재 작업 상태
2. `.agent/constitution.md` - 핵심 규칙 5개
3. `docs/버그해결기록.md` - 해결된 버그 기록

> [!TIP]
> 📦 **상세 백업 자료 (`docs/session_backup/`)**
> - `task.md`: 이전 세션의 상세 체크리스트
> - `implementation_plan.md`: 기능 구현 설계도
> - `walkthrough.md`: 작업 결과 보고서 및 테스트 기록
> *필요할 때 참조(Reference)하세요.*

---

## 📝 이번 세션 요약

### 완료한 작업
- [AI가 작성]

### 진행 중인 작업
- [현재 작업 중인 기능/버그 설명]
- [진행 상황: 어디까지 했는지]
- [막힌 부분이 있다면 어디서 막혔는지]

### 🔥 가장 최근 수행한 동작 (/handover 실행 직전)
> ⚠️ 주의: `/handover` 명령 자체가 아니라, **그 직전에 AI가 하고 있던 실제 작업**을 기록합니다.
> 다음 세션 AI가 바로 이어서 작업할 수 있도록!

- **작업 내용:** `[직전에 수정한 파일이나 기능 설명]`
- **마지막 명령어:** `[실행한 명령어, 예: npm run finish, git commit 등]`
- **결과 상태:** `[성공/실패/진행 중]`
- **작업 맥락:** `[왜 그 작업을 했는지 간단히]`

**예시:**
```

- 작업 내용: `scripts/finish-task.js`에 버그기록 검증 로직 추가
- 마지막 명령어: `npm run finish -- "fix: Bug #10"`
- 결과 상태: 성공, 커밋 완료 (4593886)
- 작업 맥락: SmartSorter 통합 작업 중 버그 발견 → 수정 완료

```

### 다음에 해야 할 작업
- [AI가 작성]

---

## 🔧 최근 커밋
[git log 결과 붙여넣기]

## 🐛 열린 이슈
[gh issue list 결과 붙여넣기]

## 📂 최근 수정 파일
[git diff --name-only 결과 붙여넣기]

## 🌿 현재 브랜치
[git branch 결과]

---

## ⚠️ 주의사항
- [프로젝트 특이사항, 주의할 점 등]
```

## 4. 완료 보고

생성 완료 후 사용자에게 알립니다:

- `docs/HANDOVER.md` 생성 완료
- 다음 세션에서 이 파일을 AI에게 읽히라고 안내
