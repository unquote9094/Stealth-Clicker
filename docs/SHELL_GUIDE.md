# 🖥️ 에이전트/터미널 멈춤 방지 가이드

이 문서는 Windows PowerShell 환경에서 **AI 에이전트가 명령어 실행 중 멈추는 현상**의 해결책을 다룹니다.

---

## 🛑 문제 상황

- **증상**: `gh issue list`, `git log`, `npm install` 등 실행 시 멈춤
- **원인**: 페이징(Paging) + 대화형 모드(Interactive Mode)

---

## ✅ 해결 방법

### 환경변수 설정 (PowerShell)

```powershell
# 영구 설정
[Environment]::SetEnvironmentVariable("PAGER", "cat", "User")
[Environment]::SetEnvironmentVariable("GH_PAGER", $null, "User")
[Environment]::SetEnvironmentVariable("GIT_PAGER", "cat", "User")
[Environment]::SetEnvironmentVariable("CI", "true", "User")

# 현재 세션에도 적용
$env:PAGER = "cat"
$env:GH_PAGER = $null
$env:GIT_PAGER = "cat"
$env:CI = "true"
```

---

## 🤖 AI 에이전트 전용 규칙

> [!CAUTION]
> **gh 명령 실행 후 `command_status` 확인 스킵!**

| 명령 | 권장 사항 |
|:---|:---|
| `gh issue list` | 짧은 대기 (5초 이내) |
| `gh issue close` | **확인 스킵** |
| `gh issue comment` | **확인 스킵** |
| `gh pr create` | **확인 스킵** |
| `git push` | 5초 이내 대기 후 진행 |

---

> **문서 버전**: 2026-01-01
