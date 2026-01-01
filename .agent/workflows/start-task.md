---
description: 새로운 작업 시작 시 GitHub 이슈 생성
---

# 📌 START-TASK

> **목적**: 작업 시작 전 GitHub 이슈 생성 → 나중에 추적 가능

---

## 언제 사용?

- 새로운 기능 개발 시작할 때
- 버그 수정 시작할 때
- 기존 코드 개선할 때

## 실행 방법

```bash
npm run start-task -- <type> "제목"
```

### 타입별 예시

| Type | 설명 | 예시 |
|:---|:---|:---|
| `bug` | 버그 수정 | `npm run start-task -- bug "첫 클릭 안됨"` |
| `feat` | 새 기능 | `npm run start-task -- feat "파일 다운로드"` |
| `enhance` | 개선 | `npm run start-task -- enhance "대기시간 랜덤화"` |

---

## 이슈 작성 시 필수 내용

> [!IMPORTANT]
> 나중에 봐도, 다른 사람이 봐도 이해할 수 있게!

### 1. 한줄 요약

```
❌ "버그 수정" (어떤 버그?)
✅ "첫 페이지 로드 후 채굴 버튼 클릭이 안 됨"
```

### 2. 상세 설명

```markdown
## 문제
- 광산 페이지 최초 진입 시 첫 클릭 무반응
- 두 번째 클릭부터 정상 동작

## 원인 추정
- 페이지 로드 후 버튼이 화면에 안 보임
- ghost-cursor는 화면에 보이는 요소만 클릭 가능

## 해결 방안
- scrollIntoView() 추가
- 로드 후 대기 시간 추가
```

### 3. 관련 파일

```markdown
- `src/actions/MineGame.js` - 채굴 로직
- `src/core/HumanMouse.js` - 마우스 클릭
```

### 4. 체크리스트

```markdown
- [ ] 원인 분석
- [ ] 코드 수정
- [ ] 테스트
```

---

## 자동으로 되는 것

1. GitHub Issue 생성 (템플릿 적용)
2. `docs/ISSUES.md` 자동 동기화
3. 이슈 번호 발급 (#N)

---

## 작업 완료 후

```bash
npm run finish -- "fix: 첫 클릭 버그 수정 (#N) [MOD]"
```

> `#N`은 이슈 번호로 교체!
