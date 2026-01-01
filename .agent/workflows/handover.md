---
description: 세션 핸드오버 문서 생성 - 다음 AI 세션에 맥락 전달
---

# 🔄 HANDOVER (긴급 저장용)

> **목적**: 먹통 대비 - 한 번의 명령으로 현재 상황 빠르게 저장
> **트리거**: `/handover` 또는 스텝 300 도달

---

## 1. 자동 정보 수집 (복붙용)

```bash
# 한 번에 실행
git status --short && echo "---" && git log -5 --oneline && echo "---" && git diff --stat HEAD~1
```

// turbo

---

## 2. HANDOVER.md 작성 (덮어쓰기)

`docs/HANDOVER.md` 파일을 아래 템플릿으로 **즉시 생성**:

```markdown
# 🔄 세션 핸드오버
> 생성일: [현재 시간]

## 📌 다음 AI: 이것만 읽어!

1. `.agent/constitution.md` - 핵심 규칙
2. `docs/ISSUES.md` - 이슈 목록
3. 아래 "현재 작업" 섹션

---

## 🔥 현재 작업 (가장 중요!)

**진행 중**: [한 줄로 작성 - 예: MineGame.js getWaitTime() 수정 중]
**수정 중인 파일**: [파일 경로]
**이슈 번호**: #N

### 구체적으로 뭘 하고 있었나
- [상세 설명]

### 다음에 할 것
- [ ] [체크리스트]

---

## 📂 수정된 파일 (git status)

[git status 결과]

## 📜 최근 커밋 (git log)

[git log 결과]

## 🐛 열린 이슈

| # | 제목 |
|---|---|
| N | 제목 |
```

---

## 3. 완료

> [!IMPORTANT]
> 핸드오버 완료 후 `notify_user`로 알림:
> "📋 핸드오버 완료! docs/HANDOVER.md 확인하세요."

---

## ⚡ 빠른 버전 (먹통 임박 시)

시간 없으면 **이것만**:

```markdown
# 🔄 긴급 핸드오버
> [시간]

## 현재 작업
[파일명] - [하고 있던 것] (#이슈번호)

## 다음에 할 것
- [ ] [할 일]
```
