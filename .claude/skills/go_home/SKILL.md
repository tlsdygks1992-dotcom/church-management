---
name: go_home
description: 퇴근 전 일일 개발 보고서 생성 - git 변경사항, 문서 업데이트, GitHub 이슈 연동
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

<go-home-skill>

# 퇴근 전 일일 개발 보고서 생성 스킬

이 스킬은 퇴근 전에 오늘 하루의 개발 작업을 정리하고 보고서를 생성합니다.

## 실행 단계

### Step 1: 데이터 수집
다음 명령어들을 **병렬로** 실행하여 데이터를 수집하세요:

1. **오늘 커밋 목록**:
   ```bash
   git log --oneline --since="midnight"
   ```

2. **변경된 파일 상태**:
   ```bash
   git status --short
   ```

3. **변경 통계** (staged + unstaged):
   ```bash
   git diff --stat HEAD
   ```

4. **세션 노트 읽기**:
   - 파일: `.claude/session-notes.md`

5. **GitHub 이슈 목록**:
   ```bash
   gh issue list --state open --limit 10
   ```

### Step 2: docs/status/ 문서 분석 및 업데이트

변경된 파일을 분석하여 관련 문서를 업데이트하세요:

| 변경 영역 | 대상 문서 | 업데이트 내용 |
|-----------|-----------|---------------|
| `src/components/` | `docs/status/05-components.md` | 새 컴포넌트, Props 변경 |
| `src/app/api/`, `src/lib/` | `docs/status/06-api.md` | API 라우트, 유틸리티 함수 |
| DB 마이그레이션, `migrations/` | `docs/status/04-database.md` | 테이블, 컬럼, Enum 변경 |
| 새 기능 추가 | `docs/status/02-features.md` | 기능 목록 업데이트 |
| 인증/결재 로직 변경 | `docs/status/03-workflow.md` | 워크플로우 다이어그램 |
| 전체 구조 변경 | `docs/status/01-system-overview.md` | 아키텍처, 폴더 구조 |

**주의**: 실제로 변경된 영역만 해당 문서를 업데이트하세요. 변경이 없으면 건너뜁니다.

### Step 3: 일일 보고서 생성

**경로**: `docs/REPORT/YYYY-MM-DD.md` (오늘 날짜 사용)

다음 템플릿을 사용하여 보고서를 생성하세요:

```markdown
# 일일 개발 보고서 - YYYY-MM-DD

## 📊 오늘의 Git 활동

### 커밋 목록
- [해시] 커밋 메시지
- ...

### 변경 통계
- N files changed, N insertions(+), N deletions(-)

## 📁 변경된 파일

| 파일 | 상태 | 설명 |
|------|------|------|
| path/to/file | M/A/D | 간단한 설명 |

## ✅ 완료한 작업

1. 작업 설명
   - 관련 파일: `src/...`
   - 세부사항

## 📝 업데이트된 문서

| 문서 | 변경 내용 |
|------|-----------|
| docs/status/XX.md | 변경 요약 |

## 🔗 관련 GitHub 이슈

| 이슈 | 제목 | 상태 |
|------|------|------|
| #N | 이슈 제목 | open/closed |

## 🔜 내일 할 일 (자동 제안)

진행 중인 작업과 세션 노트를 기반으로 다음 작업을 제안하세요:

- [ ] 제안1: 설명
- [ ] 제안2: 설명
- [ ] 제안3: 설명

## 💬 메모

- 오늘 작업 중 발견한 이슈나 참고사항
- 다음 세션에서 주의할 점
```

### Step 4: 세션 노트 업데이트

`.claude/session-notes.md` 파일 **최상단**에 오늘 작업 내역을 추가하세요:

```markdown
## 작업 내역 (YYYY-MM-DD)

### 완료된 작업
1. [기능명] - 설명
   - 관련 파일: `src/...`

### 진행 중 / 미완료
- [작업명]: 현재 상태, 중단 지점

### 다음 작업
- [ ] 작업1
- [ ] 작업2

### 참고사항
- 중요한 결정사항이나 주의점

---
```

## 완료 메시지

모든 작업이 완료되면 다음을 사용자에게 보고하세요:

1. 생성된 보고서 경로
2. 업데이트된 문서 목록
3. 내일 할 일 요약
4. GitHub 이슈 현황

</go-home-skill>
