# 세션 노트

## 작업 내역 (2026-02-10, 세션 6)

### 완료된 작업
1. [보고서 부서 선택 통합] - `ff26f6b`
   - `ReportForm.tsx`: 부서 선택을 모든 보고서 타입에서 상단에 통일 배치
   - 기존: weekly는 상단, 나머지는 하단에 중복 → 상단 1개로 통일

2. [TanStack Query 성능 최적화 - 1차] - `92c6fdf`
   - **staleTime 통일**: members(5분), reports(2분), attendance(30초), departments(10분)
   - **placeholderData: keepPreviousData** 추가 (members, reports, departments)
     → 탭/필터 전환 시 이전 데이터 유지 + 백그라운드 갱신
   - **ReportListClient 전환**: useState+useEffect 수동 fetch → `useReports` + `useTeamLeaderMap` TanStack Query 훅
     - 부서 필터도 URL searchParams 기반으로 변경 (`?type=weekly&dept=xxx`)
     - `isFetching` 상태로 백그라운드 갱신 시 반투명 처리
   - **AttendanceClient 전환**: useState+useEffect → `useAttendanceMembers` + `useAttendanceRecordsBrief` 훅
   - **신규 훅**: `useReports` 강화 (reportType 필터, departmentIds 복수 필터, ReportListItem 타입)
   - **신규 훅**: `useTeamLeaderMap(departmentIds[])` - 복수 부서 팀장 ID 맵 조회
   - **신규 훅**: `useAttendanceMembers(deptId)`, `useAttendanceRecordsBrief(date)` - 출결용 경량 훅

3. [TanStack Query 성능 최적화 - 2차] - `1e7c1d8`
   - **나머지 5개 컴포넌트** 모두 수동 fetch → TanStack Query 전환
   - **AccountingSummary**: useState+useEffect → `usePreviousBalance(deptId, year, month)`
   - **AccountingRecordForm**: supabase.auth.getUser() → `useAuth()` + `useDepartments()`
   - **ExpenseRequestForm**: 동일 전환 (useAuth + useDepartments)
   - **ExpenseRequestList**: 전면 재작성 → `useAuth()` + `useDepartments()` + `useExpenseRequests()` + `useDeleteExpenseRequest()`
   - **ReportStatsContent**: useState+useEffect → `useReportStats(selectedDept, startDate)`
   - **신규 훅**: `usePreviousBalance`, `useExpenseRequests`, `useDeleteExpenseRequest` (accounting.ts)
   - **신규 훅**: `useReportStats` + `ReportStatsRow` 타입 (reports.ts)
   - **결과**: 전체 데이터 fetching 100% TanStack Query 전환 완료 (수동 fetch 패턴 0개)

### 커밋 이력
- `ff26f6b` - Move department selector to top for all report types (1파일)
- `92c6fdf` - Optimize performance: TanStack Query caching for all pages (6파일)
- `1e7c1d8` - Convert remaining 5 components from manual fetch to TanStack Query (7파일)

### 성능 개선 효과
| 상황 | 개선 전 | 개선 후 |
|------|---------|---------|
| 보고서 목록 재방문 | 매번 로딩 스피너 | 2분 내 즉시 표시 |
| 보고서 탭 전환 | 빈 화면 → 로딩 | 이전 데이터 유지 + 백그라운드 갱신 |
| 출결 페이지 재방문 | 매번 로딩 | 5분 내 즉시 표시 |
| 교인 명단 재방문 | 매번 로딩 | 5분 내 즉시 표시 |

---

## 작업 내역 (2026-02-10, 세션 5)

### 완료된 작업
1. [셀장 보고서 타입 추가] - `44abf90`
   - DB: `report_type` enum에 `cell_leader` 추가 (마이그레이션)
   - `database.ts`: ReportType에 `cell_leader` 추가
   - `ReportForm.tsx`: 셀장 보고서 폼 (진행순서/출결/새신자 제외)
     - 셀 모임명, 날짜, 참석자, 나눔 내용(`main_content`), 기도제목(`application_notes`), 사진, 기타사항
     - 장소 필드 셀장 보고서에서 숨김
   - `ReportListClient.tsx`: 셀장 보고서 탭 추가 (아이콘: 🏠)
   - `reports/new/page.tsx`: 셀장 보고서 작성 지원
   - `EditReportClient.tsx`: 셀장 보고서 수정 지원
   - `ReportDetail.tsx`: 셀장 보고서 상세 표시
     - "셀 모임 개요" (장소 제외), "나눔 내용", "기도제목 및 기타사항"
     - 인쇄 HTML: 셀장 보고서 전용 (진행순서 제외, 나눔 내용/기도제목 라벨)

### 커밋 이력
- `44abf90` - Add cell leader report type with sharing content and prayer requests (7파일)

### 셀장 보고서 필드 매핑
| UI 라벨 | DB 필드 |
|---------|---------|
| 셀 모임명 | `meeting_title` |
| 셀 모임 날짜 | `report_date` |
| 참석자 | `attendees` |
| 나눔 내용 | `main_content` |
| 기도제목 | `application_notes` |
| 사진 | `report_photos` |
| 기타사항 | `notes` JSON → `other_notes` |

---

## 작업 내역 (2026-02-10, 세션 4)

### 완료된 작업
1. [엑셀 사진 임포트 - CU2부] - DB 직접 업데이트 (코드 변경 없음)
   - `2청년 주소록_0207.cell` (한셀 파일, ZIP 기반) 파싱
   - 사진 임포트: 13장 JPEG 추출 → Supabase Storage 업로드 → 12명 `photo_url` 업데이트
   - 김재우는 cu2 미등록(cu1에 이미 사진 있음) → 스킵
   - 사진 없는 2명: 김민혁, 송준호

2. [청소년부 데이터 업데이트] - DB 직접 업데이트
   - `2026 청소년부 주소록.xlsx` → 사진 없음 (데이터만)
   - 8명 phone, birth_date, occupation(학교) 업데이트

3. [보호자(guardian) 컬럼 추가] - `78e1c67`
   - DB: `members` 테이블에 `guardian varchar(100)` 컬럼 추가 (마이그레이션)
   - 청소년부 8명 보호자 데이터 입력
   - `database.ts`: Member 타입에 guardian 추가
   - `members/[id]/page.tsx`: 상세 화면에 직업/소속 + 보호자 카드 표시 (조건부)
   - `members/[id]/edit/page.tsx`: Member 인터페이스에 guardian 추가
   - `MemberForm.tsx`: 보호자 입력 필드 + 수정/등록 시 저장

### 커밋 이력
- `78e1c67` - Add guardian field to members and display in member detail/form (5파일)

---

## 작업 내역 (2026-02-10, 세션 3)

### 완료된 작업
1. [엑셀 데이터 임포트 - CU1부] - DB 직접 업데이트 (코드 변경 없음)
   - `1청년부 전체 명단 (26.01.31).xlsx` 파싱
   - 셀 배정: 1셀 6명, 2셀 6명, 3셀 4명 (16명 `cell_id` 업데이트)
   - 사진 임포트: xlsx에서 28장 JPEG 추출 → Supabase Storage 업로드 → `photo_url` 업데이트
   - 사진 없는 7명: 송준선, 이승재, 한수연, 김동혁, 이지욱, 박승조, 구현서

2. [edit/new 페이지 Client 전환] - `defd87f`
   - `reports/new/page.tsx`: useState/useEffect → `useAuth()` + `useDepartments()` + `useMemo`
   - `reports/[id]/edit/page.tsx`: 서버 컴포넌트 126줄 → thin wrapper 10줄
   - `EditReportClient.tsx` 신규: `useAuth` + `useReportDetail` + `useReportPrograms` + `useReportNewcomers` + `useDepartments`
   - 캐싱된 데이터 재사용으로 edit 페이지 즉시 표시

2. [새신자 → 교인 전환 기능] - `4eb9383`
   - `ReportDetail.tsx`: 새신자 카드에 "교인 전환" 버튼 + "전환 완료" 배지
   - `members/new/page.tsx`: `newcomerId` searchParam으로 새신자 데이터 조회, 제목/설명 변경
   - `MemberForm.tsx`: `newcomerData` prop으로 폼 자동 채움 (이름, 연락처, 생년월일, 주소, 소속→직업, 부서)
   - 교인 등록 후 `newcomers.converted_to_member_id`에 member ID 기록
   - 이미 전환된 새신자는 버튼 대신 "전환 완료" 배지 표시

2. [보고서 열람 권한 제한] - `91395f5`
   - `canViewReport()` 함수 추가 (permissions.ts): 7단계 권한 체크
     - 작성자 → draft 차단 → 관리자 → 부서확인 → 팀장(is_team_leader=true) → 셀장(peer) → 멤버
   - DB: 김효정, 김선웅 `is_team_leader=true` 설정 (cu1 부서 팀장)
   - `ReportDetail.tsx`: `canAccessAllDepartments` → `canViewReport` 교체, `useTeamLeaderIds` 훅 추가
   - `ReportListClient.tsx`: 부서별 팀장 ID 조회 + `filteredReports` client-side 필터링
   - `queries/reports.ts`: `useTeamLeaderIds(departmentId)` 훅 추가

2. [알림 로직 + 권한 테스트] - `cfa3e8e`
   - `permissions.test.ts`: canViewReport 12개 테스트 추가 (총 34개)
   - `notifications.test.ts`: 21개 테스트 신규 (Supabase mock 헬퍼 포함)
     - getRecipientsByRole, createNotification, createNotifications
     - createApprovalNotification (상태별 수신자 라우팅, 메시지 치환)
     - getUnreadCount, markAsRead, markAllAsRead
   - 전체 67개 테스트 통과 (기존 34 → 67)

### 커밋 이력
- `defd87f` - Convert report edit/new pages to useAuth + TanStack Query client pattern (3파일)
- `4eb9383` - Add newcomer to member conversion feature (3파일)
- `91395f5` - Add report viewing permission based on team leader hierarchy (4파일)
- `cfa3e8e` - Add tests for canViewReport and notification logic (2파일)

### 보고서 열람 권한 규칙
| 역할 | 열람 범위 |
|------|-----------|
| 작성자 본인 | 항상 (draft 포함) |
| super_admin, president, accountant | 모든 보고서 |
| 부서 팀장 (is_team_leader=true) | 부서 전체 보고서 |
| 셀장 (is_team_leader=false, role=team_leader) | 셀장끼리만 |
| 일반 멤버 | 자기 보고서만 |
| 타인의 draft | 차단 |

---

## 작업 내역 (2026-02-10, 세션 2)

### 완료된 작업
1. [결재 캐시 무효화] - `060d3e8`
   - ReportDetail에서 결재/취소/삭제 후 TanStack Query 캐시 자동 무효화
   - `queryClient.invalidateQueries` 추가 (approvals + reports 키)

2. [보고서 상세 Client 전환] - `060d3e8`
   - `reports/[id]/page.tsx`: 서버 컴포넌트 130줄 → thin client 9줄
   - `ReportDetail.tsx`: props 7개 → `reportId` 1개, useAuth + 4개 쿼리 훅 사용
   - `queries/reports.ts`: useReportDetail, useReportPrograms, useReportNewcomers, useApprovalHistory 추가
   - 부서 접근 제한/결재 권한 체크 클라이언트에서 처리

3. [반려 재제출 기능] - `da87061`
   - 반려 사유 표시 카드 (빨간색) + "수정 후 재제출" 버튼
   - `edit/page.tsx`: rejected 상태도 수정 허용 (기존 draft만 가능)
   - `ReportForm.tsx`: 재제출 시 반려 필드(rejected_by, rejection_reason) 초기화
   - 재제출 시 결재 알림 발송 (기존엔 신규 제출만)

4. [셀 관리 페이지] - `8c0d68b`
   - `/settings/cells` 신규 페이지 (관리자 전용)
   - `CellManager.tsx`: 부서 선택 → 셀 CRUD (추가, 인라인 이름 수정, 순서 변경, 활성/비활성)
   - `departments.ts`: useAllCells, useCreateCell, useUpdateCell, useReorderCells 훅 추가
   - Sidebar + Header에 "셀 관리" 메뉴 추가

### 커밋 이력
- `060d3e8` - Refactor all pages to useAuth + TanStack Query client pattern (18파일)
- `da87061` - Add rejected report resubmission flow (3파일)
- `8c0d68b` - Add cell management page for admin users (5파일)

---

## 작업 내역 (2026-02-10, 세션 1)

### 완료된 작업
1. [페이지 로딩 최적화 Phase 2] - 나머지 5개 페이지 변환 완료
   - Dashboard, Members, Reports, Attendance, Users → useAuth + TanStack Query
   - 새 파일: `queries/dashboard.ts`, `queries/users.ts`, `MembersClient.tsx`, `AttendanceClient.tsx`, `UsersClient.tsx`
2. [문서 업데이트] - 05-components, 06-api

### 참고사항
- 전체 12개 페이지 모두 `useAuth()` + TanStack Query 패턴으로 전환 완료 (edit/new 포함)
- 아키텍처 교훈: 서버 컴포넌트 방식은 매번 서버 fetch → 캐싱 불가. 클라이언트 훅이 정답

---

## 작업 내역 (2026-02-09)

### 완료된 작업
1. [보고서 통계 대시보드] - 커밋 `5f99845`
2. [셀별 필터 기능] - DB + 타입 + 쿼리 + UI (4개 페이지)
3. [웹 푸시 알림 구현] - 커밋 `8055f38` ~ `4693462`
4. [iOS PWA 호환성 수정]
5. [Supabase 보안/성능 Advisor 해결]

---

## 작업 내역 (2026-02-08)

### 완료된 작업
1. [교인 사진 일괄 업로드] - BulkPhotoUpload 컴포넌트
2. [보고서 삭제 기능] - 관리자 전용

---

## 작업 내역 (2026-02-16, 세션 7)

### 완료된 작업
1. [셀장보고서 출석 토글 버그 수정] - PDCA 완료
   - **버그**: 셀장보고서에서 셀원 출석 체크 버튼을 눌러도 반응 없음
   - **근본 원인**: useCellAttendanceRecords 훅의 구조분해 기본값이 매 렌더마다 새 배열 참조 생성 → useEffect 의존성 매번 변경 → 토글 즉시 리셋
   - **수정 내용**:
     1. useMemo로 cellRecordsData 참조 안정화 (Line 224)
     2. useEffect guard: cellMembers 동일하면 prev 반환 (Lines 232-237)
   - **결과**: PDCA Check 100% Match Rate (gap-detector 분석 완료)
   - **배포**: Vercel 프로덕션 배포 완료
   - **문서**:
     - Gap Analysis: `docs/03-analysis/cell-attendance-toggle-fix.analysis.md`
     - Completion Report: `docs/04-report/cell-attendance-toggle-fix.report.md`
     - Changelog: `docs/04-report/changelog.md` (신규 생성)

### PDCA 사이클 정보
- Phase: Plan → Design → Do → Check → Act (✅ 모두 완료)
- Match Rate: 100% (7/7 항목 일치)
- Quality Score: 98/100
- Duration: 2 days (2026-02-14 ~ 2026-02-16)

---

## 다음 작업

### 우선순위 높음
- [ ] 푸시 알림 E2E 테스트

### 우선순위 중간
- [ ] 보고서 인쇄 기능 개선
- [ ] ReportForm 컴포넌트 분할 (970+ lines 최적화)

### 완료
- [x] ~~셀별 필터 기능~~ (완료 2/9)
- [x] ~~셀 관리 페이지~~ (완료 2/10)
- [x] ~~보고서 상세 Client 전환~~ (완료 2/10)
- [x] ~~결재 캐시 무효화~~ (완료 2/10)
- [x] ~~반려 재제출~~ (완료 2/10)
- [x] ~~보고서 열람 권한 제한~~ (완료 2/10)
- [x] ~~푸시 알림 테스트~~ (완료 2/10, 67개 테스트)
- [x] ~~새신자 → 교인 전환~~ (완료 2/10)
- [x] ~~edit/new 페이지 Client 전환~~ (완료 2/10)
- [x] ~~셀장 보고서 추가~~ (완료 2/10)
- [x] ~~TanStack Query 성능 최적화~~ (완료 2/10, 전체 수동 fetch 0개 달성)

---

## 참고사항
- **Supabase 이메일 확인 OFF**: 회원가입 시 이메일 발송 안 함
- **사용자 승인 필드**: `is_active` (is_approved 아님)
- **Supabase Storage**: member-photos 버킷
- **보고서 삭제 순서**: report_programs → newcomers → approval_history → attendance_records → notifications → report_photos → weekly_reports
- **셀 관리**: `/settings/cells` (관리자 전용), 모든 부서에 셀 추가 가능
- **결재 흐름**: draft → submitted → coordinator_reviewed → manager_approved → final_approved (rejected에서 재제출 가능)
- **보고서 열람 권한**: `canViewReport()` in permissions.ts, `is_team_leader` 플래그로 팀장/셀장 구분
- **cu1 팀장**: 김효정, 김선웅 (is_team_leader=true), 나머지는 셀장 (is_team_leader=false)
- **새신자 전환**: 보고서 상세 → "교인 전환" 버튼 → `/members/new?newcomerId=xxx` → 등록 후 `converted_to_member_id` 업데이트
- **셀장 보고서**: report_type=`cell_leader`, 필드: meeting_title(셀 모임명), attendees(참석자), main_content(나눔 내용), application_notes(기도제목), report_photos(사진)
