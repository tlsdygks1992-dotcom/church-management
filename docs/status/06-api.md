# API 및 유틸리티

## 1. Supabase 클라이언트

### 클라이언트 컴포넌트용

**경로**: `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
```

#### 특징

- 싱글톤 패턴으로 인스턴스 재사용
- 메모리 효율화 및 연결 관리
- 컴포넌트에서 `useMemo`로 캐싱 권장

#### 사용 예시

```typescript
import { createClient } from '@/lib/supabase/client'

function MyComponent() {
  const supabase = useMemo(() => createClient(), [])

  // supabase.from('table')...
}
```

---

### 서버 컴포넌트용

**경로**: `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

#### 특징

- 서버 사이드 렌더링 지원
- 쿠키 기반 세션 관리
- 비동기 함수 (await 필요)

---

### 미들웨어용

**경로**: `src/lib/supabase/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
```

#### 특징

- 모든 요청에서 세션 갱신
- 쿠키 자동 갱신
- `src/middleware.ts`에서 호출

---

## 2. API 라우트

### 알림 API

**경로**: `src/app/api/notifications/route.ts`

#### GET - 알림 목록 조회

```typescript
// 요청
GET /api/notifications

// 응답
{
  "notifications": [
    {
      "id": "uuid",
      "title": "새 보고서가 제출되었습니다",
      "body": "CU1부 주차 보고서",
      "link": "/reports/123",
      "is_read": false,
      "created_at": "2026-01-31T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

#### PATCH - 알림 읽음 처리

```typescript
// 요청
PATCH /api/notifications
{
  "id": "notification-id",      // 단일 알림 읽음
  "markAllAsRead": true         // 모두 읽음 (id와 함께 사용 불가)
}

// 응답
{ "success": true }
```

---

## 3. 유틸리티 함수

### 알림 유틸리티

**경로**: `src/lib/notifications.ts`

#### 함수 목록

| 함수 | 설명 |
|------|------|
| `getRecipientsByRole(role)` | 역할별 사용자 ID 목록 조회 |
| `createNotification(data)` | 단일 알림 생성 |
| `createNotifications(dataArray)` | 다중 알림 생성 |
| `createApprovalNotification(params)` | 결재 워크플로우 알림 생성 |
| `getUnreadCount(userId)` | 읽지 않은 알림 개수 |
| `markAsRead(notificationId)` | 알림 읽음 처리 |
| `markAllAsRead(userId)` | 모든 알림 읽음 처리 |

#### createApprovalNotification 사용 예시

```typescript
await createApprovalNotification({
  reportId: 'report-uuid',
  fromStatus: 'submitted',
  toStatus: 'coordinator_reviewed',
  departmentName: 'CU1부',
  authorId: 'author-uuid'
})
```

#### 알림 템플릿

| 상태 변경 | 메시지 템플릿 |
|----------|--------------|
| → submitted | "새 보고서가 제출되었습니다: {부서명}" |
| → coordinator_reviewed | "회장 협조가 완료되었습니다: {부서명}" |
| → manager_approved | "부장 결재가 완료되었습니다: {부서명}" |
| → final_approved | "보고서가 최종 승인되었습니다: {부서명}" |
| → rejected | "보고서가 반려되었습니다: {부서명}" |
| → revision_requested | "보고서 수정이 요청되었습니다: {부서명}" |

---

### 엑셀 유틸리티

**경로**: `src/lib/excel.ts`

#### 함수 목록

| 함수 | 설명 |
|------|------|
| `exportToExcel(data, columns, filename)` | 범용 엑셀 내보내기 |
| `exportMembersToExcel(members)` | 교인 명단 내보내기 |
| `exportAttendanceToExcel(records)` | 출석 기록 내보내기 |
| `exportStatsToExcel(stats)` | 통계 내보내기 |

#### exportToExcel 사용 예시

```typescript
import { exportToExcel } from '@/lib/excel'

const data = [
  { name: '홍길동', phone: '010-1234-5678', department: 'CU1부' },
  // ...
]

const columns = [
  { key: 'name', header: '이름' },
  { key: 'phone', header: '연락처' },
  { key: 'department', header: '부서' },
]

exportToExcel(data, columns, '교인명단.xlsx')
```

#### exportMembersToExcel 컬럼

| 컬럼 | 설명 |
|------|------|
| 이름 | 교인 이름 |
| 연락처 | 전화번호 |
| 이메일 | 이메일 주소 |
| 생년월일 | YYYY-MM-DD 형식 |
| 부서 | 소속 부서 (다중 시 쉼표 구분) |
| 주소 | 주소 |
| 직업 | 직업 |

#### 특징

- XLSX 라이브러리 사용
- 자동 열 너비 조정
- 한글 파일명 지원

---

## 4. 미들웨어

**경로**: `src/middleware.ts`

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

#### 기능

- 모든 페이지 요청에서 Supabase 세션 갱신
- 정적 파일 및 이미지 요청 제외
- 쿠키 자동 갱신으로 세션 유지

---

## 5. 타입 정의

**경로**: `src/types/database.ts`

### 주요 타입

```typescript
// 역할
export type UserRole =
  | 'super_admin'
  | 'president'
  | 'accountant'
  | 'team_leader'
  | 'member'

// 부서 코드
export type DepartmentCode =
  | 'ck'
  | 'cu_worship'
  | 'youth'
  | 'cu1'
  | 'cu2'
  | 'leader'

// 보고서 유형
export type ReportType =
  | 'weekly'
  | 'meeting'
  | 'education'

// 결재 상태
export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'coordinator_reviewed'
  | 'manager_approved'
  | 'final_approved'
  | 'rejected'
  | 'revision_requested'

// 출석 유형
export type AttendanceType = 'worship' | 'meeting'
```

### 테이블 타입 별칭

```typescript
export type Department = Database['public']['Tables']['departments']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type WeeklyReport = Database['public']['Tables']['weekly_reports']['Row']
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
// ...
```

### 조인 타입

```typescript
// 교인 + 부서 정보
export interface MemberWithDepartments extends Member {
  member_departments: Array<{
    department_id: string
    is_primary: boolean
    departments: {
      id: string
      name: string
      code?: string
    }
  }>
}
```

---

## 6. 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | O |

### 설정 방법

1. Supabase Dashboard에서 키 확인
2. `.env.local` 파일 생성

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 7. 쿼리 패턴

### 기본 CRUD

```typescript
// SELECT
const { data, error } = await supabase
  .from('members')
  .select('*')
  .eq('is_active', true)

// INSERT
const { data, error } = await supabase
  .from('members')
  .insert({ name: '홍길동', phone: '010-1234-5678' })
  .select()
  .single()

// UPDATE
const { error } = await supabase
  .from('members')
  .update({ name: '김철수' })
  .eq('id', memberId)

// DELETE
const { error } = await supabase
  .from('members')
  .delete()
  .eq('id', memberId)
```

### 조인 쿼리

```typescript
// 교인 + 부서 정보 조회
const { data } = await supabase
  .from('members')
  .select(`
    *,
    member_departments (
      department_id,
      is_primary,
      departments (
        id,
        name,
        code
      )
    )
  `)
  .eq('is_active', true)
```

### 병렬 쿼리

```typescript
// Promise.all로 병렬 처리
const [reportResult, programsResult, historyResult] = await Promise.all([
  supabase.from('weekly_reports').select('*').eq('id', reportId).single(),
  supabase.from('report_programs').select('*').eq('report_id', reportId),
  supabase.from('approval_history').select('*').eq('report_id', reportId),
])
```

### Optimistic Update 패턴

```typescript
// 1. UI 즉시 업데이트
setDeletedIds(prev => new Set([...prev, id]))

// 2. API 호출
const { error } = await supabase
  .from('members')
  .delete()
  .eq('id', id)

// 3. 실패 시 롤백
if (error) {
  setDeletedIds(prev => {
    const next = new Set(prev)
    next.delete(id)
    return next
  })
}
```
