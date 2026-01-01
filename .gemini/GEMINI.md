# 🛠️ Stealth-Clicker 워크스페이스 규칙

> **이 파일은 프로젝트 생성 시 자동으로 배치됩니다.**

---

## 📋 필수 읽기 문서

| 순서 | 문서 | 설명 |
|:---:|:---|:---|
| 1 | `.agent/constitution.md` | 핵심 규칙 (불변) |
| 2 | `docs/ISSUES.md` | GitHub Issue 미러 |
| 3 | `docs/HANDOVER.md` | 세션 인계 (있으면) |

---

## 🔧 프로젝트 설정

| 항목 | 값 |
|:---|:---|
| 언어 | Node.js (ES Module) |
| 패키지 매니저 | npm |
| 테스트 | `npm test` |
| 빌드 | `npm run build` (해당 시) |

---

## 📂 폴더 구조

```
프로젝트/
├── .agent/                    # AI 에이전트 규칙
│   ├── constitution.md       # 핵심 규칙
│   └── workflows/            # 워크플로우
├── .gemini/                   # 워크스페이스 설정
│   └── GEMINI.md             # 이 파일
├── docs/                      # 문서
│   ├── ISSUES.md             # GitHub Issue 미러
│   ├── HANDOVER.md           # 세션 인계
│   ├── SHELL_GUIDE.md        # 터미널 가이드
│   └── reference/            # 참고 문서 (읽기 전용)
├── scripts/                   # 자동화 스크립트
└── src/                       # 소스 코드
```

---

## 🚀 워크플로우

1. **작업 시작**: `npm run start-task -- <type> "제목"`
2. **작업 완료**: `npm run finish -- "메시지 (#N)"`
3. **핸드오버**: `/handover` (스텝 300~400 시)
