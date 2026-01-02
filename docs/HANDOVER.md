# 🔄 세션 핸드오버 문서

> 생성일: 2026-01-02 09:15 KST

---

## 📋 다음 세션 AI에게

> [!IMPORTANT]
> 아래 문서들을 반드시 먼저 읽고 작업을 시작하세요.

1. `.agent/constitution.md` - 핵심 규칙
2. `docs/ISSUES.md` - 열린 이슈 목록
3. `docs/reference/SITE_ANALYSIS.md` - 사이트 셀렉터 정보
4. **`docs/reference/SHELL_COMPATIBILITY_GUIDE.md`** - ⚠️ gh 명령 주의사항

> [!CAUTION]
> **`gh issue close` 등 gh 명령 실행 후 `command_status` 확인 시 무한 대기 발생!**
> 해결: gh 명령 후 확인 스킵하고 바로 다음 작업 진행

---

## 📂 프로젝트 구조

```
ver001/
├── auto-run.js          # 메인 진입점 (통합 자동화)
├── mine-test.js         # 단독 테스트 (광산만)
├── src/
│   ├── config/
│   │   └── config.js    # 전역 설정 (FEATURES, TIMING 등)
│   ├── core/
│   │   ├── BrowserEngine.js   # Puppeteer + Stealth
│   │   ├── Orchestrator.js    # 통합 스케줄러
│   │   ├── HumanMouse.js      # ghost-cursor 래퍼
│   │   └── IdleBehavior.js    # 대기 중 랜덤 행동
│   ├── actions/
│   │   ├── MineGame.js        # 광산 채굴 (681줄, 핵심!)
│   │   └── MonsterRaid.js     # 몬스터 레이드
│   └── utils/
│       ├── TerminalUI.js      # 터미널 실시간 UI
│       ├── ProgressTracker.js # 진행 상황 JSON 저장
│       ├── logger.js          # 로그 (파일 + 콘솔)
│       └── randomizer.js      # 랜덤 유틸
├── data/
│   └── cookies.json     # 쿠키 저장소
└── logs/                # 날짜별 로그 파일
```

---

## 🎮 핵심 모듈 설명

### 1. Orchestrator.js (통합 스케줄러)

- `CONFIG.FEATURES` 플래그로 기능 ON/OFF
- 광산 채굴 → 레이드 → 대기 루프
- `TerminalUI` 연결하여 실시간 상태 표시

### 2. MineGame.js (광산 채굴) ⭐

| 메서드 | 설명 |
|:---|:---|
| `autoNavigateToAliveMine()` | 살아있는 광산 자동 이동 |
| `mineOnce()` | 단일 채굴 (장비선택 → 클릭 → 결과확인) |
| `getWaitTime()` | 다음 채굴까지 대기시간 |
| `checkResult()` | 채굴 성공/보상 확인 (댓글 ID 비교) |

### 3. MonsterRaid.js (레이드)

- `isRaidTime()`: 현재 XX:10~20 또는 XX:40~50인지 확인
- `attackOnce()`: 첫 공격만 (캡차 우회, 10포인트 무료)

### 4. config.js (설정)

```javascript
CONFIG.FEATURES = {
    MINING: true,      // 채굴 ON
    RAID: true,        // 레이드 ON
    DOWNLOAD: false,   // 다운로드 OFF (레벨 부족)
};

CONFIG.TIMING.MINE_COOLDOWN = 300 * 1000;  // 300초
CONFIG.GOALS.DAILY_MINING_COUNT = 60;      // 하루 60회
```

---

## 📝 이번 세션 요약

### ✅ 완료한 작업

1. **터미널 UI 로그 문제 수정**
   - `Logger.setConsoleOutput(enabled)` 메서드 추가
   - `auto-run.js`에서 터미널 UI 모드 시 콘솔 출력 비활성화
   - 초기화 메시지도 조건부 출력

2. **(이전 세션) 광산 목록 자동 선택 구현**
   - `navigateToMineList()` - 목록 이동
   - `findAliveMine()` - 폐광 아닌 광산 찾기
   - 셀렉터: `li.list-item`, `.wr-thumb img`

3. **(이전 세션) MineGame 버그 수정**

   | 버그 | 수정 |
   |:---|:---|
   | alert 미처리 | `page.on('dialog')` 핸들러 |
   | 첫 클릭 안 됨 | `waitForSelector()` 추가 |
   | 결과 오인 | 댓글 ID 비교로 새 결과 감지 |
   | 대기시간 < 300초 | 최소 300초 보장 |

---

## 🔥 마지막 수행 동작

- **작업 내용**: 터미널 UI 로그 출력 문제 수정
- **수정 파일**: `logger.js`, `auto-run.js`, `TerminalUI.js`
- **결과 상태**: ✅ 완료 (테스트 성공)

---

## 🧪 다음에 해야 할 작업

### 우선순위 1: 통합 테스트

```bash
node auto-run.js
```

- [ ] 터미널 UI 정상 표시 확인
- [ ] 광산 자동 선택 동작 확인
- [ ] 배거288 선택 → 채굴 → 결과 확인
- [ ] 300~400초 대기 후 다음 채굴

### 우선순위 2: GitHub 이슈 정리

- [ ] Issue #1, #2, #3 닫기 (이미 구현됨)
- [ ] 새 이슈 등록 (남은 기능)

### 우선순위 3: 추가 기능

- [ ] `MonsterRaid.js` 실제 페이지 분석 후 셀렉터 수정
- [ ] 다운로드 모듈 (10레벨 달성 후)

---

## 🐛 알려진 이슈

| 상태 | 설명 |
|:---:|:---|
| ⚠️ | 터미널 UI 레이아웃 약간 안 맞음 (한글 폭 계산) |
| ⚠️ | `MonsterRaid.js` 셀렉터 미검증 (추정) |
| ❌ | 다운로드 기능 미구현 (10레벨 필요) |

---

## 🔧 최근 커밋

```
(터미널 UI 로그 수정 - 아직 커밋 안 됨)
f7cd79c fix: start-task.js 이슈 템플릿 개선
25ba16b feat: 인간 행동 모듈 + 진행 추적기
05c6523 feat: 기반 유틸리티 구현
546b1a1 feat: Puppeteer + Stealth 환경 구축
```

---

## 📂 핵심 파일 빠른 참조

| 파일 | 설명 | 라인수 |
|:---|:---|---:|
| `src/actions/MineGame.js` | 광산 채굴 핵심 | 681 |
| `src/core/Orchestrator.js` | 통합 스케줄러 | 260 |
| `src/core/BrowserEngine.js` | Puppeteer 래퍼 | 231 |
| `src/actions/MonsterRaid.js` | 레이드 | 245 |
| `src/config/config.js` | 설정 | 115 |
| `auto-run.js` | 진입점 | 67 |

---

## 💡 개발 팁

1. **테스트 전 쿠키 확인**: `data/cookies.json` 있어야 로그인 상태 유지
2. **터미널 UI 끄기**: `CONFIG.DEBUG.TERMINAL_UI = false` 하면 일반 로그 모드
3. **로그 확인**: `logs/YYYY-MM-DD.log` 에서 상세 로그 확인
