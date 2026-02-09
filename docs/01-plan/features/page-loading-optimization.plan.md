# Plan: 교적프로그램 페이지별 이동 시 로딩 개선

> 작성일: 2026-02-10
> 상태: Draft

## 1. 배경 (Background)

교회 관리 시스템에서 대시보드 하위 페이지 간 이동 시 로딩이 느린 문제가 있다.
현재 9개 페이지 중 4개가 클라이언트 컴포넌트(`'use client'`)로 구현되어 있어,
페이지 진입 시 JS 번들 다운로드 → `useEffect` 폭포수 fetch → 리렌더링이 발생한다.

## 2. 현황 분석 (Current State)

### 페이지별 로딩 패턴

| 페이지 | 컴포넌트 타입 | 데이터 fetch 방식 | 예상 로딩 시간 | 문제 |
|--------|:------------:|:--:|:--:|------|
| Dashboard | Server | `Promise.all` 5개 병렬 | ~1초 | 양호 |
| Members | Server | `Promise.all` 2개 병렬 | ~0.8초 | 양호 |
| Attendance | Server | 3단계 직렬 쿼리 | ~1.2초 | 직렬 쿼리 |
| Reports | Server | `Promise.all` 2개 병렬 | ~0.8초 | 양호 |
| **Accounting** | **Client** | `useEffect` 2단계 직렬 | **~1.5초** | **폭포수 fetch** |
| **Approvals** | **Client** | `useEffect` 1단계 | **~1.2초** | **CSR 로딩** |
| **Photos** | **Client** | `useEffect` 2단계 직렬 | **~1.3초** | **폭포수 fetch** |
| **Stats** | **Client** | `useEffect` 2단계 직렬 + 동적임포트 | **~1.5초** | **폭포수 + 번들** |
| Users/Settings | Server | 직렬 쿼리 | ~0.8초 | 양호 |

### 현재 로딩 플로우 (클라이언트 컴포넌트 페이지)

```
1. Middleware (세션 검증)           ~100ms
2. Layout (사용자 정보 쿼리)         ~300ms
3. JS 번들 다운로드                  ~200ms
4. useEffect 1: 사용자/부서 조회     ~300ms  ← 중복! (Layout에서 이미 조회)
5. useEffect 2: 실제 데이터 조회     ~400ms  ← 1단계 완료 후에야 시작
6. 리렌더링                          ~100ms
─────────────────────────────────────────────
총                                  ~1.4초 (빈 화면/스피너 시간)
```

### 핵심 문제 3가지

1. **사용자 정보 중복 조회**: Layout에서 이미 조회하는 user를 각 페이지에서 다시 fetch
2. **useEffect 폭포수**: 데이터 의존성 체이닝으로 직렬 fetch 발생
3. **TanStack Query 미사용**: Accounting, Approvals, Photos, Stats에서 캐싱 없이 직접 fetch

## 3. 목표 (Goals)

| 지표 | 현재 | 목표 |
|------|------|------|
| 최악 페이지(Accounting) 로딩 | ~1.5초 | ~0.8초 이하 |
| 페이지 이동 시 빈 화면 시간 | 0.5~1초 | 0초 (즉시 스켈레톤) |
| 사용자 정보 중복 조회 | 4개 페이지 | 0개 |
| TanStack Query 미사용 페이지 | 4개 | 0개 |

## 4. 구현 방안 (Options)

### 방안 A: 서버 컴포넌트 전환 + URL 상태 관리 (추천)

클라이언트 컴포넌트 4개 페이지를 서버 컴포넌트로 전환하고,
필터 등 상태를 URL `searchParams`로 관리한다.

**장점**: 로딩 시간 대폭 단축 (서버에서 데이터와 HTML 함께 전송)
**단점**: 기존 코드 구조 변경 폭이 큼 (4개 페이지 전면 재작성)

### 방안 B: TanStack Query 전환 + Prefetch (추천)

기존 클라이언트 구조 유지하되:
1. `useEffect` 직접 fetch → TanStack Query 훅으로 교체 (캐싱 활용)
2. 사용자 정보는 `useAuth()`에서 가져와 중복 제거
3. Layout에서 `<Link prefetch>` 활용
4. 로딩 UI 개선 (스켈레톤 컴포넌트)

**장점**: 기존 구조 유지하면서 점진적 개선 가능
**단점**: 서버 컴포넌트만큼 빠르진 않음

### 방안 C: 하이브리드 (A + B 혼합)

- Accounting, Stats → 서버 컴포넌트 전환 (가장 느린 2개)
- Approvals, Photos → TanStack Query 전환 (비교적 간단)
- 공통: 로딩 UI 개선 + prefetch

**장점**: 효과 대비 작업량 균형
**단점**: 2가지 패턴 혼합 (방안 A, B 모두 수행)

## 5. 영향 범위 (Impact)

### 변경 파일 (방안 B 기준 - 추천)

| 파일 | 변경 내용 |
|------|----------|
| `src/app/(dashboard)/accounting/page.tsx` | TanStack Query 훅 사용, useAuth() 활용 |
| `src/app/(dashboard)/approvals/page.tsx` | TanStack Query 훅 사용, useAuth() 활용 |
| `src/app/(dashboard)/photos/page.tsx` | TanStack Query 훅 사용, useAuth() 활용 |
| `src/app/(dashboard)/stats/page.tsx` | TanStack Query 훅 사용, useAuth() 활용 |
| `src/queries/accounting.ts` | 신규: 회계 데이터 TanStack Query 훅 |
| `src/queries/approvals.ts` | 신규: 결재 데이터 TanStack Query 훅 |
| `src/queries/photos.ts` | 신규: 사진 데이터 TanStack Query 훅 |
| `src/queries/stats.ts` | 신규: 통계 데이터 TanStack Query 훅 |
| `src/app/(dashboard)/loading.tsx` | 스켈레톤 UI 개선 |

### 부작용

- 기존 필터/정렬 동작은 유지됨 (TanStack Query로 감싸기만 함)
- Optimistic Update가 필요한 경우 추가 작업 필요 (현재 이 4개 페이지는 읽기 전용이므로 해당 없음)

## 6. 구현 단계 (Steps)

### 단계 1: TanStack Query 훅 생성 (4개 파일)
- `src/queries/accounting.ts` - `useAccountingRecords`, `useExpenseRequests`
- `src/queries/approvals.ts` - `useApprovals`
- `src/queries/photos.ts` - `useReportPhotos`
- `src/queries/stats.ts` - `useAttendanceStats`

### 단계 2: 4개 페이지 리팩토링
- `useState` + `useEffect` → TanStack Query 훅으로 교체
- 사용자 정보: `useAuth()`에서 가져오기 (중복 fetch 제거)
- 로딩 상태: `isLoading` 플래그 활용

### 단계 3: 로딩 UX 개선
- 대시보드 `loading.tsx` 스켈레톤 UI 개선
- 각 페이지 로딩 시 콘텐츠 영역만 스켈레톤 표시 (Header/Sidebar 유지)

## 7. 검증 방법 (Verification)

- 각 페이지 이동 시 로딩 시간 측정 (DevTools Performance 탭)
- TanStack Query DevTools로 캐시 히트 확인
- 페이지 재방문 시 즉시 렌더링 확인 (staleTime 활용)
- `npx tsc --noEmit` 타입 체크 통과
- `npm run build` 빌드 성공
