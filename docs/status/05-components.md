# 컴포넌트 구조

## 개요

모든 컴포넌트는 `src/components/` 폴더에 위치하며, 기능별로 하위 폴더에 정리되어 있습니다.

```
src/components/
├── layout/          # Header, Sidebar (useAuth() 사용)
├── reports/         # ReportForm + ProgramTable, AttendanceInput, NewcomerSection, PhotoUploadSection
├── members/         # MemberForm + PhotoUploader, DepartmentSelector, MemberFilters, DeleteConfirmModal 등
├── accounting/      # AccountingLedger, ExpenseRequestForm/List, AccountingRecordForm, AccountingSummary
├── attendance/      # AttendanceClient → AttendanceGrid
├── dashboard/       # DashboardContent (useAuth + TanStack Query)
├── stats/           # StatsClient + 통계 차트
├── users/           # UsersClient → UserManagement
├── notifications/   # NotificationBell, NotificationItem, PushPermission
├── pwa/             # ServiceWorkerRegistration, UpdatePrompt
└── ui/              # Toast, ErrorBoundary, RichTextEditor, Skeleton, CellFilter
```

---

## 1. 레이아웃 컴포넌트

### Header.tsx

**경로**: `src/components/layout/Header.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 모바일 상단 헤더
- 모바일 메뉴 드롭다운 (오버레이)
- 모바일 하단 네비게이션 바
- NotificationBell 컴포넌트 통합

#### 구성 요소

| 요소 | 설명 |
|------|------|
| 로고 | 청파중앙교회 로고 |
| 메뉴 버튼 | 햄버거 메뉴 (모바일) |
| 알림 벨 | NotificationBell 컴포넌트 |
| 드롭다운 | 전체 메뉴 목록 |
| 하단 네비게이션 | 주요 메뉴 바로가기 |

#### 반응형

- 모바일: 상단 헤더 + 하단 네비게이션 표시
- 데스크톱: `hidden lg:hidden`으로 숨김

---

### Sidebar.tsx

**경로**: `src/components/layout/Sidebar.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 데스크톱 고정 사이드바 (너비 256px)
- 로고 및 교회명 표시
- 메인 네비게이션
- 관리자 전용 네비게이션
- 사용자 정보 및 로그아웃

#### 네비게이션 구조

```
메인 메뉴
├── 대시보드 (/dashboard)
├── 출결 관리 (/attendance)
├── 보고서 (/reports)
├── 교인 명단 (/members)
└── 교육위원회 안내 (/guide)

관리 메뉴 (관리자만)
├── 결재함 (/approvals)
├── 출석 통계 (/stats)
└── 사용자 관리 (/users)
```

#### 반응형

- 모바일: `hidden lg:block`으로 숨김
- 데스크톱: 항상 표시

---

## 2. 보고서 컴포넌트

### ReportForm.tsx

**경로**: `src/components/reports/ReportForm.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| reportType | ReportType | 보고서 유형 (weekly/meeting/education) |
| editMode | boolean | 수정 모드 여부 |
| existingReportId | string | 기존 보고서 ID (수정 시) |

#### 기능

- 보고서 작성/수정 폼
- 보고서 유형별 필드 분기
- 동적 프로그램 추가 (순서지)
- 신입자 정보 입력
- 셀별 출석 현황 입력
- RichTextEditor 동적 임포트
- 초안 저장 / 제출 / 수정

#### 추출된 서브컴포넌트 (Phase 3 리팩토링)

| 컴포넌트 | 파일 | 용도 |
|----------|------|------|
| ProgramTable | `reports/ProgramTable.tsx` | 순서지 테이블 관리 |
| AttendanceInput | `reports/AttendanceInput.tsx` | 셀별 출석 현황 입력 |
| NewcomerSection | `reports/NewcomerSection.tsx` | 신입자 정보 섹션 |
| PhotoUploadSection | `reports/PhotoUploadSection.tsx` | 사진 업로드 섹션 |

공유 타입: `src/components/reports/types.ts` (Program, Newcomer, CellAttendance, TIME_OPTIONS)

---

### ReportDetail.tsx

**경로**: `src/components/reports/ReportDetail.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| report | WeeklyReport | 보고서 데이터 |
| programs | ReportProgram[] | 순서지 데이터 |
| approvalHistory | ApprovalHistory[] | 결재 이력 |
| user | User | 현재 사용자 |

#### 기능

- 보고서 상세 조회
- 결재 흐름 타임라인 표시
- 역할별 결재 액션 (협조/결재/확인/반려)
- 인쇄 기능 (프린터 IP 설정)
- 보고서 수정 버튼 (작성자 + draft)
- 보고서 삭제 기능 (관리자만, 확인 모달)

#### 결재 액션 버튼

| 상태 | 역할 | 액션 |
|------|------|------|
| submitted | president | 협조, 반려, 수정요청 |
| coordinator_reviewed | accountant | 결재, 반려, 수정요청 |
| manager_approved | super_admin | 확인, 반려 |

---

### ReportPrintView.tsx

**경로**: `src/components/reports/ReportPrintView.tsx`

#### 기능

- 보고서 인쇄용 HTML 생성
- 인쇄에 최적화된 레이아웃

---

## 3. 교인 컴포넌트

### MemberForm.tsx

**경로**: `src/components/members/MemberForm.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| member | Member | 기존 교인 데이터 (수정 시) |
| departments | Department[] | 부서 목록 |

#### 기능

- 교인 정보 입력/수정 폼
- 필드: 이름, 연락처, 이메일, 생년월일, 주소, 직업
- 다중 부서 선택 (체크박스)
- 주 소속 부서 지정 (파란 버튼)
- 프로필 사진 업로드 (Next.js Image 사용)

---

### MemberList.tsx

**경로**: `src/components/members/MemberList.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| members | MemberItem[] | 교인 목록 |
| departments | Department[] | 부서 목록 |
| canManage | boolean | 관리 권한 여부 |

#### 기능

- 그리드/리스트 뷰 전환
- 검색 (이름/연락처)
- 부서 필터링 (드롭다운)
- **셀별 필터링** (1청년부 선택 시에만 셀 드롭다운 표시)
- 생일 월별 필터 (1월~12월 버튼)
- 교인 삭제 (Optimistic Update)
- 엑셀 내보내기

#### 추출된 서브컴포넌트 (Phase 3 리팩토링)

| 컴포넌트 | 파일 | 용도 |
|----------|------|------|
| MemberGridCard | `members/MemberGridCard.tsx` | 그리드 뷰 카드 |
| MemberListItem | `members/MemberListItem.tsx` | 리스트 뷰 행 |
| MemberFilters | `members/MemberFilters.tsx` | 검색/부서/생일 필터 |
| DeleteConfirmModal | `members/DeleteConfirmModal.tsx` | 삭제 확인 모달 |
| PhotoUploader | `members/PhotoUploader.tsx` | 프로필 사진 업로드 |
| DepartmentSelector | `members/DepartmentSelector.tsx` | 다중 부서 선택 |
| BulkPhotoUpload | `members/BulkPhotoUpload.tsx` | 부서별 사진 일괄 업로드 |

---

## 4. 출결 컴포넌트

### AttendanceGrid.tsx

**경로**: `src/components/attendance/AttendanceGrid.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| departmentId | string | 선택된 부서 ID |
| departments | Department[] | 부서 목록 |

#### 기능

- 부서별 출석 테이블
- 예배/모임 체크박스 (Optimistic Update)
- 교인별 사진 표시
- 부서 전환 드롭다운
- 엑셀 내보내기

#### 메모이제이션된 서브컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| MemberRow | 교인별 출석 행 |

---

## 5. 통계 컴포넌트

### StatsCharts.tsx

**경로**: `src/components/stats/StatsCharts.tsx`

#### 내보내는 컴포넌트

| 컴포넌트 | 차트 유형 | 용도 |
|----------|----------|------|
| WeeklyTrendChart | Line Chart | 주간 출석 추이 |
| AttendanceDistributionCharts | Pie Chart | 부서별 출석 분포 |
| DepartmentComparisonChart | Bar Chart | 부서별 출석률 비교 |

#### 사용 라이브러리

- Recharts (동적 임포트로 지연 로딩)

---

## 6. 사용자 관리 컴포넌트

### UserManagement.tsx

**경로**: `src/components/users/UserManagement.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 미승인 사용자 목록
- 역할 할당 (드롭다운)
- 부서 할당 (다중 선택)
- 승인/거부 버튼
- 기존 사용자 관리
- 저장 버튼 (변경사항 일괄 저장)
- 변경된 필드 파란색 하이라이트
- 사용자 삭제 기능

---

## 7. 알림 컴포넌트

### NotificationBell.tsx

**경로**: `src/components/notifications/NotificationBell.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 알림 종 아이콘
- 읽지 않은 알림 개수 배지
- 드롭다운 알림 목록
- 알림 클릭 시 해당 페이지 이동
- 읽음 처리 (Optimistic Update)
- 모두 읽음 버튼
- 실시간 업데이트 (폴링)

---

### NotificationItem.tsx

**경로**: `src/components/notifications/NotificationItem.tsx`

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| notification | Notification | 알림 데이터 |
| onClick | () => void | 클릭 핸들러 |

#### 기능

- 개별 알림 표시
- 읽음/읽지 않음 스타일 구분
- 시간 표시

---

### PushPermission.tsx

**경로**: `src/components/notifications/PushPermission.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| userId | string | 현재 사용자 ID |

#### 기능

- 웹 푸시 알림 구독/해제 버튼
- 5단계 진행 표시 (권한 요청 → SW 확인 → VAPID → 구독 → 서버 저장)
- 타임아웃 처리 (각 단계별)
- 미지원 브라우저 안내 (iOS Safari → 홈 화면 추가 안내)
- 알림 차단 상태 안내
- NotificationBell 드롭다운 하단에 표시

---

## 8. 회계 컴포넌트

### AccountingLedger.tsx

**경로**: `src/components/accounting/AccountingLedger.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| records | AccountingRecordWithDetails[] | 회계 기록 목록 |
| onRecordDeleted | () => void | 삭제 후 콜백 |
| canEdit | boolean | 편집 권한 여부 |

#### 기능

- 회계장부 테이블 (데스크톱)
- 회계장부 카드 뷰 (모바일)
- 체크박스 선택 (개별/전체)
- 선택 항목 일괄 삭제
- 선택된 행 하이라이트
- 잔액 자동 계산 (누적)
- 월별 합계 표시

---

### AccountingImport.tsx

**경로**: `src/components/accounting/AccountingImport.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| onImport | (data: AccountingImportRow[]) => void | 가져오기 확정 콜백 |
| onClose | () => void | 모달 닫기 콜백 |

#### 기능

- 엑셀 파일 업로드 (드래그앤드롭)
- 파일 미리보기 (최대 10행)
- 오류/경고 표시
- 가져오기 확정

---

### AccountingSummary.tsx

**경로**: `src/components/accounting/AccountingSummary.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 월별 요약 카드
- 총 수입, 총 지출, 최종 잔액
- 이전월 대비 변화

---

### AccountingRecordForm.tsx

**경로**: `src/components/accounting/AccountingRecordForm.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 회계 기록 입력 폼
- 날짜, 적요, 수입/지출 금액
- 카테고리 선택 (수입/지출 구분)
- 비고 입력

---

### ExpenseRequestForm.tsx

**경로**: `src/components/accounting/ExpenseRequestForm.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 지출결의서 작성 폼
- 동적 항목 추가
- 항목별: 날짜, 적요, 카테고리, 금액, 비고
- 총액 자동 계산

---

### ExpenseRequestList.tsx

**경로**: `src/components/accounting/ExpenseRequestList.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### 기능

- 지출결의서 목록
- 날짜, 총액, 수령인 표시
- 상세보기 링크

---

## 9. 공용 UI 컴포넌트

### RichTextEditor.tsx

**경로**: `src/components/ui/RichTextEditor.tsx`

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| content | string | 초기 컨텐츠 |
| onChange | (html: string) => void | 변경 핸들러 |
| placeholder | string | 플레이스홀더 |

#### 기능

- Tiptap 기반 리치 텍스트 에디터
- 텍스트 서식: 굵게(B), 기울임(I), 밑줄(U), 취소선(S)
- 제목: H1, H2
- 리스트: 번호/글머리 기호
- 정렬: 왼쪽/가운데/오른쪽
- 폰트 크기 조절 (10pt ~ 32pt)

#### 사용 라이브러리

- @tiptap/react
- @tiptap/starter-kit
- @tiptap/extension-underline
- @tiptap/extension-text-align
- @tiptap/extension-placeholder
- @tiptap/extension-text-style

---

### Skeleton.tsx

**경로**: `src/components/ui/Skeleton.tsx`

#### 기능

- 로딩 스켈레톤 컴포넌트
- 차트/데이터 로딩 상태 표시

---

## 컴포넌트 계층 구조

```
App Layout
├── (auth) Layout
│   └── login/page
│       └── AuthForm (inline)
│
└── (dashboard) Layout
    ├── AuthProvider (인증 Context)
    ├── ToastProvider (Toast Context)
    ├── QueryProvider (TanStack Query)
    ├── Header (useAuth())
    │   └── NotificationBell
    ├── Sidebar (useAuth())
    │   └── NotificationBell
    ├── error.tsx (대시보드 ErrorBoundary)
    │
    ├── dashboard/page ('use client' thin wrapper)
    │   └── DashboardContent (useAuth + dashboard hooks)
    │
    ├── attendance/page ('use client' thin wrapper)
    │   └── AttendanceClient (useAuth + useDepartments + 초기 로드)
    │       └── AttendanceGrid
    │           └── MemberRow (memoized)
    │
    ├── reports/page ('use client' thin wrapper)
    │   └── ReportListClient (useAuth + useDepartments + 자체 fetch)
    ├── reports/new/page
    │   └── ReportForm
    │       ├── ProgramTable
    │       ├── AttendanceInput
    │       ├── NewcomerSection
    │       ├── PhotoUploadSection
    │       └── RichTextEditor (dynamic)
    ├── reports/[id]/page
    │   └── ReportDetail
    │
    ├── members/page ('use client' thin wrapper)
    │   └── MembersClient (useAuth + useDepartments + useMembers)
    │       └── MemberList
    │           ├── MemberFilters
    │           │   └── CellFilter (memoized)
    │           ├── MemberGridCard (memoized)
    │           ├── MemberListItem (memoized)
    │           └── DeleteConfirmModal
    ├── members/bulk-photos/page
    │   └── BulkPhotoUpload
    ├── members/new/page
    │   └── MemberForm
    │       ├── PhotoUploader
    │       └── DepartmentSelector
    │           └── CellFilter (memoized)
    ├── members/[id]/page
    │   └── MemberForm
    │
    ├── accounting/page ('use client' thin wrapper)
    │   └── AccountingClient (useAuth + useDepartments + useAccounting)
    ├── accounting/ledger/page
    │   └── AccountingLedger
    ├── accounting/expense/page
    │   └── ExpenseRequestList
    ├── accounting/expense/new/page
    │   └── ExpenseRequestForm
    │
    ├── stats/page ('use client' thin wrapper)
    │   └── StatsClient (useDepartments + stats hooks)
    │
    ├── approvals/page ('use client' thin wrapper)
    │   └── ApprovalsClient (useAuth + approvals hooks)
    │
    ├── users/page ('use client' thin wrapper)
    │   └── UsersClient (useAuth + useAllUsers + useDepartments)
    │       └── UserManagement
    │
    ├── photos/page ('use client' thin wrapper)
    │   └── PhotosClient (useAuth + useDepartments + usePhotos)
    │
    └── [모든 page.tsx는 'use client' thin wrapper 패턴]
        → Client 컴포넌트가 useAuth() + TanStack Query로 데이터 로드
        → 캐시 덕분에 재방문 시 즉시 표시
```

---

## 성능 최적화 적용 현황

### 메모이제이션 (React.memo)

| 컴포넌트 | 파일 |
|----------|------|
| ProgramTable | reports/ProgramTable.tsx |
| AttendanceInput | reports/AttendanceInput.tsx |
| NewcomerSection | reports/NewcomerSection.tsx |
| MemberRow | AttendanceGrid.tsx |
| MemberGridCard | members/MemberGridCard.tsx |
| MemberListItem | members/MemberListItem.tsx |
| CellFilter | ui/CellFilter.tsx |

### 동적 임포트 (next/dynamic)

| 컴포넌트 | 설명 |
|----------|------|
| RichTextEditor | 보고서 폼에서 필요 시 로드 |
| StatsCharts | 통계 페이지에서 필요 시 로드 |

### Optimistic Updates

| 기능 | 컴포넌트 |
|------|----------|
| 알림 읽음 처리 | NotificationBell |
| 교인 삭제 | MemberList |
| 출석 체크 | AttendanceGrid |

### useCallback / useMemo

대부분의 클라이언트 컴포넌트에서 이벤트 핸들러와 Supabase 클라이언트에 적용

---

## 10. 셀 필터 컴포넌트

### CellFilter.tsx

**경로**: `src/components/ui/CellFilter.tsx`
**타입**: 클라이언트 컴포넌트 (`'use client'`)

#### Props

| Prop | 타입 | 설명 |
|------|------|------|
| departments | Department[] | 부서 목록 (code 포함) |
| selectedDeptId | string | 선택된 부서 ID |
| selectedCellId | string | 선택된 셀 ID ('all' 또는 셀 UUID) |
| onCellChange | (cellId: string) => void | 셀 변경 핸들러 |

#### 기능

- 셀 드롭다운 (1청년부 선택 시에만 표시)
- `useCells()` 훅으로 셀 목록 조회
- cu1 아닐 때 `null` 반환 (완전히 숨김)
- `React.memo`로 메모이제이션

#### 사용 페이지

| 페이지 | 컴포넌트 |
|--------|----------|
| 교인 명단 | MemberFilters |
| 출결 관리 | AttendanceGrid |
| 통계 | stats/page.tsx |
| 교인 등록/수정 | DepartmentSelector |
