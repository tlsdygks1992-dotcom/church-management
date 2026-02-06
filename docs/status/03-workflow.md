# 워크플로우

## 1. 결재 워크플로우

### 결재 상태 흐름

```
┌────────┐     ┌───────────┐     ┌─────────────────────┐
│ draft  │ ──▶ │ submitted │ ──▶ │ coordinator_reviewed │
│ (초안) │     │ (제출됨)  │     │ (회장 협조)          │
└────────┘     └───────────┘     └─────────────────────┘
                                           │
                                           ▼
┌────────────────┐     ┌─────────────────────┐
│ final_approved │ ◀── │ manager_approved    │
│ (최종 승인)    │     │ (부장 결재)         │
└────────────────┘     └─────────────────────┘

      ┌─────────┐          ┌─────────────────────┐
      │rejected │ ◀─────── │ revision_requested  │
      │(반려)   │          │ (수정 요청)         │
      └─────────┘          └─────────────────────┘
```

### 상태별 설명

| 상태 | 설명 | 다음 액션 |
|------|------|----------|
| `draft` | 초안 - 작성 중 | 제출 |
| `submitted` | 제출됨 - 회장 협조 대기 | 협조/반려/수정요청 |
| `coordinator_reviewed` | 회장 협조 완료 - 부장 결재 대기 | 결재/반려/수정요청 |
| `manager_approved` | 부장 결재 완료 - 목사 확인 대기 | 확인/반려 |
| `final_approved` | 최종 승인 완료 | - |
| `rejected` | 반려됨 | 수정 후 재제출 |
| `revision_requested` | 수정 요청됨 | 수정 후 재제출 |

### 역할별 결재 권한

| 역할 | 권한 | 액션 |
|------|------|------|
| team_leader | 보고서 작성 | 작성, 제출, 수정 |
| president | 협조 | 협조, 반려, 수정요청 |
| accountant | 결재 | 결재, 반려, 수정요청 |
| super_admin | 최종 확인 | 확인, 반려 |

### 결재 이력 저장

모든 상태 변경은 `approval_history` 테이블에 기록됩니다.

```typescript
// approval_history 레코드 구조
{
  report_id: string      // 보고서 ID
  approver_id: string    // 결재자 ID
  from_status: string    // 이전 상태
  to_status: string      // 변경된 상태
  comment: string        // 코멘트
  created_at: string     // 처리 시간
}
```

### 관련 파일

- `src/components/reports/ReportDetail.tsx` - 결재 처리 로직
- `src/components/reports/ReportForm.tsx` - 제출 로직
- `src/types/database.ts` - ApprovalStatus 타입

---

## 2. 인증 흐름

### 로그인 프로세스

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│ /login  │ ──▶ │ Supabase Auth│ ──▶ │ users 테이블│
│ 페이지  │     │ signInWithPw │     │ 조회        │
└─────────┘     └──────────────┘     └─────────────┘
                                            │
                   ┌───────────────────────┼───────────────────────┐
                   ▼                       ▼                       ▼
           ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
           │ is_active   │         │ is_active   │         │ 사용자 없음 │
           │ = true      │         │ = false     │         │             │
           └─────────────┘         └─────────────┘         └─────────────┘
                   │                       │                       │
                   ▼                       ▼                       ▼
           ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
           │ /dashboard  │         │ /pending    │         │ 에러 표시   │
           │ 대시보드    │         │ 승인 대기   │         │             │
           └─────────────┘         └─────────────┘         └─────────────┘
```

### 회원가입 프로세스

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│ /login  │ ──▶ │ Supabase Auth│ ──▶ │ users 테이블│
│ 회원가입│     │ signUp       │     │ INSERT      │
└─────────┘     └──────────────┘     └─────────────┘
                                            │
                                            ▼
                                    ┌─────────────┐
                                    │ is_active   │
                                    │ = false     │
                                    └─────────────┘
                                            │
                                            ▼
                                    ┌─────────────┐
                                    │ /pending    │
                                    │ 승인 대기   │
                                    └─────────────┘
```

### 미들웨어 세션 관리

모든 요청에서 Supabase 세션을 갱신합니다.

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}
```

### 인증 관련 파일

| 파일 | 역할 |
|------|------|
| `src/middleware.ts` | 세션 갱신 |
| `src/lib/supabase/middleware.ts` | 쿠키 기반 세션 관리 |
| `src/lib/supabase/server.ts` | 서버 컴포넌트용 클라이언트 |
| `src/lib/supabase/client.ts` | 클라이언트 컴포넌트용 클라이언트 |
| `src/app/(auth)/login/page.tsx` | 로그인/회원가입 페이지 |
| `src/app/(auth)/pending/page.tsx` | 승인 대기 페이지 |
| `src/app/(dashboard)/layout.tsx` | 인증 확인 및 리다이렉트 |

---

## 3. 알림 시스템 흐름

### 알림 생성 흐름

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 보고서 상태 변경│ ──▶ │ 알림 생성 함수 │ ──▶ │ notifications   │
│ ReportDetail    │     │ notifications.ts│     │ 테이블 INSERT   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 알림 수신 흐름

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ NotificationBell│ ──▶ │ /api/notifications│──▶│ notifications   │
│ 컴포넌트        │     │ GET 요청         │    │ 테이블 SELECT   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│ 알림 드롭다운   │
│ 표시            │
└─────────────────┘
```

### 알림 트리거 매핑

| 상태 변경 | 수신자 역할 | 메시지 |
|----------|------------|--------|
| draft → submitted | president | 새 보고서가 제출되었습니다 |
| submitted → coordinator_reviewed | accountant | 회장 협조가 완료되었습니다 |
| coordinator_reviewed → manager_approved | super_admin | 부장 결재가 완료되었습니다 |
| manager_approved → final_approved | 작성자 | 보고서가 최종 승인되었습니다 |
| any → rejected | 작성자 | 보고서가 반려되었습니다 |
| any → revision_requested | 작성자 | 보고서 수정이 요청되었습니다 |

### 알림 관련 파일

| 파일 | 역할 |
|------|------|
| `src/lib/notifications.ts` | 알림 생성/조회 유틸리티 |
| `src/app/api/notifications/route.ts` | 알림 API (GET/PATCH) |
| `src/components/notifications/NotificationBell.tsx` | 알림 벨 UI |
| `src/components/notifications/NotificationItem.tsx` | 개별 알림 아이템 |

---

## 4. 권한 체계

### 사용자 역할

| 역할 | 코드 | 설명 | 권한 수준 |
|------|------|------|----------|
| 목사 | super_admin | 최고 관리자 | 최상위 |
| 회장 | president | 교육위원회 회장 | 높음 |
| 부장/회계 | accountant | 부서 관리자 | 높음 |
| 팀장 | team_leader | 부서 팀장 | 중간 |
| 회원 | member | 일반 회원 | 낮음 |

### 페이지별 접근 권한

| 페이지 | member | team_leader | accountant | president | super_admin |
|--------|--------|-------------|------------|-----------|-------------|
| /dashboard | O | O | O | O | O |
| /attendance | 조회 | O | O | O | O |
| /reports | 조회 | O | O | O | O |
| /reports/new | X | O | O | O | O |
| /members | O | O | O | O | O |
| /members/new | X | O | O | O | O |
| /stats | X | X | O | O | O |
| /approvals | X | X | O | O | O |
| /users | X | X | X | O | O |
| /guide | O | O | O | O | O |

### 기능별 권한

| 기능 | 필요 권한 |
|------|----------|
| 보고서 작성 | team_leader 이상 |
| 보고서 협조 | president |
| 보고서 결재 | accountant |
| 보고서 최종 확인 | super_admin |
| 출석 체크 | team_leader 이상 |
| 교인 등록/수정 | team_leader 이상 |
| 교인 삭제 | team_leader 이상 |
| 사용자 승인 | president, super_admin |
| 통계 조회 | accountant 이상 |

### 부서 기반 데이터 접근

- **관리자 (super_admin, president, accountant)**: 모든 부서 데이터 접근 가능
- **팀장 (team_leader)**: 소속 부서의 데이터만 접근
- **회원 (member)**: 소속 부서의 데이터만 조회

```typescript
// 예시: 부서 기반 데이터 필터링
if (user.role === 'team_leader' || user.role === 'member') {
  // 소속 부서만 조회
  query = query.eq('department_id', user.department_id)
}
```

---

## 5. 다중 부서 지원

### 데이터 구조

```
members ──┬── member_departments ──┬── departments
          │                        │
          │  member_id             │  department_id
          │  is_primary            │  name
          │                        │  code
          └────────────────────────┘
```

### 교인-부서 관계

- 한 교인이 여러 부서에 소속 가능
- `is_primary` 플래그로 주 소속 부서 표시
- 쿼리 시 `member_departments` 테이블 조인 필요

### 관련 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/types/database.ts` | MemberWithDepartments 인터페이스 |
| `src/components/members/MemberForm.tsx` | 다중 부서 선택 UI |
| `src/components/members/MemberList.tsx` | 부서 필터링 로직 |
| `src/app/(dashboard)/attendance/page.tsx` | 부서별 교인 조회 |
| `src/components/attendance/AttendanceGrid.tsx` | 부서별 출석 체크 |
