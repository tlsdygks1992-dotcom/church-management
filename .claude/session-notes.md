# 청파중앙교회 교육위원회 관리 시스템 - 세션 노트

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
