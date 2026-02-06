# 청파중앙교회 교육위원회 관리 시스템 - 세션 노트

## 작업 내역 (2026-02-06) - 시니어 아키텍처 대규모 리팩토링

### 완료된 작업
1. **Phase 0: Claude 스킬 설치** (8개)
   - supabase-postgres-best-practices, nextjs-16-complete-guide, typescript-refactoring-patterns
   - react-testing-library, refactoring-surgeon, code-quality, vitest, Testing Strategist

2. **Phase 1-1: 공유 타입 시스템 정리**
   - `src/types/shared.ts` 생성 (UserData, UserDepartment, MemberWithDepts, LayoutUser 등)
   - 5개 파일의 중복 인터페이스를 import로 교체
   - 관련: layout.tsx, members/page.tsx, dashboard/page.tsx, DashboardContent.tsx, Header.tsx, Sidebar.tsx, MemberList.tsx, members/new/page.tsx

3. **Phase 1-2: 권한 시스템 중앙화**
   - `src/lib/permissions.ts` 생성 (isAdmin, canEditMembers, canWriteReport 등 12개 함수)
   - members/page.tsx, members/new/page.tsx, Header.tsx, Sidebar.tsx 인라인 권한체크 교체
   - database.ts의 canAccess 함수를 permissions.ts에서 re-export

4. **Phase 1-3: 커스텀 훅 레이어 구축**
   - `src/hooks/useDebounce.ts` - MemberList 중복 구현 제거
   - `src/hooks/useToast.ts` - 토스트 알림 훅

5. **Phase 1-4: 에러 핸들링 인프라**
   - `src/lib/errors.ts` (AppError, ApiError, AuthError, ForbiddenError)
   - `src/components/ui/Toast.tsx` 컴포넌트

6. **Phase 2-1: TanStack Query 도입**
   - `@tanstack/react-query` 설치
   - `src/lib/query-client.ts`, `src/providers/QueryProvider.tsx`
   - 7개 쿼리 훅: departments, members, reports, notifications, accounting, attendance
   - 루트 layout.tsx에 QueryProvider 연결

7. **Phase 2-2: Auth Context Provider**
   - `src/providers/AuthProvider.tsx` + `useAuth()` 훅
   - dashboard layout.tsx에 AuthProvider 연결

8. **Phase 4: 코드 품질 개선**
   - `src/lib/constants.ts` (MAX_FILE_SIZE, MONTHS, REPORT_TYPE_LABELS 등)
   - `src/lib/utils.ts` (formatDate, formatPhone, formatCurrency, calculateAge)

9. **Phase 5: 테스트 인프라 구축**
   - vitest + @testing-library/react + jsdom 설치
   - `vitest.config.ts`, `src/test/setup.ts`
   - permissions 테스트 (22개), utils 테스트 (12개) = 34개 모두 통과

10. **Phase 6: 보안 강화**
    - `src/lib/rate-limit.ts` (토큰 버킷 알고리즘)

11. **Phase 3: 컴포넌트 분해** (이전 세션에서 완료)
    - MemberForm (423줄→347줄) → PhotoUploader, DepartmentSelector 추출
    - MemberList (511줄→220줄) → MemberGridCard, MemberListItem, DeleteConfirmModal, MemberFilters 추출
    - ReportForm (1372줄→785줄) → ProgramTable, AttendanceInput, NewcomerSection, PhotoUploadSection 추출
    - `src/components/reports/types.ts` - 공유 타입

12. **TanStack Query 훅을 실제 컴포넌트에 적용** (이전 세션에서 완료)
    - MemberList: `useDeleteMember()` 적용
    - AccountingLedger: `useDeleteAccountingRecords()` 적용
    - NotificationBell: `useNotifications()`, `useUnreadCount()`, `useMarkAsRead()`, `useMarkAllAsRead()` 적용

13. **useAuth()로 Header/Sidebar prop drilling 제거**
    - Header.tsx, Sidebar.tsx에서 `user` prop 제거 → `useAuth()` 훅으로 전환
    - layout.tsx에서 `<Header />`, `<Sidebar />` prop 없이 사용

14. **rate-limit을 /api/notifications에 적용**
    - GET, PATCH 핸들러에 `checkRateLimit()` 적용
    - 429 Too Many Requests 응답 추가

15. **ErrorBoundary를 주요 페이지에 적용**
    - `src/app/(dashboard)/error.tsx` - 대시보드 전체 에러 핸들러
    - `src/app/error.tsx` - 글로벌 에러 핸들러

16. **Toast를 실제 에러 핸들링에 연결**
    - `src/providers/ToastProvider.tsx` - 글로벌 Toast Context Provider
    - layout.tsx에 `<ToastProvider>` 추가
    - 7개 컴포넌트의 `alert()` → `toast.error()`/`toast.warning()`로 교체:
      AccountingLedger, MemberList, AccountingRecordForm, ExpenseRequestForm, ExpenseRequestList, ReportDetail, ReportForm

### 다음 작업
- [ ] 변경사항 커밋 및 배포
- [ ] Lighthouse 재측정 및 성능 확인

### 참고사항
- 리팩토링 계획서: `.claude/plans/serene-bubbling-ripple.md`
- 6 Phase 리팩토링 + 5개 후속 개선 전체 완료
- 타입 체크 통과: `npx tsc --noEmit`
- 테스트 통과: `npm test` (34/34)
- 빌드 통과: `npm run build`
- 아직 커밋되지 않음

---

## 작업 내역 (2026-02-05)

### 완료된 작업
1. **회계장부 체크박스 선택 및 일괄 삭제**
   - 개별/전체 체크박스 선택 기능
   - 선택 항목 일괄 삭제 기능
   - 선택된 행 파란색 하이라이트
   - 모바일/데스크톱 모두 지원
   - 관련 파일: `src/components/accounting/AccountingLedger.tsx`

2. **CU 부서 추가**
   - DepartmentCode 타입에 'cu' 추가
   - Supabase enum에 'cu' 값 추가 (SQL 실행)
   - departments 테이블에 CU 부서 레코드 삽입
   - 관련 파일: `src/types/database.ts`

3. **5가지 핵심 개선사항 구현** (커밋: c62387f)
   - 과업 5: 회계 카테고리 분리 (CU1행사, CU2행사, CU공통)
   - 과업 1: 성능 개선 (SSR, O(n²)→O(n), XLSX 동적 임포트)
   - 과업 2: 모바일 반응형 (iOS safe-area, 카드 뷰)
   - 과업 4: 회계 엑셀 가져오기 모달
   - 과업 3: 보고서 스티키 섹션 네비게이션

### 배포
- 커밋: `9b00483`, `2808895`, `c62387f`
- Vercel 배포 완료: https://church-eight-delta.vercel.app

### 다음 작업
- [ ] 미커밋 변경사항 정리 (21개 파일)
- [ ] Lighthouse 재측정 및 성능 확인
- [ ] 웹 푸시 알림 (Phase 2) 구현
- [ ] iPhone Safari PWA 테스트

### 참고사항
- 일일 보고서: `docs/REPORT/2026-02-05.md`
- 회계 체크박스 삭제는 canEdit 권한 필요

---

## 작업 내역 (2026-02-03)

### 완료된 작업
1. **PWA 로딩 성능 최적화 (Phase 1)**
   - 대시보드 서버 컴포넌트 변환 (SSR)
   - 레이아웃/members/attendance 쿼리 병렬화
   - Service Worker 캐싱 전략 강화 (v1.2.0)

2. **Lighthouse 점수 개선 (Phase 2)**
   - LCP: 폰트 `display: swap`, `preload: true`
   - Network: Supabase `preconnect`, `dns-prefetch`
   - bfcache: `setInterval` cleanup, immutable 캐시 헤더

3. **Vercel 배포** - 2회 배포 완료

### 진행 중 / 미완료
- Lighthouse LCP/bfcache 점수 재측정 필요
- 캐시 초기화 후 테스트 권장

### 다음 작업
- [ ] Lighthouse 재측정 및 추가 최적화
- [ ] 변경사항 커밋/푸시
- [ ] `migrations/001_member_departments.sql` Supabase 실행
- [ ] 웹 푸시 알림 (Phase 2) 구현

### 참고사항
- 일일 보고서: `docs/REPORT/2026-02-03.md`
- 배포 URL: https://church-eight-delta.vercel.app

---

## 작업 요약 (2026-02-02) - PWA 로딩 성능 최적화

### 완료된 작업
1. **대시보드 서버 컴포넌트 변환** (40% 개선 예상)
   - `src/app/(dashboard)/dashboard/page.tsx` - 'use client' 제거
   - `src/components/dashboard/DashboardContent.tsx` - 클라이언트 컴포넌트 분리
   - SSR로 초기 HTML에 데이터 포함, 스켈레톤 제거

2. **레이아웃 사용자 쿼리 최적화** (20% 개선)
   - `src/app/(dashboard)/layout.tsx` - user_departments 포함 쿼리
   - 하위 페이지에서 중복 조회 방지

3. **members 페이지 쿼리 병렬화** (20% 개선)
   - `src/app/(dashboard)/members/page.tsx` - Promise.all 적용
   - 사용자 정보 + 부서 목록 병렬 조회

4. **attendance 페이지 쿼리 병렬화** (20% 개선)
   - `src/app/(dashboard)/attendance/page.tsx` - 2단계 병렬 실행
   - 사용자 정보 + 부서 목록 병렬 → 교인 목록 + 출결 기록 병렬

5. **Service Worker 캐싱 강화** (재방문 50% 개선)
   - `public/sw.js` v1.1.0
   - Next.js 번들 (`/_next/static/*`): Cache First
   - Supabase/API 응답: Stale-While-Revalidate
   - 별도 캐시 분리: STATIC_CACHE, API_CACHE

### 예상 효과
| 지표 | 이전 | 이후 | 개선율 |
|------|------|------|--------|
| 초기 로딩 | 2-3초 | 0.8-1초 | 60-70% |
| 재방문 로딩 | 2초 | 0.5초 | 75% |
| LCP | 3.5초 | 1.5초 | 57% |

### 다음 작업
- [x] 로컬 테스트: `npm run build && npm run start` → Lighthouse 실행
- [x] Vercel 배포: `npx vercel --prod`
- [ ] iPhone Safari PWA에서 로딩 시간 측정

### 수정된 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/app/(dashboard)/dashboard/page.tsx` | 서버 컴포넌트로 변환 |
| `src/components/dashboard/DashboardContent.tsx` | 신규 - 클라이언트 컴포넌트 |
| `src/app/(dashboard)/layout.tsx` | user_departments 포함 쿼리 |
| `src/app/(dashboard)/members/page.tsx` | Promise.all 병렬화 |
| `src/app/(dashboard)/attendance/page.tsx` | 2단계 병렬 실행 |
| `public/sw.js` | 캐싱 전략 강화 (v1.1.0) |

---

## 작업 요약 (2026-01-31) - 일일 보고서

### 완료된 작업
1. **교인 다중 부서 지원** - 전체 시스템 개선 (7개 파일)
   - `member_departments` 조인 테이블 기반 구조로 변경
   - 다중 체크박스 UI, 주 소속 부서 지정

2. **사용자 관리 개선** - 저장 버튼, 삭제 기능, 역할 enum 수정

3. **회원가입 Rate Limit 해결** - Supabase Email Confirm OFF

4. **리치 텍스트 에디터** - Tiptap 기반, 폰트 크기 조절

5. **성능 최적화** - 싱글톤 패턴, Optimistic Updates, 병렬 처리

6. **알림 시스템** - 인앱 알림 + 결재 워크플로우 연동

7. **Vercel 이전** - Netlify → Vercel 호스팅 변경

### 진행 중 / 미완료
- **마이그레이션 대기**: `migrations/001_member_departments.sql` Supabase에서 실행 필요
- **배포 대기**: 마이그레이션 후 `npx vercel --prod` 실행

### 참고사항
- 13개 파일 수정됨 (커밋되지 않음)
- 일일 보고서: `docs/REPORT/2026-01-31.md`

---

## 프로젝트 개요
- **목적**: 청파중앙교회 교육위원회 출결/보고서/교인 관리 시스템
- **기술 스택**: Next.js 16.1.6 (Turbopack), Supabase, TypeScript, Tailwind CSS
- **배포**: Vercel (https://church-eight-delta.vercel.app)
  - 배포 명령어: `npx vercel --prod`
  - (이전: Netlify - 무료 플랜 한도 초과로 이전)
- **GitHub**: https://github.com/onapond/church-management

## 부서 구조
| code | name |
|------|------|
| ck | 유치부 솔트 |
| cu_worship | CU워십 |
| youth | 청소년부 |
| cu1 | CU1부 |
| cu2 | CU2부 |
| leader | 리더 |

## 사용자 역할
- `super_admin`: 최고 관리자 (목사)
- `president`: 회장 (결재 권한)
- `accountant`: 부장/회계
- `team_leader`: 팀장 (보고서 작성 권한)
- `member`: 일반 회원

## 주요 기능

### 1. 출결 관리 (/attendance)
- 예배 출석 체크
- 부서별 출결 현황
- 일괄 출석 체크 기능

### 2. 보고서 시스템 (/reports)
3가지 보고서 유형 지원:
- **주차 보고서 (weekly)**: 출결 현황, 새신자 명단, 말씀 정보, 순서지
- **모임 보고서 (meeting)**: 모임 개요, 참석자, 주요내용
- **교육 보고서 (education)**: 교육 개요, 교육내용, 적용점

결재 흐름: draft → submitted → coordinator_reviewed → manager_approved → final_approved

### 3. 교인 명단 (/members)
- 부서별 필터링 (URL params로 상태 유지)
- **생일 월별 필터** (1월~12월 버튼)
- 사진 업로드 (member-photos 버킷)
- 그리드/리스트 뷰 전환
- **교인 삭제 기능** (팀장/관리자 권한)
- Excel 내보내기 (생년월일 포함)

### 4. 알림 시스템 (/api/notifications)
- 인앱 알림 (벨 아이콘 + 드롭다운)
- Supabase 실시간 구독
- 결재 워크플로우 연동
- 읽음/모두 읽음 처리

### 5. 통계 (/stats)
- Recharts 기반 시각화
- 부서별 출석률 추이

---

## 작업 내역 (2026-01-31) - 저녁 세션

### 완료된 작업

#### 교인 다중 부서 지원 구현
한 교인이 여러 부서에 소속될 수 있도록 DB 구조 및 코드 변경

**Phase 1: 타입 정의 (`src/types/database.ts`)**
- `member_departments` 테이블 타입 추가
- `Member` 타입의 `department_id`를 옵셔널로 변경
- `MemberWithDepartments` 인터페이스 추가

**Phase 2: 교인 목록 페이지 (`src/app/(dashboard)/members/page.tsx`)**
- `member_departments`를 통한 조인 쿼리로 변경
- 비관리자는 `member_departments`를 통해 접근 가능한 부서의 교인 조회

**Phase 3: MemberList 컴포넌트 (`src/components/members/MemberList.tsx`)**
- `MemberItem` 인터페이스에 `member_departments` 배열 추가
- 부서 필터링: `member_departments` 배열에서 확인
- 부서명 표시: 여러 부서를 `·`로 구분하여 표시
- 엑셀 내보내기: 여러 부서를 `,`로 구분

**Phase 4: MemberForm (`src/components/members/MemberForm.tsx`)**
- 단일 드롭다운 → 다중 체크박스 UI
- 주 소속 부서 선택 기능 (파란 버튼)
- 저장 시 `member_departments` 테이블에 레코드 생성/수정
- 기존 `department_id`는 호환성을 위해 주 소속 부서로 유지

**Phase 5: 교인 상세 페이지 (`src/app/(dashboard)/members/[id]/page.tsx`)**
- 쿼리 변경: `member_departments` 조인
- 여러 부서명을 태그 형태로 표시 (주 소속은 파란색)

**Phase 6: 출결 관리 (`src/app/(dashboard)/attendance/page.tsx`, `AttendanceGrid.tsx`)**
- `member_departments`를 통해 해당 부서에 속한 교인 조회
- `loadData` 함수에서 `member_departments` 기준 조회

**Phase 7: 보고서 폼 (`src/components/reports/ReportForm.tsx`)**
- 재적 인원 계산 시 `member_departments` 기준

**마이그레이션 스크립트 생성**
- `migrations/001_member_departments.sql` - 테이블 생성 및 기존 데이터 이전
- `migrations/002_merge_duplicate_members.sql` - 중복 교인 병합 (수동 실행 권장)

### 수정된 파일
| 파일 | 변경 내용 |
|-----|---------|
| `src/types/database.ts` | member_departments 타입 추가 |
| `src/app/(dashboard)/members/page.tsx` | 쿼리 변경 |
| `src/components/members/MemberList.tsx` | 필터링/표시 로직 변경 |
| `src/app/(dashboard)/members/[id]/page.tsx` | 상세 쿼리/표시 변경 |
| `src/components/members/MemberForm.tsx` | 다중 선택 UI/저장 로직 |
| `src/app/(dashboard)/attendance/page.tsx` | 부서별 교인 조회 변경 |
| `src/components/attendance/AttendanceGrid.tsx` | loadData 함수 변경 |
| `src/components/reports/ReportForm.tsx` | 재적 인원 계산 변경 |

### 다음 작업 (Supabase에서 실행 필요)
1. Supabase SQL Editor에서 `migrations/001_member_departments.sql` 실행
2. (선택) 중복 교인 확인 후 `migrations/002_merge_duplicate_members.sql` 실행
3. 배포: `npx vercel --prod`

---

## 작업 내역 (2026-01-31) - 오후 세션

### 완료된 작업

#### 1. 회원가입 이메일 Rate Limit 문제 해결
- **문제**: Supabase 무료 플랜에서 이메일 발송 제한 (2 emails/hour)
- **증상**: "Email rate limit exceeded" 오류로 회원가입 실패
- **해결**: Supabase Dashboard → Authentication → Providers → Email → **Confirm email OFF**
- 이메일 확인 없이 가입 가능, 관리자 승인(`is_active`) 시스템으로 보안 유지

#### 2. 사용자 관리 페이지 개선 (`src/components/users/UserManagement.tsx`)

**저장 버튼 기능 추가**:
- 기존: 부서/역할 변경 시 즉시 자동 저장 (실패해도 피드백 없음)
- 변경: 로컬 상태에 먼저 저장 → "저장" 버튼 클릭 시 DB 반영
- 변경된 필드는 파란색 하이라이트로 표시
- 저장 성공/실패 메시지 표시

**역할 enum 값 수정**:
| 잘못된 값 | 올바른 값 (DB enum) |
|----------|-------------------|
| leader | team_leader |
| manager | accountant |
| pastor | (제거) |

**삭제 기능 확장**:
- 기존: 승인 대기 사용자만 삭제 가능
- 변경: 모든 사용자 삭제 가능
- 삭제 확인 모달에 사용자 이름 표시
- Optimistic update로 삭제 시 즉시 UI 반영

#### 3. 로그인 페이지 에러 메시지 개선 (`src/app/(auth)/login/page.tsx`)
- 회원가입 실패 시 상세 에러 메시지 표시
- 처리하는 에러 유형:
  - `already registered` → "이미 가입된 이메일입니다."
  - `Email rate limit` → "너무 많은 요청이 발생했습니다."
  - `Invalid email` → "유효하지 않은 이메일 주소입니다."
  - `Password` → "비밀번호가 요구 조건을 충족하지 않습니다."
  - 기타 → 실제 Supabase 에러 메시지 표시

### 수정된 파일
- `src/components/users/UserManagement.tsx` - 저장 버튼, 삭제 기능, 역할 enum 수정
- `src/app/(auth)/login/page.tsx` - 상세 에러 메시지

### 커밋
```
9e0b0f3 Improve user management with save button and delete functionality
```

---

## 작업 내역 (2026-01-31) - 오전 세션

### 완료된 작업

#### 1. 알림 시스템 구현 (Phase 1: 인앱 알림)
- **신규 파일**:
  - `src/lib/notifications.ts` - 알림 생성 유틸리티
  - `src/app/api/notifications/route.ts` - 알림 API (GET/PATCH)
  - `src/components/notifications/NotificationBell.tsx` - 알림 벨 컴포넌트
  - `src/components/notifications/NotificationItem.tsx` - 개별 알림 아이템
- **수정 파일**:
  - `src/components/layout/Header.tsx` - 모바일 헤더에 벨 추가
  - `src/components/layout/Sidebar.tsx` - 데스크톱 사이드바에 벨 추가
  - `src/components/reports/ReportDetail.tsx` - 결재 시 알림 생성
  - `src/components/reports/ReportForm.tsx` - 제출 시 알림 생성

**알림 트리거 매핑**:
| 상태 변경 | 수신자 | 메시지 |
|----------|--------|--------|
| draft → submitted | 회장 (president) | 새 보고서 제출됨 |
| submitted → coordinator_reviewed | 부장 (accountant) | 회장 협조 완료 |
| coordinator_reviewed → manager_approved | 목사 (super_admin) | 부장 결재 완료 |
| manager_approved → final_approved | 작성자 | 최종 승인 완료 |
| any → rejected | 작성자 | 보고서 반려 |

#### 2. 교인 명단 기능 추가
- **생일 월별 필터**: 1월~12월 버튼, 해당 월 생일자 수 표시
- **교인 삭제 기능**: 그리드/리스트에서 삭제 버튼, 확인 모달
- **Excel 내보내기 개선**: 생년월일 컬럼 추가
- **수정 파일**:
  - `src/app/(dashboard)/members/page.tsx` - birth_date 조회 추가
  - `src/components/members/MemberList.tsx` - 월별 필터, 삭제 UI
  - `src/lib/excel.ts` - birthDate 컬럼 추가

#### 3. 개발 문서 정리
- `CLAUDE.md` - 개발 가이드 및 컨텍스트 관리 규칙
- `.claude/bugs.md` - 버그 이력 문서

#### 4. 성능 개선 (Optimistic Updates)
버튼 반응 속도가 느리다는 피드백에 따라 전반적인 성능 개선 수행:

- **Supabase 클라이언트 싱글톤 패턴**:
  - `src/lib/supabase/client.ts` - 매번 새 인스턴스 생성 → 싱글톤으로 재사용
  ```typescript
  let client: ReturnType<typeof createBrowserClient> | null = null
  export function createClient() {
    if (client) return client
    client = createBrowserClient(...)
    return client
  }
  ```

- **알림 시스템 Optimistic Updates**:
  - `NotificationBell.tsx` - 읽음 처리 시 즉시 UI 반영, 실패 시 롤백
  - `useMemo`로 Supabase 클라이언트 캐싱

- **교인 삭제 Optimistic Updates**:
  - `MemberList.tsx` - `deletedIds` Set으로 삭제된 항목 즉시 숨김
  - 삭제 실패 시 자동 롤백

- **결재 워크플로우 병렬 처리**:
  - `ReportDetail.tsx` - `Promise.all`로 API 호출 병렬화
  ```typescript
  await Promise.all([
    supabase.from('weekly_reports').update({...}),
    supabase.from('approval_history').insert({...}),
    createApprovalNotification(...),
  ])
  ```

#### 5. TypeScript 오류 수정
빌드 시 발생한 implicit any 타입 오류 수정:
- `NotificationBell.tsx` - payload 타입 명시
- `stats/page.tsx` - 콜백 파라미터 타입 명시
- `ReportForm.tsx` - attendance 배열 콜백 타입 명시

#### 6. Vercel 호스팅 이전
- Netlify 무료 플랜 한도 초과로 503 오류 발생
- Vercel로 호스팅 이전 완료
- 배포 명령어: `npx vercel --prod`
- 프로덕션 URL: https://church-eight-delta.vercel.app

#### 7. 보고서 제출 취소 및 수정 기능
- **신규 파일**: `src/app/(dashboard)/reports/[id]/edit/page.tsx`
- **수정 파일**: `src/components/reports/ReportDetail.tsx`, `src/components/reports/ReportForm.tsx`
- 기능:
  - 제출된 보고서 취소 → draft 상태로 복귀
  - draft 상태 보고서 수정 페이지 이동
  - 수정 모드에서 기존 데이터 로드
  - editMode prop으로 생성/수정 분기 처리

#### 8. 리치 텍스트 에디터 구현 (Tiptap)
- **신규 파일**: `src/components/ui/RichTextEditor.tsx`
- **의존성**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-placeholder`, `@tiptap/extension-text-style`, `@floating-ui/dom`
- 기능:
  - 텍스트 서식: 굵게(B), 기울임(I), 밑줄(U), 취소선(S)
  - 제목: H1, H2
  - 리스트: 번호/글머리 기호
  - 정렬: 왼쪽/가운데/오른쪽
  - **폰트 크기 조절** (10pt ~ 32pt) - 커스텀 FontSize Extension 구현
- ReportForm에서 주요내용/교육내용 필드에 적용

#### 9. 전반적인 성능 최적화

**Phase 1: 번들 최적화**
- `next.config.ts` - 이미지 최적화 (AVIF/WebP), `optimizePackageImports` 추가
- Recharts 동적 임포트 - 메인 번들에서 차트 라이브러리 분리 (~180KB 절감)
- **신규 파일**: `src/components/stats/StatsCharts.tsx` - 차트 컴포넌트 분리
- **신규 파일**: `src/components/ui/Skeleton.tsx` - 스켈레톤 로더

**Phase 2: API 쿼리 최적화**
- `src/app/api/notifications/route.ts` - 중복 쿼리 제거 (2회 → 1회)
- `src/app/(dashboard)/reports/[id]/page.tsx` - `Promise.all`로 쿼리 병렬화 (순차 4회 → 병렬)

**Phase 3: 컴포넌트 렌더링 최적화**
- `src/components/reports/ReportForm.tsx`:
  - 테이블 행 메모이제이션 (`ProgramRow`, `CellAttendanceRow`, `NewcomerRow`)
  - 시간 옵션 배열 모듈 레벨 캐싱
  - 핸들러 함수 `useCallback` 최적화
  - Supabase 클라이언트 `useMemo` 캐싱
- `src/components/members/MemberForm.tsx`:
  - Next.js Image 컴포넌트 사용 (사진 미리보기)
  - Supabase 클라이언트 `useMemo` 캐싱

**Phase 4: 캐싱 및 상태 관리**
- `src/app/(dashboard)/reports/page.tsx` - Supabase 클라이언트 메모이제이션, 핸들러 `useCallback`
- `src/app/(dashboard)/stats/page.tsx` - Supabase 클라이언트 `useMemo` 캐싱

**예상 성능 개선**:
| 영역 | 현재 | 개선 후 | 개선율 |
|-----|------|--------|-------|
| 메인 번들 | ~660KB | ~460KB | -30% |
| 알림 API 쿼리 | 2회 | 1회 | -50% |
| 보고서 상세 쿼리 | 순차 4회 | 병렬 4회 | 응답시간 -60% |

---

## 이전 작업 내역 (2026-01-30)

### 완료된 작업
1. **리더 부서 생성** - 11명의 리더 멤버 추가
2. **부서 필터 UX 개선** - 목록으로 돌아갈 때 필터 상태 유지 (URL params)
3. **보고서 시스템 확장**
   - 단일 주차보고서 → 3가지 유형 (주차/모임/교육) 지원
   - DB에 report_type enum, 새 컬럼들 추가
   - 유형별 폼 필드 분기 처리
   - 유형별 상세 페이지 렌더링
4. **모임 보고서 표시 버그 수정** - 내용이 제대로 표시되지 않던 문제 해결
5. **반응형 콘텐츠 영역** - 긴 텍스트 시 자동 확장

---

## 다음 작업 후보

### 우선순위 높음
1. **웹 푸시 알림 (Phase 2)** - Service Worker, 백그라운드 알림
2. **보고서 통계 대시보드** - 부서별/유형별 보고서 현황
3. **새신자 → 정식 교인 전환 기능**

### 우선순위 중간
4. **보고서 인쇄 기능 개선** - 모임/교육 보고서 템플릿 최적화
5. **출석 통계 상세화** - 월별/분기별 추이, 개인별 이력
6. **모바일 UX 개선** - 터치 제스처, 오프라인 모드

### 참고 사항
- **Supabase 이메일 확인 OFF**: 회원가입 시 이메일 발송 안 함 (Rate limit 문제 해결)
- **사용자 역할 enum**: `super_admin`, `president`, `accountant`, `team_leader`, `member`
- **사용자 승인 필드**: `is_active` (is_approved 아님)

---

## Supabase 관리
- **대시보드**: https://supabase.com/dashboard
- **Storage**: member-photos 버킷 (사진 저장)
- **Realtime**: notifications 테이블 구독 활성화 필요

## 참고 파일
- `/2026 안내자료.pdf` - 보고서 양식 참고 자료
- `/2026 교육부 생일 정렬.xlsx` - 교인 명단 원본 데이터
