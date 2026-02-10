# 세션 노트

## 작업 내역 (2026-02-10)

### 완료된 작업
1. [페이지 로딩 최적화 Phase 2] - 나머지 5개 페이지 변환 완료
   - Dashboard: `DashboardContent` → useAuth + 4개 대시보드 훅
   - Members: 새 `MembersClient` 래퍼 → useAuth + useDepartments + useMembers
   - Reports: `ReportListClient` → useAuth + useDepartments (props 제거)
   - Attendance: 새 `AttendanceClient` 래퍼 → useAuth + useDepartments + 초기 로드
   - Users: 새 `UsersClient` 래퍼 → useAuth + useAllUsers + useDepartments
   - 새 파일: `queries/dashboard.ts`, `queries/users.ts`, `MembersClient.tsx`, `AttendanceClient.tsx`, `UsersClient.tsx`
   - TypeScript 검사 통과, 빌드 성공, Vercel 배포 완료
   - **미커밋** (배포는 완료)

2. [문서 업데이트] - 05-components, 06-api 업데이트

### 참고사항
- 전체 9개 페이지 모두 `useAuth()` + TanStack Query 패턴으로 전환 완료
- 아키텍처 교훈: 서버 컴포넌트 방식은 매번 서버 fetch 필요 → 캐싱 불가. 클라이언트 훅이 정답
- 코드량 약 365줄 감소 (서버 로직 제거, 클라이언트 훅으로 대체)

---

## 작업 내역 (2026-02-09)

### 완료된 작업
1. [보고서 통계 대시보드] - `/stats` 페이지에 탭 UI로 추가
   - 출결 통계 | 보고서 통계 탭 전환
   - 요약 카드 4개, 차트 4개, 부서별 상세 테이블
   - 관련 파일: `src/components/stats/ReportStatsCharts.tsx`, `ReportStatsContent.tsx`
   - 커밋: `5f99845`

2. [셀별 필터 기능 - 단계 1] - DB + 타입 + 쿼리 훅
   - Supabase 마이그레이션: `cells` 테이블 생성, `member_departments.cell_id` 추가
   - 초기 데이터: cu1 부서에 1셀~6셀 삽입
   - `database.ts`, `shared.ts`, `constants.ts`, `departments.ts` 업데이트
   - **미커밋** (로컬 변경 상태)

3. [셀별 필터 기능 - 단계 2] - UI 적용 (4개 페이지)
   - `CellFilter.tsx` 공통 컴포넌트 신규 생성
   - 교인 명단: MemberFilters + MemberList (cell URL 파라미터)
   - 교인 등록/수정: DepartmentSelector + MemberForm (cell_id 저장)
   - 출결 관리: AttendanceGrid (셀 필터 + memberCellMap)
   - 통계: stats/page.tsx (셀 필터 + 데이터 쿼리 필터링)
   - TypeScript 검사 통과, 빌드 성공
   - **미커밋** (로컬 변경 상태)

4. [웹 푸시 알림 구현] - 전체 완료
   - 서버: `src/lib/push.ts`, `src/app/api/push/{subscribe,unsubscribe,send}/route.ts`
   - 클라이언트: `src/components/notifications/PushPermission.tsx`
   - 커밋: `8055f38` ~ `4693462` (10개 커밋)

5. [iOS PWA 호환성 수정] - 근본 원인 해결
   - `cache.addAll()` → 개별 `cache.add` + PWA 아이콘 생성

6. [Supabase 보안/성능] - Security/Performance Advisor 전체 해결

7. [문서 업데이트] - 02-features, 04-database, 05-components, 06-api (셀 필터 + 푸시 반영)

### 참고사항
- `cells` 테이블: cu1 부서 전용, 1셀~6셀 (display_order로 정렬)
- `CellFilter` 컴포넌트: cu1 선택 시에만 표시, React.memo 적용
- `useCells()` 훅: staleTime 10분
- 셀 필터 변경 시 URL `?dept=xxx&cell=yyy`로 유지 (교인 명단)
- 부서 변경 시 셀 자동 초기화 ('all')

---

## 작업 내역 (2026-02-08)

### 완료된 작업
1. [교인 사진 일괄 업로드] - BulkPhotoUpload 컴포넌트
2. [보고서 삭제 기능] - 관리자 전용

---

## 다음 작업

### 우선순위 높음
- [ ] 셀별 필터 기능 커밋 및 배포
- [ ] 단계 3: 셀 관리 페이지 (관리자 CRUD) - `settings/cells`
- [ ] 푸시 알림 E2E 테스트

### 우선순위 중간
- [x] ~~보고서 통계 대시보드~~ (완료 2/9)
- [x] ~~셀별 필터 기능 단계 1~2~~ (완료 2/9, 미커밋)
- [ ] 새신자 → 정식 교인 전환 기능
- [ ] 보고서 인쇄 기능 개선

---

## 참고사항
- **Supabase 이메일 확인 OFF**: 회원가입 시 이메일 발송 안 함
- **사용자 승인 필드**: `is_active` (is_approved 아님)
- **Supabase Storage**: member-photos 버킷
- **보고서 삭제 순서**: report_programs → newcomers → approval_history → attendance_records → notifications → report_photos → weekly_reports
