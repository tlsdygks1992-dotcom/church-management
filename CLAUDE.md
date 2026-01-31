# 청파중앙교회 교육위원회 관리 시스템 - 개발 가이드

## 프로젝트 개요
- **앱 이름**: 청파중앙교회 교육위원회 관리 시스템
- **기술 스택**: Next.js 16.1.6, Supabase, TypeScript, Tailwind CSS v4
- **배포**: Vercel (https://church-eight-delta.vercel.app)
- **GitHub**: https://github.com/onapond/church-management

## 시작 시 필수 확인 문서
**새 세션 시작 시 반드시 아래 파일들을 먼저 읽어주세요:**
1. `.claude/session-notes.md` - 최근 작업 내역 및 프로젝트 컨텍스트
2. `.claude/bugs.md` - 알려진 버그 및 해결 이력

## 컨텍스트 관리 규칙

### 세션 노트 작성 조건
**컨텍스트가 90% 이상 사용되기 전에** 반드시 다음을 수행:
1. `.claude/session-notes.md`에 작업 내역 요약 추가
2. 다음 세션에서 맥락을 이어갈 수 있도록 상세히 기록:
   - 완료된 작업
   - 진행 중인 작업 (중단된 부분 명시)
   - 다음에 해야 할 작업
   - 관련 파일 경로
   - 주요 결정사항 및 이유

### 세션 노트 형식
```markdown
## 작업 내역 (YYYY-MM-DD)

### 완료된 작업
1. [기능명] - 설명
   - 관련 파일: `src/...`

### 진행 중 / 미완료
- [작업명]: 현재 상태, 중단 지점

### 다음 작업
- [ ] 작업1
- [ ] 작업2

### 참고사항
- 중요한 결정사항이나 주의점
```

## 코드 작성 규칙

### 일반
- 한글 주석/메시지 사용 (한국 교회 시스템)
- TypeScript strict mode 준수
- 컴포넌트는 `'use client'` 또는 서버 컴포넌트로 명확히 구분

### 파일 구조
```
src/
├── app/
│   ├── (dashboard)/     # 인증 필요 페이지
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── reports/
│   │   ├── members/
│   │   └── ...
│   └── api/             # API 라우트
├── components/
│   ├── layout/          # Header, Sidebar
│   ├── reports/         # 보고서 관련
│   ├── members/         # 교인 관련
│   └── notifications/   # 알림 관련
├── lib/
│   ├── supabase/        # Supabase 클라이언트
│   └── ...
└── types/
    └── database.ts      # DB 타입 정의
```

### Supabase
- 서버: `import { createClient } from '@/lib/supabase/server'`
- 클라이언트: `import { createClient } from '@/lib/supabase/client'`
- 타입: `src/types/database.ts` 참조

### 스타일링
- Tailwind CSS v4 사용
- 반응형: `lg:` 프리픽스로 데스크톱 스타일 구분
- 모바일 우선 설계

## 배포 프로세스

### Vercel 배포 (현재 사용)
```bash
# 1. 코드 변경 후 커밋
git add .
git commit -m "커밋 메시지"
git push origin main

# 2. Vercel에 배포
npx vercel --prod
```

- **프로덕션 URL**: https://church-eight-delta.vercel.app
- **Vercel 대시보드**: https://vercel.com/onaponds-projects/church

### 참고
- GitHub 자동 배포 미연결 (수동 배포 필요)
- 이전 Netlify 배포는 무료 플랜 한도 초과로 중단됨

## 주요 테이블
- `users`: 사용자 (역할: super_admin, president, accountant, team_leader, member)
- `departments`: 부서 (ck, cu_worship, youth, cu1, cu2, leader)
- `members`: 교인 명단
- `weekly_reports`: 보고서 (weekly, meeting, education 유형)
- `attendance_records`: 출결 기록
- `notifications`: 알림
- `push_subscriptions`: 푸시 구독

## 자주 사용하는 명령어
```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 빌드
npx tsc --noEmit     # 타입 체크
npx vercel --prod    # Vercel 프로덕션 배포
```
