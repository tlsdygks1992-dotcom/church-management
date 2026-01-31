# 청파중앙교회 교육위원회 관리 시스템 - 기술 스택 구조도

## Core Framework

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 16.1.6 | App Router, SSR/SSG, Turbopack |
| **React** | 19.2.3 | UI 라이브러리 |
| **TypeScript** | 5.x | 타입 안정성 |
| **Tailwind CSS** | 4.x | 유틸리티 기반 스타일링 |

## Backend / Database

| 기술 | 용도 |
|------|------|
| **Supabase** | PostgreSQL DB, Auth, Realtime, Storage |
| `@supabase/ssr` | 서버 컴포넌트용 클라이언트 |
| `@supabase/supabase-js` | 클라이언트 SDK |

### Supabase 주요 테이블
- `users` - 사용자 (역할: super_admin, president, accountant, team_leader, member)
- `departments` - 부서 (ck, cu_worship, youth, cu1, cu2, leader)
- `members` - 교인 명단
- `weekly_reports` - 보고서 (weekly, meeting, education 유형)
- `attendance_records` - 출결 기록
- `notifications` - 알림
- `push_subscriptions` - 푸시 구독

## UI 라이브러리

| 기술 | 버전 | 용도 |
|------|------|------|
| **Tiptap** | 3.18.x | 리치 텍스트 에디터 (보고서 작성) |
| **Recharts** | 3.7.x | 통계 차트 시각화 |
| **xlsx** | 0.18.5 | Excel 내보내기 |
| **@floating-ui/dom** | 1.7.x | 툴팁/팝오버 위치 계산 |

## 디렉토리 구조

```
src/
├── app/
│   ├── (auth)/               # 인증 페이지 (로그인, 승인대기)
│   │   ├── login/            # 로그인/회원가입
│   │   └── pending/          # 승인 대기
│   │
│   ├── (dashboard)/          # 메인 기능 (인증 필요)
│   │   ├── dashboard/        # 대시보드
│   │   ├── attendance/       # 출결 관리
│   │   ├── reports/          # 보고서 CRUD
│   │   │   ├── new/          # 보고서 작성
│   │   │   └── [id]/         # 보고서 상세/수정
│   │   ├── members/          # 교인 명단
│   │   │   ├── new/          # 교인 등록
│   │   │   └── [id]/         # 교인 상세
│   │   ├── users/            # 사용자 관리
│   │   ├── stats/            # 통계
│   │   ├── approvals/        # 결재함
│   │   └── guide/            # 사용 안내
│   │
│   ├── api/
│   │   └── notifications/    # 알림 API (GET/PATCH)
│   │
│   ├── layout.tsx            # 루트 레이아웃
│   ├── page.tsx              # 랜딩 페이지
│   └── globals.css           # 전역 스타일
│
├── components/
│   ├── layout/               # 레이아웃 컴포넌트
│   │   ├── Header.tsx        # 모바일 헤더
│   │   └── Sidebar.tsx       # 데스크톱 사이드바
│   │
│   ├── reports/              # 보고서 관련
│   │   ├── ReportForm.tsx    # 보고서 작성/수정 폼
│   │   ├── ReportDetail.tsx  # 보고서 상세 뷰
│   │   └── ReportPrintView.tsx # 인쇄용 뷰
│   │
│   ├── members/              # 교인 관련
│   │   ├── MemberList.tsx    # 교인 목록
│   │   └── MemberForm.tsx    # 교인 등록/수정 폼
│   │
│   ├── attendance/           # 출결 관련
│   │   └── AttendanceGrid.tsx # 출결 체크 그리드
│   │
│   ├── notifications/        # 알림 관련
│   │   ├── NotificationBell.tsx  # 알림 벨 + 드롭다운
│   │   └── NotificationItem.tsx  # 개별 알림 아이템
│   │
│   ├── users/                # 사용자 관리
│   │   └── UserManagement.tsx # 사용자 목록/권한 관리
│   │
│   ├── stats/                # 통계 관련
│   │   └── StatsCharts.tsx   # 차트 컴포넌트 (동적 임포트)
│   │
│   └── ui/                   # 공통 UI
│       ├── RichTextEditor.tsx # Tiptap 에디터
│       └── Skeleton.tsx      # 스켈레톤 로더
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # 브라우저 클라이언트 (싱글톤)
│   │   ├── server.ts         # 서버 클라이언트
│   │   └── middleware.ts     # 미들웨어 헬퍼
│   ├── notifications.ts      # 알림 생성 유틸리티
│   └── excel.ts              # Excel 내보내기 유틸리티
│
├── types/
│   └── database.ts           # Supabase 타입 정의
│
└── middleware.ts             # Next.js Auth 미들웨어
```

## 인증 흐름

```
[사용자] → [middleware.ts] → 인증 체크
                ↓
        인증됨? → (dashboard)/* 페이지 접근
        미인증? → /login 리다이렉트
                ↓
        승인됨(is_active)? → 대시보드 진입
        미승인? → /pending 페이지
```

## 결재 워크플로우

```
draft → submitted → coordinator_reviewed → manager_approved → final_approved
  ↓         ↓              ↓                    ↓                  ↓
작성자    회장검토      부장결재           목사최종결재         완료
        (president)   (accountant)      (super_admin)

* 각 단계에서 rejected 상태로 반려 가능
* 반려 시 작성자에게 알림 발송
```

## 알림 시스템

### Phase 1: 인앱 알림 (완료)
- Supabase Realtime 구독
- 헤더/사이드바 벨 아이콘
- 읽음/모두 읽음 처리

### Phase 2: 웹 푸시 (예정)
- Service Worker
- 백그라운드 알림

## 배포

| 항목 | 값 |
|------|-----|
| **플랫폼** | Vercel |
| **프로덕션 URL** | https://church-eight-delta.vercel.app |
| **배포 명령어** | `npx vercel --prod` |
| **GitHub** | https://github.com/onapond/church-management |

## 성능 최적화 적용 사항

1. **Supabase 클라이언트 싱글톤** - 중복 인스턴스 방지
2. **Optimistic Updates** - 알림/삭제 시 즉시 UI 반영
3. **번들 최적화** - Recharts 동적 임포트 (~180KB 절감)
4. **쿼리 병렬화** - Promise.all로 순차 호출 → 병렬 처리
5. **컴포넌트 메모이제이션** - useMemo, useCallback 활용

## 개발 명령어

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run lint         # ESLint 검사
npx tsc --noEmit     # 타입 체크
npx vercel --prod    # Vercel 배포
```
