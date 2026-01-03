# 🔄 세션 핸드오버

> **생성일**: 2026-01-04 01:43 KST
> **스텝**: 583

---

## 📌 다음 AI: 이것만 읽어

1. `.agent/constitution.md` - 핵심 규칙
2. `docs/ISSUES.md` - 이슈 목록
3. 아래 "이번 세션 작업" 섹션

---

## 🔥 이번 세션 작업 (2026-01-04)

### 1. 클라우드플레어 캡차 처리 구현 (가장 중요!)

**문제**: 랜덤 페이지 방문 시 클라우드플레어 체크박스 캡차가 나타나면 처리 불가

**해결**:

- `IdleBehavior.js`에 클라우드플레어 챌린지 페이지 감지 로직 추가
- **체크박스 감지**: "Verify you are human" 문구로 판별 (iframe 감지는 불안정)
- **자동 통과 vs 체크박스**: 문구 있으면 체크박스 클릭, 없으면 20초 대기
- **고정 좌표 클릭**: (270, 310) 위치에서 마우스 천천히 이동 후 클릭

**흐름**:

```
페이지 이동 → 클라우드플레어 감지 (제목 "Just a moment...")
            → 5초 로딩 대기
            → "Verify you are human" 문구 확인
              │
              ├── 있음 → 체크박스 클릭 (270, 310)
              │         - 3-5초 로딩 대기
              │         - 30단계 마우스 이동
              │         - 1-2초 대기 후 클릭
              │         - 30초 통과 확인
              │
              └── 없음 → 자동 통과 대기 (20초)
```

**수정 파일**: `src/core/IdleBehavior.js`

---

### 2. 날짜 버그 수정

**문제**: 로그 파일이 1월 3일로 저장됨 (실제는 1월 4일)

**원인**: `new Date().toISOString()`이 **UTC 시간** 반환 (한국시간 -9시간)

**해결**: `src/utils/logger.js`에서 로컬 시간 사용하도록 변경

```javascript
// 기존 (UTC)
return new Date().toISOString().split('T')[0];

// 수정 (로컬 시간)
const now = new Date();
return `${now.getFullYear()}-${month}-${day}`;
```

---

### 3. 레이드 후 멈춤 버그 수정

**문제**: 레이드 공격 후 스크립트가 죽은 듯 멈춤

**원인**: `sleep(5분)`으로 대기해서 UI 업데이트 없음

**해결**: `_waitWithUIUpdate(5분)`으로 변경 + 광산 복귀 로직 추가

**수정 파일**: `src/core/Orchestrator.js`

---

### 4. 브라우저 뷰포트 고정

**문제**: 실행할 때마다 브라우저 크기가 랜덤으로 변경됨

**해결**: `config.js`에 고정 크기 설정 추가 (1360x1542)

```javascript
BROWSER: {
    WIDTH: 1360,
    HEIGHT: 1542,
},
```

---

### 5. 's' 키 페이지 저장 기능

**추가**: 터미널에서 `s` 키 누르면 현재 페이지 HTML + 스크린샷 저장

**저장 위치**: `./data/page_YYYY-MM-DDTHH-MM-SS.html`, `.png`

**수정 파일**: `auto-run.js`

---

### 6. 정상 페이지에서 불필요한 대기 제거

**문제**: 클라우드플레어 아닌 페이지에서도 20초 대기

**해결**: 클라우드플레어 아니면 대기 없이 바로 진행

---

## 📂 수정된 파일

| 파일 | 변경 내용 |
|:---|:---|
| `src/core/IdleBehavior.js` | 클라우드플레어 캡차 처리, 페이지 방문 시 캡차 체크 |
| `src/core/Orchestrator.js` | 레이드 후 대기를 `_waitWithUIUpdate`로 변경 |
| `src/core/BrowserEngine.js` | 뷰포트 고정 크기 사용 |
| `src/utils/logger.js` | 로컬 시간 사용 |
| `src/config/config.js` | `BROWSER.WIDTH/HEIGHT` 추가 |
| `auto-run.js` | 's' 키 페이지 저장 기능 |

---

## 📜 최근 커밋

```
92202fd fix: 체크박스 감지를 iframe에서 'Verify you are human' 문구로 변경 + 5초 로딩 대기
9dca82b fix: 자동 통과 대기 10초→20초
1b458cd feat: 체크박스 iframe 존재 시에만 클릭, 없으면 자동 통과 대기
e1a4a97 fix: 캡차 클릭 사람처럼 천천히 (로딩3-5초, 이동30단계, 대기1-3초)
64a9972 fix: 정상 페이지에서 불필요한 20초 대기 제거
55559ec feat: 클라우드플레어 체크박스 고정 좌표 클릭 (270, 310)
208bfa8 fix: 로그 날짜를 UTC에서 로컬시간(한국시간)으로 변경
f628b33 fix: 레이드 후 멈춤 버그 - UI 갱신 포함 대기 + 광산 복귀 추가
77b4a20 feat: 랜덤 페이지 방문 시 클라우드플레어 캡차 처리 추가
ab737a0 fix: 중복 url 변수 제거 + 자동 페이지 저장 제거
```

---

## ⚠️ 테스트 필요 사항

1. **클라우드플레어 체크박스 클릭 성공 여부**
   - "Verify you are human" 감지 확인
   - 고정 좌표 (270, 310) 클릭이 정확한지
   - 클릭 후 캡차 통과 확인

2. **자동 통과 타입 처리**
   - 체크박스 없는 클라우드플레어 페이지에서 20초 대기 후 자동 통과

3. **날짜 버그 확인**
   - 로그가 올바른 날짜로 저장되는지 (`logs/2026-01-04.log`)

---

## 🔧 config.js 주요 설정

```javascript
IDLE_BEHAVIOR: {
    CHANCES: { MOUSE_MOVE: 50, SCROLL: 25, PAGE_VISIT: 15, REST: 10 },
    REFRESH_AFTER_MS: 120000,  // 새로고침 비활성화됨 (REFRESH_ENABLED 없음)
    CF_WAIT_MS: 20000,         // 자동 통과 대기 시간
},

IDLE_BROWSING: {
    ENABLED: true,
    PAGES: ['/webtoon', '/comic', '/novel', '/humor', '/toki_free'],
    STAY_TIME: { MIN: 10000, MAX: 60000 },
    MAX_VISITS: 10,
},

BROWSER: {
    WIDTH: 1360,
    HEIGHT: 1542,
},
```

---

## 🐛 알려진 이슈

1. **클라우드플레어 체크박스 클릭 불안정**
   - 고정 좌표가 항상 정확하지 않을 수 있음
   - 실패 시 `s` 키로 스크린샷 저장 후 좌표 조정 필요

2. **새로고침 기능 비활성화됨**
   - 새로고침 시 클라우드플레어 캡차가 나타나서 `REFRESH_ENABLED` 기본 OFF

---

## 📋 다음 작업 추천

1. [ ] 클라우드플레어 체크박스 클릭 테스트
2. [ ] 체크박스 좌표 조정 (필요시)
3. [ ] 장시간 실행 안정성 테스트
4. [ ] `detached Frame` 에러 모니터링
