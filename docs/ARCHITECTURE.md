# 🔄 Stealth-Clicker 동작 흐름도

> **작성일**: 2026-01-04  
> **버전**: 리팩토링 후 (Scheduler 기반)

---

## 📊 전체 흐름 (Mermaid)

```mermaid
flowchart TD
    START[🚀 auto-run.js 시작] --> BROWSER[브라우저 실행]
    BROWSER --> COOKIE[쿠키 복원]
    COOKIE --> GOTO[뉴토끼 접속]
    GOTO --> LOGIN{로그인 상태?}
    LOGIN -->|NO| DO_LOGIN[자동 로그인]
    LOGIN -->|YES| INIT[Scheduler 초기화]
    DO_LOGIN --> INIT
    
    INIT --> LOOP[📍 메인 루프 시작]
    
    subgraph TICK ["_tick() - 매 1초 실행"]
        LOOP --> CHECK_MINE{채굴 시간?}
        CHECK_MINE -->|YES| DO_MINE[⛏️ 채굴 수행]
        CHECK_MINE -->|NO| CHECK_RAID{레이드 시간?}
        
        CHECK_RAID -->|YES| DO_RAID[⚔️ 레이드 공격]
        CHECK_RAID -->|NO| CHECK_DL{다운로드 가능?}
        
        CHECK_DL -->|YES| DO_DL[📥 다운로드]
        CHECK_DL -->|NO| CHECK_RANDOM{랜덤 방문?}
        
        CHECK_RANDOM -->|YES 2%| DO_RANDOM[🔀 랜덤 페이지]
        CHECK_RANDOM -->|NO| UPDATE_UI[UI 갱신]
        
        DO_MINE --> UPDATE_UI
        DO_RAID --> UPDATE_UI
        DO_DL --> UPDATE_UI
        DO_RANDOM --> UPDATE_UI
    end
    
    UPDATE_UI --> SLEEP[sleep 1초]
    SLEEP --> LOOP
```

---

## 🕐 시간 기반 트리거

```
현재 시각: 19:40:30

[채굴 체크]
nextMineTime = 19:38:00 (다음 채굴 예정)
now >= nextMineTime? → YES → 채굴!
                    → nextMineTime = now + 300~420초

[레이드 체크]
현재 분: 40분
40분 >= 40 && 40분 < 50? → YES (레이드 시간!)
lastRaidSlot == "19:40"? → NO → 공격!
                        → lastRaidSlot = "19:40"

[다운로드 체크]
FEATURES.DOWNLOAD == false → 스킵
(true면) nextDownloadTime <= now → 다운로드
```

---

## ⛏️ 채굴 상세 흐름

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant M as MineGame
    participant H as Human
    participant P as Page
    
    S->>M: mine()
    M->>H: goto("/mine")
    H->>P: page.goto()
    H->>H: wait(2~4초)
    H->>H: checkCloudflare()
    
    Note over H,P: CF 감지 시 15~20초 대기 또는 체크박스 클릭
    
    M->>M: 살아있는 광산 찾기
    M->>H: goto(광산URL)
    H->>P: page.goto()
    
    M->>H: click(배거288)
    H->>P: scrollIntoView()
    H->>H: wait(0.3~0.6초)
    H->>P: mouse.move() + click()
    
    M->>H: click(채굴버튼)
    H->>P: mouse.click()
    
    Note over M,P: alert 핸들러가 결과 저장
    
    M->>M: wait(3~5초)
    M->>M: parseResult()
    M-->>S: {success: true, reward: 184}
    
    S->>S: nextMineTime = now + 300~420초
    S->>S: stats.mineReward += 184
```

---

## ⚔️ 레이드 상세 흐름

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant R as MonsterRaid
    participant H as Human
    participant P as Page
    
    S->>S: _isRaidTime()? → 분이 10~19 또는 40~49
    S->>S: slot != lastRaidSlot?
    
    S->>R: attack()
    R->>H: goto("/monster")
    R->>R: 살아있는 레이드 찾기
    
    alt 캡차 있음
        R-->>S: {success: false} (이미 공격함)
    end
    
    R->>H: click(공격타입 랜덤)
    R->>H: click(공격버튼)
    
    Note over R,P: dialog 핸들러가 alert 저장
    
    R->>H: wait(최대 10초)
    R->>R: _acceptDialog()
    R->>R: _parseReward()
    
    R-->>S: {success: true, reward: 10}
    S->>S: lastRaidSlot = "19:40"
```

---

## 📥 다운로드 흐름 (현재 더미)

```
1. FEATURES.DOWNLOAD = false → 스킵
2. (구현 예정)
   - 게시판 목록 이동
   - 플로피 아이콘 있는 게시물 찾기
   - 게시물 진입
   - 첨부파일 다운로드
   - 진행 상황 저장
3. 현재: sleep(180초) 더미 대기
```

---

## 🖥️ UI 갱신 흐름

```javascript
// 매 1초마다 Scheduler._tick() 끝에서 호출
_updateUIRemaining() {
    const remaining = Math.max(0, this.nextMineTime - Date.now());
    this.ui.updateRemaining(remaining);
}

// TerminalUI 내부
render() {
    // remaining이 자동으로 1초씩 감소 (setInterval)
    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    waitStr = `${min}분 ${sec}초`;
}
```

---

## 🔐 클라우드플레어 처리

```mermaid
flowchart TD
    GOTO[페이지 이동] --> CHECK{CF 페이지?}
    
    CHECK -->|NO| DONE[정상 진행]
    CHECK -->|YES| TYPE{CF 타입?}
    
    TYPE -->|auto| WAIT_AUTO[15~20초 대기]
    TYPE -->|checkbox| CLICK_CB[좌표 클릭 253,289]
    
    WAIT_AUTO --> VERIFY{통과?}
    CLICK_CB --> WAIT_CB[8~12초 대기]
    WAIT_CB --> VERIFY
    
    VERIFY -->|YES| DONE
    VERIFY -->|NO| FAIL[실패 로그]
```

**CF 감지 조건:**

```javascript
// 페이지 제목으로 감지
title.includes('Just a moment') ||
title.includes('Checking your browser')
```

---

## 📁 파일별 역할

| 파일 | 역할 | 주요 함수 |
|:---|:---|:---|
| `Scheduler.js` | 메인 루프, 시간 관리 | `run()`, `_tick()` |
| `MineGame.js` | 광산 채굴 | `mine()` |
| `MonsterRaid.js` | 레이드 공격 | `attack()` |
| `Human.js` | 인간 동작 | `wait()`, `click()`, `goto()` |
| `TerminalUI.js` | 터미널 출력 | `render()`, `updateRemaining()` |
| `BrowserEngine.js` | 브라우저 제어 | `launch()`, `goto()` |

---

## ⏰ 타임라인 예시 (5분)

```
19:38:00  ⛏️ 채굴 버튼 클릭
19:38:05  ✅ 채굴 성공 +184 MP
19:38:05  → nextMineTime = 19:45:30 (7분 25초 후)
19:38:06  ⏳ 대기 중 (UI: 7분 24초)
19:38:07  ⏳ 대기 중 (UI: 7분 23초)
...
19:40:00  ⚔️ 레이드 시간! (40분대)
19:40:05  → 레이드 페이지 이동
19:40:15  ✅ 레이드 완료 +10 포인트
19:40:16  ⏳ 대기 중 (UI: 5분 14초)
...
19:42:30  🔀 랜덤 페이지 방문 (2% 확률)
19:42:50  ⏳ 대기 중 (UI: 2분 40초)
...
19:45:30  ⛏️ 다음 채굴!
```

---

## 🔧 설정값 요약

| 설정 | 값 | 설명 |
|:---|:---|:---|
| 채굴 쿨타임 | 300초 | 서버 기본값 |
| 채굴 추가 랜덤 | 0~120초 | 인간처럼 보이기 |
| 레이드 시간대 | 10~19분, 40~49분 | 매 시간 2번 |
| 랜덤 방문 확률 | 2% | 매 초 체크 |
| CF 자동 대기 | 15~20초 | 체크박스 없을 때 |
| CF 체크박스 좌표 | (253, 289) | 사용자 측정값 |
