# 시스템 개요

## 프로젝트 소개

청파중앙교회 교육위원회 관리 시스템은 교회 교육부서의 출결 관리, 보고서 작성 및 결재, 교인 관리를 위한 웹 애플리케이션입니다.

### 기본 정보

| 항목 | 내용 |
|------|------|
| 앱 이름 | 청파중앙교회 교육위원회 관리 시스템 |
| 프로덕션 URL | https://church-eight-delta.vercel.app |
| GitHub | https://github.com/onapond/church-management |
| 호스팅 | Vercel |

## 기술 스택

### 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.1.6 | React 프레임워크 (App Router) |
| TypeScript | - | 타입 안전성 |
| Tailwind CSS | v4 | 스타일링 |
| Recharts | - | 차트 시각화 |
| Tiptap | - | 리치 텍스트 에디터 |

### 백엔드/인프라

| 기술 | 용도 |
|------|------|
| Supabase | 데이터베이스, 인증, 스토리지 |
| Vercel | 배포, CDN |

### 주요 라이브러리

```
@supabase/supabase-js       # Supabase 클라이언트
@supabase/ssr               # 서버 사이드 Supabase
recharts                    # 차트 라이브러리
@tiptap/react               # 리치 텍스트 에디터
xlsx                        # 엑셀 내보내기
```

## 배포 정보

### Vercel 배포

```bash
# 프로덕션 배포 명령어
npx vercel --prod
```

- 배포 대시보드: https://vercel.com/onaponds-projects/church
- GitHub 자동 배포: 미연결 (수동 배포)

### 환경 변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 |

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   브라우저    │  │   모바일     │  │   태블릿     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (CDN)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Next.js 16.1.6                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │ App Router │  │ API Routes │  │ Middleware │         │   │
│  │  │  (pages)   │  │  (/api)    │  │ (auth)     │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │     Auth     │  │   Storage    │          │
│  │  (database)  │  │ (이메일/PW)  │  │ (사진 저장)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 폴더 구조

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 페이지 그룹
│   │   ├── login/                # 로그인/회원가입
│   │   └── pending/              # 승인 대기
│   ├── (dashboard)/              # 대시보드 페이지 그룹
│   │   ├── dashboard/            # 대시보드 홈
│   │   ├── attendance/           # 출결 관리
│   │   ├── reports/              # 보고서
│   │   ├── members/              # 교인 관리
│   │   ├── stats/                # 통계
│   │   ├── approvals/            # 결재함
│   │   ├── users/                # 사용자 관리
│   │   └── guide/                # 안내 페이지
│   └── api/                      # API 라우트
│       └── notifications/        # 알림 API
├── components/                   # React 컴포넌트
│   ├── layout/                   # Header, Sidebar
│   ├── reports/                  # 보고서 관련
│   ├── members/                  # 교인 관련
│   ├── attendance/               # 출결 관련
│   ├── stats/                    # 통계 차트
│   ├── users/                    # 사용자 관리
│   ├── notifications/            # 알림
│   └── ui/                       # 공용 UI
├── lib/                          # 유틸리티
│   ├── supabase/                 # Supabase 클라이언트
│   ├── notifications.ts          # 알림 유틸리티
│   └── excel.ts                  # 엑셀 내보내기
└── types/                        # TypeScript 타입
    └── database.ts               # DB 스키마 타입
```

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# ESLint 검사
npm run lint

# TypeScript 타입 체크
npx tsc --noEmit

# Vercel 프로덕션 배포
npx vercel --prod
```

## 부서 구조

| 코드 | 이름 | 설명 |
|------|------|------|
| ck | 유치부 솔트 | 유치부 |
| cu_worship | CU워십 | 청년부 워십팀 |
| youth | 청소년부 | 청소년 |
| cu1 | CU1부 | 청년부 1부 |
| cu2 | CU2부 | 청년부 2부 |
| leader | 리더 | 리더 그룹 |

## 성능 최적화

### 적용된 최적화 기법

1. **Supabase 클라이언트 싱글톤** - 인스턴스 재사용으로 메모리 효율화
2. **Optimistic Updates** - UI 즉시 반영 후 API 호출
3. **동적 임포트** - Recharts 차트 라이브러리 지연 로딩 (~180KB 절감)
4. **API 쿼리 병렬화** - Promise.all로 순차 쿼리 병렬 처리
5. **컴포넌트 메모이제이션** - useMemo, useCallback, React.memo 활용
