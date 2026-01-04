# 🔄 세션 핸드오버 문서

> **작성일**: 2026-01-04 18:34 KST  
> **세션 스텝**: ~734 (오버)  
> **프로젝트**: Stealth-Clicker (북토끼 자동 채굴/레이드)

---

## 📋 이 세션에서 완료한 작업

### 1. CF(클라우드플레어) 자동통과 타입 감지 복구

- **파일**: `src/core/IdleBehavior.js` (197-222줄)
- **변경**: 체크박스/iframe 있는지 먼저 확인, 없으면 20초 대기만 (클릭 안함)
- **로그**: `📌 자동 통과 타입 (체크박스 없음) - 20초 대기`

### 2. Detached Frame 발생 시 대기 종료

- **파일**: `src/core/IdleBehavior.js` (436-444줄)
- **변경**: detached Frame 에러 시 `isActive = false` 후 return → 상위에서 페이지 갱신

### 3. 인간처럼 보이기 설정 추가

- **파일**: `src/config/config.js`
- **변경**:
  - `TIMING.MINE_EXTRA.MAX`: 100초 → **200초** (대기 300~500초)
  - `TIMING.RAID_SKIP_CHANCE`: **10%** 확률로 레이드 스킵

### 4. 레이드 스킵 시에도 slot 기록 추가

- **파일**: `src/actions/MonsterRaid.js` (305~325줄)
- **문제**: 캡차 감지/URL 스킵 시 slot 미기록 → 10~20분간 레이드 페이지 반복 방문
- **해결**: `_markRaidSlotAttacked()` 호출 추가
- **효과**: 같은 시간대에 레이드 체크 1회만

### 5. 불필요한 광산 복귀 루틴 제거

- **파일**: `src/core/Orchestrator.js` (274~280줄)
- **파일**: `src/core/IdleBehavior.js` (425~446줄)
- **변경**:
  - 레이드 후 광산 복귀 제거
  - 랜덤 페이지 방문 후 광산 복귀 제거
- **효과**: 광산 이동은 **채굴 시점에만** 발생

### 6. 디버그 로그 강화

- **파일**: `src/core/Orchestrator.js`
- **추가된 로그**:
  - `=== 메인 루프 시작 ===`
  - `>>> _tryMining() 시작/종료`
  - `광산 이동 결과: 성공/실패`
  - `채굴 버튼 클릭 시도...`
  - `채굴 결과: success=true, reward=XXX`
  - `대기 시작: X분 Y초 (N회 채굴 완료)`
  - `⏰ 대기 완료 - 다음 채굴 시작`

---

## 🏗️ 현재 코드베이스 구조

```
src/
├── core/
│   ├── Orchestrator.js      # 메인 스케줄러 (채굴 → 대기 → 채굴 루프)
│   ├── IdleBehavior.js      # 대기 중 행동 (랜덤 페이지, 마우스, 스크롤)
│   ├── BrowserEngine.js     # Puppeteer 브라우저 관리
│   └── HumanMouse.js        # 사람처럼 마우스 이동 (ghost-cursor)
├── actions/
│   ├── MineGame.js          # 광산 채굴 로직
│   └── MonsterRaid.js       # 몬스터 레이드 로직
├── config/
│   └── config.js            # 모든 설정값
└── utils/
    ├── TerminalUI.js        # 터미널 UI 렌더링
    ├── logger.js            # 로그 파일 저장
    └── helpers.js           # 유틸 함수
```

---

## ⚙️ 주요 설정값 (config.js)

| 설정 | 값 | 설명 |
|:---|:---|:---|
| `TIMING.MINE_COOLDOWN` | 300초 | 채굴 기본 쿨타임 |
| `TIMING.MINE_EXTRA.MAX` | 200초 | 추가 랜덤 딜레이 (총 300~500초) |
| `TIMING.RAID_SKIP_CHANCE` | 10% | 레이드 스킵 확률 |
| `IDLE_BEHAVIOR.CHANCES.PAGE_VISIT` | 25% | 랜덤 페이지 방문 확률 |
| `IDLE_BEHAVIOR.CHANCES.MOUSE_MOVE` | 30% | 마우스 이동 확률 |
| `GOALS.DAILY_MINING_COUNT` | 60회 | 하루 채굴 목표 |

---

## 🐛 알려진 버그/이슈

### 1. UI 대기시간 불일치 (미해결)

- **증상**: 로그에 `대기 시작: 6분 14초`인데 UI에 4분 50초 표시
- **원인 추정**: TerminalUI의 endTime 계산 또는 갱신 문제
- **파일**: `src/utils/TerminalUI.js`
- **우선순위**: 중간

### 2. 페이지 방문 후 현재 위치 불명확

- **증상**: 랜덤 페이지에 머물러 있을 때 레이드 체크가 가능한지 불명확
- **영향**: 레이드 시간에 체크 못할 수 있음
- **해결 방안**: 레이드 체크 전에 별도 페이지 이동 없이 시간만 체크하도록 수정 필요

---

## 📝 다음 세션에서 해야 할 작업

### 우선순위 높음

1. **UI 대기시간 버그 수정**
   - `TerminalUI.js`의 `updateWait()` 함수 확인
   - endTime 계산 로직 검증

2. **테스트 실행 및 로그 확인**

   ```bash
   node auto-run.js
   ```

   - 광산 복귀 로그 없어야 함
   - 레이드 스킵 후 같은 시간대 재체크 없어야 함
   - 대기시간 정확하게 흘러야 함

### 우선순위 중간

3. **레이드 체크 로직 개선**
   - 현재: 1분 chunk 끝날 때마다 체크
   - 개선: 레이드 시간(10~20분, 40~50분)이 아니면 체크 스킵

2. **인간처럼 보이기 추가 기능**
   - 새벽 시간(0~7시) 비활성화
   - 하루 중 랜덤 휴식 시간

### 우선순위 낮음

5. **코드 리팩토링**
   - IdleBehavior와 Orchestrator의 광산 복귀 로직 완전 제거 확인
   - page 참조 갱신 로직 개선 (BrowserEngine.getPage() 활용)

---

## 🔧 핵심 함수 설명

### Orchestrator.js

```javascript
// 메인 루프
start() → while(isRunning) {
    _tryMining()      // 광산 이동 → 채굴 → 대기
    or _doAlternativeActions()  // 광산 없을 때
}

// 채굴 시도
_tryMining() {
    autoNavigateToAliveMine()  // 광산 이동
    mineOnce()                 // 채굴 버튼 클릭
    _waitWithUIUpdate()        // 대기 (1분 단위로 IdleBehavior.idle() 호출)
}

// 대기 중 행동
_waitWithUIUpdate(waitTime) {
    while (Date.now() < endTime) {
        idleBehavior.idle(60초)  // 마우스, 스크롤, 페이지 방문
        if (isRaidTime()) attackOnce()  // 레이드 체크
    }
}
```

### MonsterRaid.js

```javascript
// 레이드 시간 체크
isRaidTime() {
    // 분이 10~19 또는 40~49면 true
    // 단, lastAttackedRaidSlot이 현재 slot이면 false (이미 공격함)
}

// 레이드 공격
attackOnce() {
    findActiveRaid()           // 살아있는 레이드 찾기
    // URL 또는 캡차로 이미 공격 확인 → _markRaidSlotAttacked() 호출
    // 공격 버튼 클릭 → 보상 파싱
}
```

### IdleBehavior.js

```javascript
// 대기 중 행동
idle(duration) {
    while (isActive && elapsed < duration) {
        랜덤 선택: 마우스 이동 / 스크롤 / 페이지 방문 / 휴식
    }
}

// 랜덤 페이지 방문 (수정됨!)
_visitRandomPage() {
    page.goto(randomPage)
    sleep(stayTime)
    // 광산 복귀 제거됨! - 그냥 대기 상태로 남음
}
```

---

## 📂 로그 파일 위치

- 로그: `docs/YYYY-MM-DD.log`
- 쿠키: `data/cookies.json`
- 설정: `src/config/config.js`

---

## 🧪 테스트 체크리스트

- [ ] `node auto-run.js` 실행
- [ ] 채굴 성공 확인 (1회 이상)
- [ ] 레이드 시간에 레이드 체크 확인
- [ ] 레이드 스킵 후 재체크 안함 확인
- [ ] 광산 복귀 로그 없음 확인
- [ ] UI 대기시간 정확성 확인

---

## 💬 사용자 메모

- 사용자는 C/Linux 백그라운드, 20년 갭 후 복귀
- npm, git 등 기본 설명 필요
- 항상 한국어로 응답 (코드 주석 포함)
- 작업 완료 후 다음 작업 제안 금지 (IDLE_MODE)

---

> **다음 세션 시작 시**: 이 문서를 읽고 `node auto-run.js`로 테스트 먼저 실행하세요!
