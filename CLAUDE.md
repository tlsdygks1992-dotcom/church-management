# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 청파중앙교회 교육위원회 관리 시스템

## 프로젝트 개요
- **앱 이름**: 청파중앙교회 교육위원회 관리 시스템
- **기술 스택**: Next.js 16.1.6, Supabase, TypeScript, Tailwind CSS v4
- **배포**: Vercel (https://church-eight-delta.vercel.app)
- **GitHub**: https://github.com/onapond/church-management

## 시작 시 필수 확인 문서
**새 세션 시작 시 반드시 아래 파일들을 먼저 읽어주세요:**
1. `.claude/session-notes.md` - 최근 작업 내역 및 다음 작업
2. `.claude/bugs.md` - 알려진 버그 및 해결 이력
3. `docs/REACT_BEST_PRACTICES.md` - React/Next.js 성능 최적화 가이드 (57개 규칙)

## 기능 분석 문서
상세 문서는 `docs/status/` 폴더를 참조:
- [01-system-overview.md](docs/status/01-system-overview.md) - 기술 스택, 아키텍처
- [02-features.md](docs/status/02-features.md) - 페이지별 기능 목록
- [03-workflow.md](docs/status/03-workflow.md) - 결재/인증/알림 워크플로우
- [04-database.md](docs/status/04-database.md) - 테이블 구조, ERD
- [05-components.md](docs/status/05-components.md) - 컴포넌트 구조
- [06-api.md](docs/status/06-api.md) - API, 유틸리티

## 컨텍스트 관리 규칙

**컨텍스트가 90% 이상 사용되기 전에** `.claude/session-notes.md`에 작업 내역 요약:
- 완료된 작업, 진행 중인 작업 (중단 지점 명시)
- 다음에 해야 할 작업, 관련 파일 경로
- 주요 결정사항 및 이유

## 코드 작성 규칙

### 성능 최적화
**코드 작성 시 `docs/REACT_BEST_PRACTICES.md`를 참조하세요.** 자주 적용할 규칙:
- URL 상태는 `useEffect` 대신 파생 상태로 직접 계산
- 모달/팝업은 별도 `memo` 컴포넌트로 분리
- 이벤트 핸들러는 `useCallback`으로 메모이제이션
- 무거운 컴포넌트는 `next/dynamic`으로 동적 임포트

### 일반
- 한글 주석/메시지 사용 (한국 교회 시스템)
- TypeScript strict mode 준수
- 컴포넌트는 `'use client'` 또는 서버 컴포넌트로 명확히 구분

### 파일 구조
```
src/
├── app/
│   ├── (dashboard)/     # 인증 필요 페이지
│   │   ├── dashboard/, attendance/, reports/, members/
│   │   ├── accounting/, approvals/, photos/
│   │   ├── error.tsx    # 대시보드 ErrorBoundary
│   │   └── layout.tsx   # AuthProvider + ToastProvider 래핑
│   ├── api/             # API 라우트
│   └── error.tsx        # 글로벌 ErrorBoundary
├── components/
│   ├── layout/          # Header, Sidebar (useAuth() 사용)
│   ├── reports/         # ReportForm + 서브컴포넌트 4개
│   ├── members/         # MemberForm + 서브컴포넌트 6개
│   ├── accounting/      # 회계장부, 지출결의서
│   ├── dashboard/       # 대시보드 위젯
│   ├── notifications/   # NotificationBell
│   └── ui/              # Toast, ErrorBoundary 등
├── providers/           # AuthProvider, QueryProvider, ToastProvider
├── queries/             # TanStack Query 훅 (departments, members, reports 등)
├── hooks/               # useDebounce, useToast
├── lib/
│   ├── supabase/        # 서버/클라이언트 Supabase 클라이언트
│   ├── permissions.ts   # 중앙화된 권한 체크
│   ├── constants.ts     # 공통 상수
│   ├── utils.ts         # 유틸리티 함수
│   ├── errors.ts        # 커스텀 에러 클래스
│   └── rate-limit.ts    # API rate limiting
└── types/
    ├── database.ts      # DB 타입 정의
    └── shared.ts        # 공유 인터페이스
```

### Supabase
- 서버: `import { createClient } from '@/lib/supabase/server'`
- 클라이언트: `import { createClient } from '@/lib/supabase/client'`
- 타입: `src/types/database.ts` 참조

### 스타일링
- Tailwind CSS v4, 모바일 우선 설계
- 반응형: `lg:` 프리픽스로 데스크톱 스타일 구분

## 배포 프로세스
```bash
git add . && git commit -m "커밋 메시지" && git push origin main
npx vercel --prod
```
- **프로덕션 URL**: https://church-eight-delta.vercel.app
- GitHub 자동 배포 미연결 (수동 배포 필요)

## 주요 테이블
- `users`: 사용자 (역할: super_admin, president, accountant, team_leader, member)
- `departments`: 부서 (ck, cu_worship, youth, cu1, cu2, leader)
- `members`: 교인 명단
- `weekly_reports`: 보고서 (weekly, meeting, education)
- `attendance_records`: 출결 기록
- `notifications`: 알림
- `accounting_records`: 회계장부
- `expense_requests`: 지출결의서

## 자주 사용하는 명령어
```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 빌드
npm test             # vitest 테스트 (34개)
npx tsc --noEmit     # 타입 체크
npx vercel --prod    # Vercel 프로덕션 배포
```

## 아키텍처

### 인증 흐름
- `src/middleware.ts` → Supabase 세션 갱신
- `src/providers/AuthProvider.tsx` → useAuth() Context 제공
- `src/app/(dashboard)/layout.tsx` → 미인증 시 `/login` 리다이렉트

### 결재 워크플로우
`draft` → `submitted` → `coordinator_reviewed` → `manager_approved` → `final_approved`
- 상태 변경 시 `approval_history` 이력 저장 + 알림 발송

### 다중 부서 지원
- `member_departments` 조인 테이블, `is_primary` 플래그
- 쿼리: `members` → `member_departments` → `departments` 조인

### 성능 패턴
- Supabase 클라이언트 싱글톤, Optimistic Updates
- Recharts 동적 임포트, URL searchParams 파생 상태
- 리스트 `useMemo`, 이벤트 `useCallback`, 모달 `memo` 분리
