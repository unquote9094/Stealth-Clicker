# [SYSTEM_CONTEXT] WORKSPACE_RULES

> **TYPE**: 기술스택 및 파일구조 정보

## 1. 기술 스택

| 항목 | 값 |
|---|---|
| **플랫폼** | Tampermonkey UserScript |
| **번들러** | Rollup (Single file output) |
| **언어** | ES Modules (Modern JS) |
| **문서** | JSDoc 주석 |

## 2. 파일 구조

```
@DEVz/
├── _shared/              ← 공용 모듈 (안정화된 코드)
│   ├── tampermonkey-header.js
│   └── text-utils.js
└── BookToKi_v2.0/        ← 현재 프로젝트
    ├── src/              ← 소스 코드
    ├── scripts/          ← 자동화 스크립트
    ├── docs/             ← 문서
    └── .agent/           ← 에이전트 규칙
```

## 3. 모듈 규칙

- `src/`에서 범용 로직 발견 시 → `_shared/`로 이동
- 코드 중복 금지 (import로 재사용)

## 4. 문서 포맷

- **스타일**: 기계친화적 (KEY: VALUE, 테이블)
- **목적**: AI가 빠르게 컨텍스트 파악
- **예외**: `UserDesc` 필드 (사용자용 쉬운 설명)

---

> **워크플로우 규칙**: `.agent/constitution.md` 참조
