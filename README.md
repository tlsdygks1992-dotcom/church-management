# 청파중앙교회 교육위원회 관리 시스템

교회 교육부서의 출결 관리, 보고서 작성/결재, 교인 관리, 회계 관리를 위한 웹 애플리케이션입니다.

**프로덕션**: https://church-eight-delta.vercel.app

## 기술 스택

Next.js 16 (App Router) | TypeScript | Supabase | TanStack Query | Tailwind CSS v4

## 시작하기

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` 파일에 Supabase 키를 설정해야 합니다. 자세한 내용은 기술 명세서를 참고하세요.

## 문서

| 문서 | 대상 | 설명 |
|------|------|------|
| [기술 명세서](docs/TECHNICAL_SPEC.md) | 개발자 | 아키텍처, DB, API, 권한 등 전체 기술 사양 |
| [사용자 안내서](docs/USER_GUIDE.md) | 교회 담당자 | 시스템 사용법 단계별 안내 |
| [상세 문서](docs/status/) | 개발자 | 시스템/기능/워크플로우/DB/컴포넌트/API 개별 문서 |

## 주요 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm test             # 테스트 (93개)
npx tsc --noEmit     # 타입 체크
npx vercel --prod    # 배포
```
