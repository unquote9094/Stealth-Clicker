# 🕵️ Project: Stealth Auto-Clicker 기획서

## 1. 프로젝트 개요
*   **목표**: 웹사이트의 봇 감지 시스템(Cloudflare, Captcha 등)을 우회하여 "단순 반복 클릭/입력" 작업을 수행하는 자동화 봇 개발.
*   **핵심 철학**: "허접하지 않게" - 기계적인 매크로가 아닌, **실제 사람처럼 행동하는 봇** 구현.
*   **타겟 환경**: Node.js (Windows)

## 2. 기술 스택 (The Stealth Stack)
| 구분 | 기술/라이브러리 | 선정 이유 |
|:---|:---|:---|
| **Core** | **Puppeteer** (Chrome) | 가장 강력하고 안정적인 브라우저 제어 도구. |
| **Stealth** | **puppeteer-extra-plugin-stealth** | 브라우저의 '봇 흔적'을 자동으로 제거 (필수). |
| **Movement** | **ghost-cursor** | 마우스 이동을 베지어 곡선과 랜덤 속도로 '인간화'. |
| **Language** | **JavaScript (Node.js)** | 비동기 처리에 최적화, 방대한 생태계. |

## 3. 감지 회피 전략 (Anti-Detection)

### 3.1. 브라우저 레벨 (Static Fingerprint)
*   `navigator.webdriver` 숨김 (기본)
*   User-Agent 랜덤화 (PC/Chrome 버전 등)
*   화면 크기(Viewport) 랜덤화 (1920x1080 고정 X)
*   Canvas/WebGL Fingerprint 노이즈 추가

### 3.2. 행동 레벨 (Behavioral Biometrics)
*   **마우스 이동**:
    *   직선 이동 금지 🚫
    *   베지어 곡선 이동 (Overshoot: 목표를 살짝 지났다가 돌아오기)
    *   가변 속도 (출발/도착 시 감속)
*   **클릭**:
    *   좌표 랜덤화: 버튼 정중앙 [(50, 50)](file:///g:/Hitomi_Downloader/hitomi_downloaded_booktoki/@DEVz/BookToKi_v2.0/src/core/downloader.js#77-91) 클릭 금지. [(50±w, 50±h)](file:///g:/Hitomi_Downloader/hitomi_downloaded_booktoki/@DEVz/BookToKi_v2.0/src/core/downloader.js#77-91) 범위 내 랜덤 클릭.
    *   딜레이: 클릭 전/후 미세한 멈춤 (`100ms ~ 500ms` 랜덤)
*   **타이밍**:
    *   모든 작업 간격에 `Random Jitter` 추가 (예: 10초 대기 -> 9.8초 ~ 11.2초 대기)

## 4. 프로젝트 구조 (예상)

```
Stealth-Clicker/
├── src/
│   ├── core/
│   │   ├── BrowserEngine.js    # 퍼피티어 실행 및 스텔스 설정
│   │   └── ActionManager.js    # 클릭, 입력 등 행동 단위 모듈 (Human-like)
│   ├── config/
│   │   └── targets.js          # 타겟 사이트 URL 및 선택자 정보
│   └── utils/
│       └── randomizer.js       # 랜덤 딜레이/좌표 생성기
├── index.js                    # 메인 실행 파일
└── package.json                # 의존성 관리
```

## 5. 단계별 구현 계획
1.  **Phase 1: 기반 마련**
    *   Puppeteer + Stealth Plugin 환경 구축
    *   북토끼 등 테스트 사이트 접속하여 `Are you robot?` 통과 여부 확인
2.  **Phase 2: 행동 모듈화**
    *   `humanClick(selector)` 함수 구현 (Ghost Cursor 연동)
    *   `humanType(selector, text)` 함수 구현 (타자 속도 랜덤화)
3.  **Phase 3: 실전 투입**
    *   타겟 사이트(게임/게시판) 로직 구현
    *   반복 수행 및 로그 모니터링

## 6. 예상 난이도
*   **환경 설정**: ⭐ (아주 쉬움, npm install 끝)
*   **기본 동작**: ⭐⭐ (API가 직관적이라 쉬움)
*   **디테일 튜닝**: ⭐⭐⭐ (감지 안 되게 딜레이 조절하고 예외 처리하는 게 일)
    *   *전문가의 팁: 코딩보다 "적절한 랜덤 값" 찾는 게 더 중요함.*
