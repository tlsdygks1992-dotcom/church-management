# 청파중앙교회 교육위원회 관리 시스템 - 기술 명세서

> **최종 업데이트**: 2026-02-20
> 이 문서 하나로 프로젝트 전체를 파악할 수 있도록 작성되었습니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 앱 이름 | 청파중앙교회 교육위원회 관리 시스템 |
| 목적 | 교회 교육부서의 출결 관리, 보고서 작성/결재, 교인 관리, 회계 관리 |
| 프로덕션 URL | https://church-eight-delta.vercel.app |
| GitHub | https://github.com/onapond/church-management |
| 호스팅 | Vercel (수동 배포) |

### 기술 스택

| 영역 | 기술 | 버전/비고 |
|------|------|-----------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript | strict mode |
| 스타일링 | Tailwind CSS | v4, 모바일 우선 |
| 서버 상태 | TanStack Query | 캐싱, Optimistic Update |
| DB/인증/스토리지 | Supabase | PostgreSQL, Auth, Storage, Realtime |
| 차트 | Recharts | 동적 임포트 |
| 에디터 | Tiptap | 리치 텍스트 |
| 엑셀 | xlsx | 가져오기/내보내기 |
| 푸시 알림 | web-push + VAPID | Service Worker |
| 배포 | Vercel | CDN + Serverless |

---

## 2. 아키텍처

### 시스템 다이어그램

```
  브라우저 / 모바일 / 태블릿
           │
           ▼
  ┌─────────────────────┐
  │    Vercel (CDN)     │
  │  Next.js 16.1.6     │
  │  ┌───────┬────────┐ │
  │  │ Pages │ API    │ │
  │  │(App   │Routes  │ │
  │  │Router)│(/api)  │ │
  │  └───────┴────────┘ │
  │  Middleware (auth)   │
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │     Supabase        │
  │ ┌────────┬────────┐ │
  │ │Postgres│  Auth  │ │
  │ │  (DB)  │(email) │ │
  │ ├────────┼────────┤ │
  │ │Storage │Realtime│ │
  │ │(photos)│(알림)  │ │
  │ └────────┴────────┘ │
  └─────────────────────┘
```

### 폴더 구조

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 그룹 (/login, /pending)
│   ├── (dashboard)/              # 대시보드 그룹 (인증 필요)
│   │   ├── dashboard/            # 홈
│   │   ├── attendance/           # 출결 관리
│   │   ├── reports/              # 보고서 (목록/작성/상세/수정)
│   │   ├── members/              # 교인 (목록/등록/상세/사진일괄)
│   │   ├── accounting/           # 회계 (장부/지출결의서/입력)
│   │   ├── approvals/            # 결재함
│   │   ├── stats/                # 출석 통계
│   │   ├── users/                # 사용자 관리
│   │   ├── photos/               # 활동 사진
│   │   ├── settings/cells/       # 셀 관리
│   │   ├── guide/                # 안내 페이지
│   │   ├── error.tsx             # 대시보드 ErrorBoundary
│   │   └── layout.tsx            # AuthProvider + ToastProvider 래핑
│   └── api/                      # API 라우트
│       ├── notifications/        # 알림 CRUD
│       └── push/                 # 푸시 구독/해제/전송
├── components/                   # React 컴포넌트
│   ├── layout/                   # Header, Sidebar (useAuth)
│   ├── reports/                  # ReportForm + 서브 4개, ReportDetail
│   ├── members/                  # MemberForm + 서브 6개, MemberList
│   ├── accounting/               # Ledger, Summary, ExpenseRequest
│   ├── attendance/               # AttendanceGrid
│   ├── dashboard/                # DashboardContent
│   ├── stats/                    # StatsCharts (Line/Pie/Bar)
│   ├── users/                    # UserManagement
│   ├── notifications/            # NotificationBell, PushPermission
│   ├── pwa/                      # ServiceWorkerRegistration
│   └── ui/                       # Toast, ErrorBoundary, RichTextEditor, Skeleton, CellFilter
├── providers/                    # Context Providers
│   ├── AuthProvider.tsx          # useAuth() 훅 제공
│   ├── QueryProvider.tsx         # TanStack Query
│   └── ToastProvider.tsx         # 글로벌 Toast
├── queries/                      # TanStack Query 훅 (11개 도메인)
│   ├── departments.ts            # useDepartments, useCells, useCreateCell, ...
│   ├── members.ts                # useMembers, useDeleteMember
│   ├── reports.ts                # useReports, useReportDetail, ...
│   ├── notifications.ts          # useNotifications
│   ├── accounting.ts             # useAccountingRecordsByMonth, ...
│   ├── attendance.ts             # useAttendanceRecords, useToggleAttendance, ...
│   ├── dashboard.ts              # useRecentReports, useThisWeekStats, ...
│   ├── users.ts                  # useAllUsers
│   ├── approvals.ts              # usePendingReports, useCompletedReports
│   ├── photos.ts                 # usePhotos
│   └── stats.ts                  # useDepartmentStats, useWeeklyTrend
├── hooks/                        # 커스텀 훅
│   ├── useDebounce.ts
│   └── useToast.ts
├── lib/                          # 유틸리티
│   ├── supabase/                 # 클라이언트/서버/미들웨어 Supabase 클라이언트
│   ├── permissions.ts            # 중앙화된 권한 체크 함수
│   ├── constants.ts              # 상수 (MONTHS, MAX_FILE_SIZE, 라벨 등)
│   ├── utils.ts                  # formatDate, formatPhone, formatCurrency, ...
│   ├── errors.ts                 # AppError, ApiError, AuthError, ForbiddenError
│   ├── rate-limit.ts             # 토큰 버킷 rate limiter
│   ├── notifications.ts          # 알림 생성/조회 유틸리티
│   ├── push.ts                   # 웹 푸시 전송 (sendPushToUser/Users)
│   ├── query-client.ts           # TanStack Query 설정
│   └── excel.ts                  # 엑셀 내보내기
└── types/                        # TypeScript 타입
    ├── database.ts               # DB 스키마, Enum, 조인 타입
    └── shared.ts                 # UserData, MemberWithDepts, CellInfo, ...
```

### 인증 흐름

```
요청 → middleware.ts (세션 갱신)
          │
          ▼
(dashboard)/layout.tsx
  ├── Supabase Auth 세션 확인
  ├── users 테이블에서 사용자 조회
  ├── is_active = false → /pending 리다이렉트
  ├── 사용자 없음 → /login 리다이렉트
  └── 정상 → AuthProvider(user) + QueryProvider + ToastProvider 래핑
```

**핵심 파일:**
- `src/middleware.ts` — 모든 요청에서 Supabase 세션 갱신
- `src/lib/supabase/middleware.ts` — 쿠키 기반 세션 관리
- `src/lib/supabase/server.ts` — 서버 컴포넌트용 (async)
- `src/lib/supabase/client.ts` — 클라이언트 컴포넌트용 (싱글톤)
- `src/providers/AuthProvider.tsx` — `useAuth()` Context

### 데이터 패턴

모든 페이지는 **`'use client'` thin wrapper 패턴**을 사용:
1. `page.tsx`는 `'use client'` 선언 후 Client 컴포넌트 렌더
2. Client 컴포넌트가 `useAuth()` + TanStack Query 훅으로 데이터 로드
3. 캐시 덕분에 재방문 시 즉시 표시

```
page.tsx → ClientComponent → useAuth() + useSomething() → Supabase 쿼리
                                  ↑ TanStack Query 캐시
```

---

## 3. 데이터베이스

### 테이블 목록 (15개 테이블 + 2개 뷰)

| 테이블 | 용도 | 핵심 컬럼 |
|--------|------|-----------|
| `departments` | 부서 | code (ck/cu_worship/youth/cu1/cu2/leader), name |
| `users` | 사용자 | email, name, role, department_id, is_active |
| `user_departments` | 사용자-부서 매핑 | user_id, department_id, is_team_leader |
| `members` | 교인 명단 | name, phone, birth_date, photo_url |
| `member_departments` | 교인-부서 매핑 | member_id, department_id, is_primary, cell_id |
| `cells` | 셀(소그룹) | department_id, name, display_order |
| `weekly_reports` | 보고서 | department_id, author_id, status, report_date |
| `approval_history` | 결재 이력 | report_id, approver_id, from_status, to_status |
| `report_programs` | 보고서 순서지 | report_id, start_time, content, person_in_charge |
| `attendance_records` | 출석 기록 | member_id, attendance_date, attendance_type, is_present |
| `newcomers` | 새신자 | report_id, name, phone, introducer |
| `notifications` | 인앱 알림 | user_id, title, body, link, is_read |
| `push_subscriptions` | 푸시 구독 | user_id, endpoint, p256dh_key, auth_key |
| `accounting_records` | 회계장부 | department_id, record_date, income_amount, expense_amount |
| `expense_requests` | 지출결의서 | department_id, requester_id, total_amount |
| `expense_items` | 지출 항목 | expense_request_id, description, category, amount |

| 뷰 | 용도 | 보안 |
|-----|------|------|
| `pending_approvals` | 결재 대기 목록 | SECURITY INVOKER |
| `department_attendance_summary` | 부서별 출석 통계 | SECURITY INVOKER |

### ER 다이어그램

```
departments ◄──────────┬─────────────────┬──────────────────┐
   │                   │                 │                  │
   │ 1:N               │                 │                  │
   ▼                   │                 │                  │
users ◄──── user_departments             │                  │
   │                                     │                  │
   │ 1:N                                 │                  │
   ▼                                     │                  │
weekly_reports ─────────────────────────►─┘                  │
   │                                                        │
   ├──► approval_history                                    │
   ├──► report_programs                                     │
   ├──► newcomers                                           │
   │                                                        │
members ◄──── member_departments ────►──────────────────────┘
   │              │
   │              └──► cells
   │
   └──► attendance_records

notifications ──► users
push_subscriptions ──► users
accounting_records ──► departments
expense_requests ──► departments
   └──► expense_items
```

### Enum 정의

**user_role** (사용자 역할):
`super_admin` | `president` | `accountant` | `team_leader` | `member`

**department_code** (부서 코드):
`ck` | `cu` | `cu_worship` | `youth` | `cu1` | `cu2` | `leader`

**approval_status** (결재 상태):
`draft` | `submitted` | `coordinator_reviewed` | `manager_approved` | `final_approved` | `rejected` | `revision_requested`

**attendance_type** (출석 유형):
`worship` | `meeting`

**report_type** (보고서 유형):
`weekly` | `meeting` | `education` | `cell_leader` | `project`

**expense_category** (회계 카테고리):
- 수입: `운영비 수입` | `기타 수입`
- 지출: `운영비` | `비품` | `경조사` | `CU1행사` | `CU2행사` | `CU공통` | `리더지원` | `셀장지원` | `교육` | `기타`

### RLS 정책 요약

모든 테이블에 RLS 활성화. 주요 정책:

| 테이블 | SELECT | INSERT/UPDATE | DELETE |
|--------|--------|---------------|--------|
| departments | authenticated | - | - |
| users | 자기 데이터 + 관리자 전체 | 자기 데이터 + 관리자 | - |
| members | 부서 기반 (관리자 전체) | 팀장 이상 | 팀장 이상 |
| weekly_reports | 부서 기반 | 작성자 + 관리자 | 관리자만 |
| notifications | 자기 알림만 | authenticated | 자기 알림만 |
| push_subscriptions | 자기 구독만 | 자기 구독만 | 자기 구독만 |
| accounting_records | authenticated | authenticated | authenticated |

모든 함수에 `SET search_path = ''` 적용 (SQL injection 방지).

### 스토리지

- **버킷**: `member-photos` (공개)
- **경로 규칙**: `member-photos/{member_id}/{filename}`
- **제한**: 10MB, JPEG/PNG/GIF/WebP

---

## 4. 권한 시스템

### 역할 5단계

| 순위 | 역할 | 코드 | 조직 내 직분 | 모든 부서 접근 | 회계 접근 |
|------|------|------|-------------|---------------|----------|
| 1 | 최고 관리자 | `super_admin` | 담당 목사 | O | O |
| 2 | 회장 | `president` | 교육위원회 회장 | O | O |
| 3 | 부장/회계 | `accountant` | 부서 관리자 | O | O |
| 4 | 팀장 | `team_leader` | 부서 팀장/셀장 | X (소속만) | O (소속만) |
| 5 | 회원 | `member` | 일반 회원 | X (소속만) | X |

### 기능별 권한 매트릭스

| 기능 | member | team_leader | accountant | president | super_admin |
|------|--------|-------------|------------|-----------|-------------|
| 대시보드 조회 | O | O | O | O | O |
| 출결 조회 | O | O | O | O | O |
| 출결 체크 | X | O | O | O | O |
| 보고서 조회 | O | O | O | O | O |
| 보고서 작성 | X | O | O | O | O |
| 보고서 협조 | X | X | X | O | O |
| 보고서 결재 | X | X | O | X | O |
| 보고서 최종 확인 | X | X | X | X | O |
| 교인 등록/수정 | X | O | O | O | O |
| 교인 삭제 | X | O | O | O | O |
| 통계 조회 | X | X | O | O | O |
| 사용자 승인 | X | X | X | O | O |
| 회계 조회 | X | O (소속) | O | O | O |
| 결재함 접근 | X | X | O | O | O |

### permissions.ts 핵심 함수

| 함수 | 설명 |
|------|------|
| `isAdmin(role)` | super_admin 또는 president |
| `isAdminRole(role)` | super_admin, president, accountant (관리자 메뉴 접근) |
| `canAccessAllDepartments(role)` | 모든 부서 데이터 접근 가능 |
| `canAccessAccounting(role)` | 회계 기능 접근 가능 |
| `canWriteReport(user)` | 보고서 작성 권한 (관리자 또는 팀장) |
| `canEditMembers(user)` | 교인 관리 권한 |
| `canDeleteMembers(user)` | 교인 삭제 권한 |
| `canApprove(role)` | 결재 권한 (회장/부장/최고관리자) |
| `isTeamLeader(user)` | user_departments에서 is_team_leader 확인 |
| `canViewReport(user, report, authorIsTeamLeader?)` | 보고서 열람 7단계 권한 체크 |
| `getAccessibleDepartmentIds(user)` | 접근 가능 부서 ID 목록 |
| `getTeamLeaderDepartments(user)` | 팀장으로 관리하는 부서 목록 |

---

## 5. 결재 워크플로우

### 상태 흐름도

```
draft ──► submitted ──► coordinator_reviewed ──► manager_approved ──► final_approved
(초안)    (제출됨)       (회장 협조)              (부장 결재)          (최종 승인)

                              ─── 반려/수정요청 가능 ───
                              │                        │
                              ▼                        ▼
                         rejected              revision_requested
                         (반려)                (수정 요청)
                              │                        │
                              └── 수정 후 재제출 (draft) ─┘
```

### 역할별 결재 단계

| 단계 | 액션 | 담당 역할 | from_status | to_status |
|------|------|----------|-------------|-----------|
| 1 | 작성/제출 | team_leader | draft | submitted |
| 2 | 협조 | president (회장) | submitted | coordinator_reviewed |
| 3 | 결재 | accountant (부장) | coordinator_reviewed | manager_approved |
| 4 | 최종 확인 | super_admin (목사) | manager_approved | final_approved |
| - | 반려 | 2~4단계 담당자 | any | rejected |
| - | 수정 요청 | 2~3단계 담당자 | any | revision_requested |

### 알림 트리거

| 상태 변경 | 알림 수신자 | 메시지 |
|----------|-----------|--------|
| → submitted | 회장 (president) | "새 보고서가 제출되었습니다: {부서명}" |
| → coordinator_reviewed | 부장 (accountant) | "회장 협조가 완료되었습니다: {부서명}" |
| → manager_approved | 담당목사 (super_admin) | "부장 결재가 완료되었습니다: {부서명}" |
| → final_approved | 작성자 | "보고서가 최종 승인되었습니다: {부서명}" |
| → rejected | 작성자 | "보고서가 반려되었습니다: {부서명}" |
| → revision_requested | 작성자 | "보고서 수정이 요청되었습니다: {부서명}" |

결재 상태 변경 시 `approval_history` 테이블에 이력 자동 저장.

---

## 6. 페이지 & 컴포넌트 맵

### 전체 라우팅

| URL | 페이지 파일 | 핵심 컴포넌트 | 권한 |
|-----|-----------|-------------|------|
| `/login` | `(auth)/login/page.tsx` | 인라인 AuthForm | 비인증 |
| `/pending` | `(auth)/pending/page.tsx` | - | 비인증 |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | DashboardContent | 전체 |
| `/attendance` | `(dashboard)/attendance/page.tsx` | AttendanceClient → AttendanceGrid | 전체 (체크는 팀장↑) |
| `/reports` | `(dashboard)/reports/page.tsx` | ReportListClient | 전체 |
| `/reports/new` | `(dashboard)/reports/new/page.tsx` | ReportForm | 팀장 이상 |
| `/reports/[id]` | `(dashboard)/reports/[id]/page.tsx` | ReportDetail | 권한별 |
| `/reports/[id]/edit` | `(dashboard)/reports/[id]/edit/page.tsx` | ReportForm (editMode) | 작성자 + draft |
| `/members` | `(dashboard)/members/page.tsx` | MembersClient → MemberList | 전체 |
| `/members/new` | `(dashboard)/members/new/page.tsx` | MemberForm | 팀장 이상 |
| `/members/[id]` | `(dashboard)/members/[id]/page.tsx` | MemberForm (수정) | 팀장 이상 |
| `/members/bulk-photos` | `(dashboard)/members/bulk-photos/page.tsx` | BulkPhotoUpload | 팀장 이상 |
| `/accounting` | `(dashboard)/accounting/page.tsx` | AccountingClient | 회계 권한 |
| `/accounting/ledger/new` | `(dashboard)/accounting/ledger/new/page.tsx` | AccountingRecordForm | 회계 권한 |
| `/accounting/expense` | `(dashboard)/accounting/expense/page.tsx` | ExpenseRequestList | 회계 권한 |
| `/accounting/expense/new` | `(dashboard)/accounting/expense/new/page.tsx` | ExpenseRequestForm | 회계 권한 |
| `/approvals` | `(dashboard)/approvals/page.tsx` | ApprovalsClient | 관리자 |
| `/stats` | `(dashboard)/stats/page.tsx` | StatsClient | 관리자 |
| `/users` | `(dashboard)/users/page.tsx` | UsersClient → UserManagement | 회장/목사 |
| `/photos` | `(dashboard)/photos/page.tsx` | PhotosClient | 전체 |
| `/settings/cells` | `(dashboard)/settings/cells/page.tsx` | CellManagement | 관리자 |
| `/guide` | `(dashboard)/guide/page.tsx` | 안내 페이지 (정적) | 전체 |

### 네비게이션 구조

```
메인 메뉴 (전체 사용자)
├── 대시보드 (/dashboard)
├── 출결 관리 (/attendance)
├── 보고서 (/reports)
├── 교인 명단 (/members)
├── 회계 관리 (/accounting)
├── 활동 사진 (/photos)
└── 안내 (/guide)

관리자 메뉴 (accountant 이상)
├── 결재함 (/approvals)
├── 통계 (/stats)
├── 사용자 관리 (/users)
└── 셀 관리 (/settings/cells)
```

### 핵심 컴포넌트 → 파일 경로

| 컴포넌트 | 경로 | 서브컴포넌트 |
|----------|------|-------------|
| ReportForm | `components/reports/ReportForm.tsx` | ProgramTable, AttendanceInput, NewcomerSection, PhotoUploadSection |
| ReportDetail | `components/reports/ReportDetail.tsx` | - |
| MemberList | `components/members/MemberList.tsx` | MemberGridCard, MemberListItem, MemberFilters, DeleteConfirmModal |
| MemberForm | `components/members/MemberForm.tsx` | PhotoUploader, DepartmentSelector |
| AttendanceGrid | `components/attendance/AttendanceGrid.tsx` | MemberRow (memoized) |
| AccountingLedger | `components/accounting/AccountingLedger.tsx` | AccountingSummary |
| UserManagement | `components/users/UserManagement.tsx` | - |
| NotificationBell | `components/notifications/NotificationBell.tsx` | NotificationItem, PushPermission |
| StatsCharts | `components/stats/StatsCharts.tsx` | WeeklyTrendChart, AttendanceDistributionCharts, DepartmentComparisonChart |
| CellFilter | `components/ui/CellFilter.tsx` | - (cu1 부서 선택 시에만 표시) |

---

## 7. API 엔드포인트

### GET /api/notifications

알림 목록 조회. Rate limit 적용.

```
요청: GET /api/notifications (인증 쿠키 필요)

응답 200:
{
  "notifications": [
    { "id": "uuid", "title": "...", "body": "...", "link": "/reports/123", "is_read": false, "created_at": "..." }
  ],
  "unreadCount": 5
}
```

### PATCH /api/notifications

알림 읽음 처리. Rate limit 적용.

```
요청: PATCH /api/notifications
본문: { "id": "notification-id" }          // 단일 읽음
  또는 { "markAllAsRead": true }           // 모두 읽음

응답 200: { "success": true }
```

### POST /api/push/subscribe

푸시 구독 등록. 기존 endpoint 있으면 upsert.

```
요청: POST /api/push/subscribe
본문: { "endpoint": "https://...", "keys": { "p256dh": "...", "auth": "..." } }

응답 200: { "success": true }
```

### POST /api/push/unsubscribe

푸시 구독 해제 (`is_active: false`).

```
요청: POST /api/push/unsubscribe
본문: { "endpoint": "https://..." }

응답 200: { "success": true }
```

### POST /api/push/send

사용자에게 푸시 전송. 만료된 구독(410/404) 자동 비활성화.

```
요청: POST /api/push/send
본문: {
  "userIds": ["user-uuid-1", "user-uuid-2"],
  "title": "새 보고서 제출",
  "body": "CU1부 주차 보고서가 제출되었습니다.",
  "link": "/reports/123"
}

응답 200: { "success": true }
```

---

## 8. 외부 서비스 연동

### Supabase

| 기능 | 용도 |
|------|------|
| Auth | 이메일/비밀번호 인증, 세션 관리 (쿠키 기반) |
| Database | PostgreSQL — 15개 테이블, 2개 뷰, RLS 적용 |
| Storage | `member-photos` 버킷 — 교인 프로필 사진 |
| Realtime | `notifications` 테이블 구독 (인앱 알림) |

### Vercel

- 수동 배포 (`npx vercel --prod`)
- GitHub 자동 배포 미연결
- 배포 대시보드: https://vercel.com/onaponds-projects/church

### Web Push (VAPID)

- `web-push` 라이브러리 (서버 전용)
- VAPID 키 lazy 초기화 (빌드 시 실행 방지)
- Service Worker 기반 백그라운드 알림
- iOS PWA 지원 (홈 화면 추가 안내)

### 환경변수

| 변수 | 설명 | 공개 | 필수 |
|------|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | O | O |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID 공개 키 (웹 푸시) | O | O |
| `VAPID_PRIVATE_KEY` | VAPID 비공개 키 (서버 전용) | X | O |

설정 방법: `.env.local` 파일 생성 후 위 값 입력.

---

## 9. 테스트

### 설정

- **프레임워크**: vitest + @testing-library/react + jsdom
- **설정 파일**: `vitest.config.ts`
- **테스트 수**: 93개 (5개 파일)

### 테스트 파일

| 파일 | 테스트 수 | 대상 |
|------|----------|------|
| `src/lib/permissions.test.ts` | 34 | 권한 체크 함수 (isAdmin, canViewReport 등) |
| `src/lib/utils.test.ts` | 12 | 유틸리티 함수 (formatDate, formatPhone 등) |
| `src/lib/notifications.test.ts` | 21 | 알림 생성/조회 로직 |
| `src/lib/push.test.ts` | 11 | 푸시 라이브러리 (sendPushToUser/Users) |
| `src/app/api/push/push-api.test.ts` | 15 | 4개 API 라우트 (subscribe, unsubscribe, send, notifications) |

### Mock 패턴

Supabase 쿼리 빌더 체이닝을 mock하는 `createMockChain` 패턴 사용:

```typescript
// 체이닝 Supabase 쿼리 빌더 mock
const mockChain = createMockChain({ data: [...], error: null })
vi.mocked(supabase.from).mockReturnValue(mockChain)
```

### 실행 명령어

```bash
npm test             # 전체 테스트 실행
npm run test:watch   # 감시 모드
```

---

## 10. 배포 & 운영

### 빌드/배포 명령어

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 검사
npx tsc --noEmit     # TypeScript 타입 체크
npx vercel --prod    # Vercel 프로덕션 배포
```

### 배포 절차

```bash
# 1. 빌드 확인
npm run build

# 2. Git 커밋 & 푸시
git add . && git commit -m "메시지" && git push origin main

# 3. Vercel 배포
npx vercel --prod
```

### 성능 최적화

| 기법 | 적용 위치 |
|------|----------|
| Supabase 클라이언트 싱글톤 | `lib/supabase/client.ts` |
| TanStack Query 캐싱 | 11개 도메인별 쿼리 훅 |
| Optimistic Updates | 알림 읽음, 교인 삭제, 출석 체크 |
| 동적 임포트 | Recharts (~180KB), RichTextEditor |
| 컴포넌트 메모이제이션 | MemberRow, MemberGridCard, ProgramTable 등 |
| 병렬 쿼리 | Promise.all 패턴 |
| ErrorBoundary | 글로벌 + 대시보드 레벨 |
| Toast 알림 | alert() 대체, UX 향상 |

### 주의사항

- GitHub 자동 배포 미연결 → 반드시 `npx vercel --prod`로 수동 배포
- Supabase 이메일 확인 OFF → 회원가입 시 이메일 발송 안 함
- `is_active` 필드로 사용자 승인 관리 (is_approved 아님)
- Windows에서 `git add "src/app/(dashboard)"` 처럼 괄호 포함 경로는 따옴표 필수
- `member-photos` 버킷은 공개(public) — URL만 알면 접근 가능

---

## 부록: 부서 구조

| 코드 | 시스템 이름 | 설명 |
|------|-----------|------|
| `ck` | CK (유치/유년부) | 유치부 및 유년부 통합 |
| `cu_worship` | CU워십 | 청년부 워십팀 |
| `youth` | 청소년부 | 중/고등부 |
| `cu1` | CU 1청년부 | 20대 청년부 (셀 시스템: 1셀~6셀) |
| `cu2` | CU 2청년부 | 30대 청년부 |
| `leader` | 리더 | 리더 그룹 |

> `cu1`(1청년부)에만 셀(소그룹) 시스템이 적용되어 있습니다.
> `cells` 테이블과 `member_departments.cell_id`, `CellFilter` 컴포넌트가 이를 지원합니다.
