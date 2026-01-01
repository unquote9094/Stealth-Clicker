# 🔍 사이트 분석 문서

> **분석일**: 2026-01-02
> **분석 대상**: 뉴토끼(newtoki), 북토끼(booktoki)

---

## 📋 개요

| 사이트 | 도메인 패턴 | 용도 |
|:---|:---|:---|
| **뉴토끼** | `newtoki*.com` | 웹툰 + 게임 (포인트 광산, 몬스터 레이드) |
| **북토끼** | `booktoki*.com` | 웹소설 자료실 + 소설 게시판 |

> **중요**: 계정 1개로 모든 x토끼 사이트 공유!

---

## 🎮 뉴토끼 - 포인트 광산 (Mine)

### URL 패턴

```
광산 목록: /mine
광산 상세: /mine/{게시물ID}
예시: https://newtoki469.com/mine/207285818
```

### 핵심 셀렉터 (상세 페이지)

| 요소 | 셀렉터 | 설명 |
|:---|:---|:---|
| 채굴 폼 | `#fviewcomment` | 폼 제출 |
| 채굴 버튼 | `button.raid_mining#btn_submit` | 클릭 대상 |
| 장비 라디오 | `input[name="wr_player_mining_tool"]` | 도구 선택 |
| 게시물 ID | `input[name="wr_id"]` | 광산 ID |
| 보드 테이블 | `input[name="bo_table"]` = `mine` | 고정값 |
| 채굴 결과 | `.media-content` | 댓글 형태로 표시 |

### 광산 목록 페이지 셀렉터 (/mine)

| 요소 | 셀렉터 | 설명 |
|:---|:---|:---|
| 목록 컨테이너 | `ul.list-body` | 광산 리스트 |
| 각 광산 | `li.list-item` | 개별 광산 행 |
| 광산 링크 | `.wr-subject a.item-subject` | 클릭시 상세 이동 |
| 상태 이미지 | `.wr-thumb img` | 열린/폐광 구분 |
| 진행도 바 | `.wr-progress .progress-bar-exp` | width로 진행도 |
| 시작일 | `.wr-date:nth-of-type(1)` | 시작 날짜 |
| 종료일 | `.wr-date:nth-of-type(2)` | 비어있으면 살아있음 |

### 살아있는 광산 vs 폐광 구분

| 상태 | 이미지 | 진행도 | 종료일 |
|:---|:---|:---:|:---|
| **살아있음** ✅ | `mine_coal.png` | 0~99% | **비어있음** |
| **폐광** ❌ | `mine_closed.png` | 0% | 날짜 있음 |

### 채굴 장비 목록

| ID | 장비명 | 비용(MP) | 딜레이(초) | 라디오 셀렉터 |
|:---:|:---|---:|---:|:---|
| 1 | 맨손 | 0 | 20 | `#wr_player_mining_tool_1` |
| 2 | 곡괭이 | 30 | 25 | `#wr_player_mining_tool_2` |
| 3 | 로터리드릴 | 50 | 30 | `#wr_player_mining_tool_3` |
| 4 | 포크레인 | 100 | 40 | `#wr_player_mining_tool_4` |
| 5 | 다이너마이트 | 500 | 150 | `#wr_player_mining_tool_5` |
| 6 | **배거288** | 1000 | **300** | `#wr_player_mining_tool_6` |

> **권장**: 배거288(300초) 사용 → 클릭 횟수 최소화

### 채굴 프로세스

```javascript
// 1. 장비 선택
document.getElementById('wr_player_mining_tool_6').click();

// 2. 채굴 버튼 클릭 (또는 폼 제출)
document.querySelector('button.raid_mining').click();
// 또는
apms_comment('viewcomment');
```

### JavaScript 함수

| 함수 | 용도 |
|:---|:---|
| `fviewcomment_submit(f)` | 폼 제출 검증 |
| `set_comment_token(f)` | CSRF 토큰 설정 |
| `mining_timer_run()` | 딜레이 타이머 |
| `apms_comment(action)` | 댓글/채굴 액션 |

### 딜레이 관리

```javascript
// 전역 변수
var mining_date = new Date();  // 다음 채굴 가능 시간
var remain_time = 0;           // 남은 시간(초)

// 딜레이 체크
var diff_time = Math.ceil((mining_date.getTime() - now_date.getTime()) / 1000);
if (diff_time > 0) {
    // 아직 채굴 불가
}
```

---

## ⚔️ 뉴토끼 - 몬스터 레이드 (Monster)

### URL 패턴

```
레이드 목록: /monster
레이드 상세: /monster/{게시물ID}
```

### 특징

| 항목 | 내용 |
|:---|:---|
| 보상 | **XP** (경험치, MP 아님!) |
| 용도 | 레벨업용 (레벨 10 필요) |
| 캡차 | **2회차 공격부터 숫자 캡차** |
| 시간 | 매시각 10분, 40분에 레이드 시작 |

### 캡차 우회 전략

> 첫 번째 공격만 하면 캡차 없음!
> → 10분/40분에 1회씩만 공격 후 이탈

---

## 📚 북토끼 - 소설 게시판 (Book Free)

### URL 패턴

```
게시판 목록: /book_free
게시판 페이지: /book_free?page={페이지번호}
게시물 상세: /book_free/{게시물ID}
예시: https://booktoki469.com/book_free/10156786
```

### 핵심 셀렉터

| 요소 | 셀렉터 | 설명 |
|:---|:---|:---|
| 게시물 리스트 | `li.list-item` | 각 게시물 행 |
| 제목 링크 | `a.item-subject` | 클릭하면 상세 페이지 |
| **💾 파일 아이콘** | `.wr-icon.wr-file` | **다운로드 대상 표시!** |
| 게시물 번호 | `.wr-num` | 게시물 ID |
| 카테고리 | `.tack-icon` | 공유, 요청, 정보 등 |
| 조회수 | `.wr-hit` | 조회 횟수 |
| 다운로드수 | `.wr-down` | 다운로드 횟수 |
| 추천수 | `.wr-good` | 좋아요 수 |

### 카테고리 (분류)

| 카테고리 | CSS 클래스 | URL 파라미터 |
|:---|:---|:---|
| 공유 | `.bg-orangered` | `?sca=공유` |
| 요청 | `.bg-green` | `?sca=요청` |
| 정보 | - | `?sca=정보` |
| 질문 | - | `?sca=질문` |
| 후기 | - | `?sca=후기` |

### 레벨 제한

| 레벨 | 권한 |
|:---|:---|
| 10 미만 | 파일 첨부 게시물 열람 불가 |
| 10 이상 | 모든 게시물 열람 가능 |

#### 권한 없는 게시물 표시

```html
<a href="javascript:alert('권한이 없는 게시물입니다.');" class="item-subject">
    권한이 없는 게시물입니다. 
    <span class="wr-icon wr-file"></span>  <!-- 파일 아이콘은 보임! -->
</a>
```

#### 권한 있는 게시물 표시

```html
<a href="https://booktoki469.com/book_free/10156786" class="item-subject">
    소설 제목이 여기에 표시됨
    <span class="wr-icon wr-file"></span>
</a>
```

### 다운로드 대상 찾기

```javascript
// 파일 첨부된 게시물만 선택
const postsWithFiles = document.querySelectorAll('li.list-item:has(.wr-file)');

// 각 게시물의 링크 추출
postsWithFiles.forEach(post => {
    const link = post.querySelector('a.item-subject');
    const href = link?.getAttribute('href');
    
    // javascript: 로 시작하면 권한 없음
    if (href && !href.startsWith('javascript:')) {
        console.log('다운로드 가능:', href);
    }
});
```

### 페이지네이션

- 총 게시물: **48,755개** (2026-01-02 기준)
- 페이지당: 약 20개
- 오래된 것부터: 마지막 페이지부터 역순 접근

---

## 🔐 보안/탐지 분석

### 클라이언트 측 봇 탐지

| 검색 항목 | 결과 |
|:---|:---:|
| `webdriver` 체크 | ❌ 없음 |
| `navigator` 속성 체크 | ❌ 없음 |
| `automation` 감지 | ❌ 없음 |
| `fingerprint` 수집 | ❌ 없음 |
| `reCAPTCHA` | ❌ 없음 |
| 마우스 이벤트 검증 | ❌ 없음 |

### 서버 측 보안

| 항목 | 내용 |
|:---|:---|
| CSRF 토큰 | `set_comment_token()` 함수로 설정 |
| 세션 | Cloudflare CDN 사용 (약 3.5시간) |
| Rate Limit | 다운로드 과다 시 403 밴 (약 1시간) |

### 외부 스크립트

| 스크립트 | 용도 | 봇 탐지? |
|:---|:---|:---:|
| Cloudflare Insights | 성능 모니터링 | ❌ |
| Histats | 방문자 통계 | ❌ |

---

## 📦 사용되는 라이브러리

| 라이브러리 | 버전 | 용도 |
|:---|:---|:---|
| jQuery | 1.11.3 | DOM 조작 |
| Bootstrap | 3.x | UI 컴포넌트 |
| jQuery UI | - | 위젯 |
| Font Awesome | - | 아이콘 |

---

## ⚠️ 주의사항

> **경고**: 오토마우스나 매크로 사용시 경고없이 계정 차단됩니다.

### 권장 사항

1. **딜레이 준수**: 각 도구별 쿨다운 시간 지키기
2. **인간적 패턴**: ghost-cursor로 자연스러운 마우스 이동
3. **세션 관리**: 3시간 전 자동 새로고침
4. **다운로드 간격**: 최소 30초 이상
