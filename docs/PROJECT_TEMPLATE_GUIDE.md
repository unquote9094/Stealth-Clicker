# 📚 프로젝트 템플릿 & 워크플로우 가이드

> **버전**: 1.0 (2026-01-02)
> **위치**: `E:\DEVz\_templates\project-template\`

---

## 🚀 새 프로젝트 시작하기

### 1단계: 템플릿 적용

```bash
# 새 프로젝트 폴더로 이동
cd E:\DEVz\새프로젝트

# 템플릿 초기화 (한 줄 명령!)
node E:\DEVz\_templates\project-template\init-project.js "프로젝트명"
```

### 2단계: Git & GitHub 설정

```bash
# Git 초기화
git init

# GitHub 저장소 생성 + 연결
gh repo create 프로젝트명 --public --source=. --remote=origin

# 첫 커밋
git add .
git commit -m "chore: 프로젝트 초기 설정 [N/A]"
git push -u origin master
```

### 3단계: 첫 번째 이슈 생성

```bash
npm run start-task -- feat "첫 번째 기능"
```

---

## 📁 생성되는 폴더 구조

```
프로젝트/
├── .agent/
│   ├── constitution.md       # 핵심 규칙 (AI 필독!)
│   └── workflows/
│       ├── start-task.md     # 작업 시작 가이드
│       ├── finish-task.md    # 작업 완료 가이드
│       └── handover.md       # 세션 인계 가이드
├── .gemini/
│   └── GEMINI.md             # 워크스페이스 규칙
├── docs/
│   ├── ISSUES.md             # GitHub Issue 미러 (자동 동기화)
│   └── SHELL_GUIDE.md        # 터미널 먹통 방지 가이드
├── scripts/
│   ├── start-task.js         # 이슈 생성 스크립트
│   ├── finish-task.js        # 커밋/push 스크립트
│   ├── sync-issues.js        # 이슈 동기화 스크립트
│   └── test_sanity.js        # 기본 테스트
├── src/                       # 소스 코드
└── package.json
```

---

## 🔄 일일 워크플로우

### 작업 시작

```bash
# 이슈 먼저 생성!
npm run start-task -- <type> "제목"

# type: bug, feat, enhance, fix
```

**자동으로 되는 것:**

- GitHub Issue 생성 (상세 템플릿 포함)
- `docs/ISSUES.md` 동기화

### 작업 완료

```bash
npm run finish -- "type: 메시지 (#N)"

# 예시:
npm run finish -- "feat: 로그인 기능 구현 (#1) [MOD]"
npm run finish -- "fix: 버그 수정 (Closes #5) [N/A]"
```

**자동으로 되는 것:**

1. 이슈 번호 확인 (없으면 **차단!**)
2. 모듈화 태그 확인 (src 수정 시)
3. `npm test` 실행
4. `git add . && commit && push`
5. `docs/ISSUES.md` 동기화

### 커밋 메시지 규칙

| 키워드 | 효과 |
|:---|:---|
| `#N` | 이슈 참조 (열린 상태 유지) |
| `Closes #N` | 이슈 자동 Close |
| `[MOD]` | 모듈화 완료 |
| `[RAW]` | 의도적으로 모듈화 안 함 |
| `[N/A]` | 해당 없음 |

---

## 🔁 세션 핸드오버

**트리거**: 스텝 300~400 도달 또는 `/handover` 명령

### AI가 해야 할 일

1. `docs/HANDOVER.md` 작성
2. 마지막 작업 내용 기록
3. 열린 이슈 목록 포함
4. 다음 할 일 명시

### 다음 AI 세션이 읽을 문서

1. `.agent/constitution.md` - 핵심 규칙
2. `docs/ISSUES.md` - 열린 이슈
3. `docs/HANDOVER.md` - 이전 세션 인계

---

## ⚠️ 핵심 규칙 요약

| 규칙 | 설명 |
|:---|:---|
| **이슈 먼저** | 코드 수정 전 이슈 생성/확인 |
| **이슈 번호 필수** | 커밋 시 `#N` 없으면 차단 |
| **이슈 상세 작성** | 한줄 요약 + 관련 파일 + 진행 기록 필수 |
| **gh 명령 후 스킵** | `command_status` 호출 금지 (먹통 방지) |
| **핸드오버** | 스텝 300~400 시 `HANDOVER.md` 작성 |

---

## 🛠️ 스크립트 명령어 요약

```bash
# 작업 시작 (이슈 생성)
npm run start-task -- <type> "제목"

# 작업 완료 (커밋 + push)
npm run finish -- "메시지 (#N)"

# 이슈 동기화 (수동)
npm run sync-issues

# 테스트 실행
npm test
```

---

## 📝 이슈 작성 템플릿

```markdown
## 📋 한줄 요약 (TL;DR)
(비개발자도 이해할 수 있는 설명)

## 🔍 상세 설명
### 문제/목표
(무엇이 문제인지, 무엇을 원하는지)

### 재현 방법 (버그인 경우)
1. 단계 1
2. 단계 2
3. → 문제 발생!

## 📂 관련 파일
- [`파일명.js`](파일 링크) - 설명

## ✅ 완료 조건
- [ ] 체크리스트 1
- [ ] 체크리스트 2

## 📝 진행 기록
| 날짜 | 내용 |
|:---|:---|
| 2026-01-02 | 이슈 생성 |
```

---

> **다음 프로젝트에서**: 이 문서와 `init-project.js`만 있으면 바로 시작!
