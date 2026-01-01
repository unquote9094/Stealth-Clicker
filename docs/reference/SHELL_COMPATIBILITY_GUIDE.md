# 🖥️ 에이전트/터미널 멈춤 현상 해결 가이드 (Shell Compatibility Guide)

이 문서는 Windows PowerShell 7 환경에서 **AI 에이전트가 명령어를 실행하다가 멈추거나(Deadlock), 타임아웃**이 발생하는 현상의 원인과 해결책을 다룹니다.

---

## 🛑 문제 상황 (The Problem)

- **증상**: `gh issue list`, `git log`, `npm install` 등의 멍령어를 실행하면 결과 화면이 나오다가 멈춥니다.
- **에이전트 반응**: "결과 확인 중...", "30초 대기 중..." 메시지만 반복하다가 결국 **"응답 없음"**으로 죽어버립니다.
- **특이사항**: 사용자가 직접 터미널에서 치면 잘 되는데, 에이전트가 할 때만 멈춥니다. PowerShell 5.1에서는 괜찮았는데 7.0+ 업그레이드 후 빈발합니다.

---

## 🔍 원인 분석 (Root Cause)

범인은 **"페이징(Paging)"**과 **"대화형 모드(Interactive Mode)"**입니다.

1. **페이징 (Paging)**
    - 결과값이 화면보다 길면, 윈도우는 자동으로 "일시정지"를 걸고 사용자가 스페이스바를 누르길 기다립니다. (예: `...더 보기`)
    - **에이전트는 스페이스바를 누를 손가락이 없습니다.** 그래서 무한 대기에 빠집니다.

2. **PowerShell 7의 변화**
    - 구버전(5.1)은 "사람이 아니네?"라고 판단하면 자동으로 페이징을 꺼줬습니다.
    - 신버전(7.x)은 더 강력한 기능을 제공하기 위해 외부 도구(`gh`, `git`)의 페이징 정책을 강제로 유지하는 경향이 있습니다.

3. **화려한 UI (Animation/Spinners)**
    - 최신 도구들은 진행바(Progress Bar), 스피너(뱅글뱅글 도는 것) 등을 보여줍니다. 이는 에이전트의 텍스트 인식기를 혼란스럽게 합니다.

---

## ⚠️ PowerShell 7.5+ 특수 문제 (Breaking Change)

> [!CAUTION]
> **PowerShell 7.5는 .NET 9 기반**으로, 빈 문자열(`""`) 처리 방식이 근본적으로 변경되었습니다!

### 기존 코드가 작동하지 않는 이유

| 버전 | `SetEnvironmentVariable("VAR", "", "User")` 동작 |
|:---|:---|
| PowerShell 7.4 이하 (.NET 8) | 변수 **삭제** |
| **PowerShell 7.5+ (.NET 9)** | 빈 문자열로 **설정** (삭제 아님!) |

### 진단 방법

```powershell
# 빈 문자열 vs 존재하지 않음 구분
$ghPager = [Environment]::GetEnvironmentVariable("GH_PAGER", "User")
if ($null -eq $ghPager) {
    Write-Host "GH_PAGER: 존재하지 않음 (정상)"
} elseif ($ghPager -eq "") {
    Write-Host "GH_PAGER: 빈 문자열로 설정됨 (문제!)"
} else {
    Write-Host "GH_PAGER: $ghPager"
}
```

---

## ✅ 해결 방법 (Solutions)

컴퓨터에게 **"나는 사람이 아니라 로봇(자동화 시스템)이다"**라고 선언하면 모든 문제가 해결됩니다.

### [방법 1] 환경변수 영구 설정 (PowerShell 7.5+ 호환)

> [!IMPORTANT]
> **`""` 대신 `$null`을 사용해야 변수가 삭제됩니다!**

```powershell
# ⭐ PowerShell 7.5+ 호환 버전
[Environment]::SetEnvironmentVariable("PAGER", "cat", "User")
[Environment]::SetEnvironmentVariable("GH_PAGER", $null, "User")   # "" 대신 $null!
[Environment]::SetEnvironmentVariable("GIT_PAGER", "cat", "User")
[Environment]::SetEnvironmentVariable("CI", "true", "User")

# 현재 세션에도 즉시 적용
$env:PAGER = "cat"
$env:GH_PAGER = $null
$env:GIT_PAGER = "cat"
$env:CI = "true"

Write-Host "✅ 설정 완료! 새 터미널을 열어주세요."
```

- **`PAGER=cat`**: "페이지 나누지 말고 고양이(cat)처럼 내용을 한 번에 토해내라"는 뜻입니다.
- **`GH_PAGER=$null`**: GitHub CLI 페이징 **완전 해제** (빈 문자열 아님!)
- **`CI=true`**: "Continuous Integration(서버 환경)"인 척 속이는 것입니다. 도구들이 얌전해집니다.

### [방법 2] 프로필 파일 생성 (PowerShell 전용)

환경변수가 싫다면, PowerShell이 켜질 때마다 실행되는 스크립트를 만들 수 있습니다.

```powershell
# 프로필 파일 열기
notepad $PROFILE

# 다음 내용 추가:
$env:PAGER = "cat"
$env:GH_PAGER = $null
$env:GIT_PAGER = "cat"
$env:CI = "true"
```

*(주의: OneDrive 사용 시 경로 문제로 작동하지 않을 수 있음)*

---

## 🧪 검증 방법 (Verification)

터미널을 재시작한 후, 아래 명령어를 쳤을 때 **멈추지 않고** 결과가 후루룩 다 지나가야 성공입니다.

```powershell
# 긴 결과 출력 테스트
gh issue list --state all --limit 100
```

> 중간에 `: (더보기)` 같은 게 뜨지 않고, 프롬프트가 바로 떨어지면 성공입니다!

---

## 📚 참고 자료

- [PowerShell GitHub Issue #24637](https://github.com/PowerShell/PowerShell/issues/24637): `$null` 전달 시 빈 문자열 변환 버그
- [PowerShell Discussion #24605](https://github.com/PowerShell/PowerShell/discussions/24605): .NET 9 breaking change 논의
- [PowerShell Issue #21186](https://github.com/PowerShell/PowerShell/issues/21186): 빈 환경변수 지원 기능

> **문서 업데이트**: 2025-12-30 (PowerShell 7.5+ 호환 수정)

---

## 🤖 AI 에이전트 전용 가이드

> [!CAUTION]
> **gh 명령 실행 후 `command_status` 확인 시 무한 대기 발생!**

### 문제 상황

```
gh issue close 40 --comment "완료"
    ↓
command_status 호출
    ↓
"Waiting for command completion (up to 60 seconds)..."
    ↓
무한 대기 → 세션 먹통!
```

### 해결책

**`gh` 명령 실행 후 `command_status` 확인을 스킵하고 바로 다음 작업으로 진행!**

```
# ❌ 잘못된 방법
gh issue close 40 → command_status(WaitDurationSeconds=60) → 멈춤!

# ✅ 올바른 방법
gh issue close 40 → 바로 다음 작업 진행 (확인 불필요)
```

### 적용 대상 명령

| 명령 | 권장 사항 |
|:---|:---|
| `gh issue list` | 짧은 대기 (5초 이내)만 |
| `gh issue close` | **확인 스킵** |
| `gh issue comment` | **확인 스킵** |
| `gh pr create` | **확인 스킵** |

### 대안: 간단한 명령 사용

```powershell
# 긴 코멘트 대신 짧은 코멘트
$env:GH_PAGER=''; gh issue close 40 --comment "완료"
```

> **문서 업데이트**: 2025-12-31 (AI 에이전트 gh 명령 가이드 추가)
