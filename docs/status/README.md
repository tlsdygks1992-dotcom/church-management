# 청파중앙교회 교육위원회 관리 시스템 - 기능 분석 문서

이 폴더는 청파중앙교회 교육위원회 관리 시스템의 구현된 기능을 체계적으로 정리한 문서입니다.

## 문서 목록

| 문서 | 설명 |
|------|------|
| [01-system-overview.md](./01-system-overview.md) | 시스템 개요, 기술 스택, 배포 정보, 전체 아키텍처 |
| [02-features.md](./02-features.md) | 구현된 기능 목록, 페이지별 기능 설명 |
| [03-workflow.md](./03-workflow.md) | 결재 워크플로우, 인증 흐름, 알림 시스템, 권한 체계 |
| [04-database.md](./04-database.md) | 데이터베이스 구조, 테이블 목록, ERD, Enum 값 |
| [05-components.md](./05-components.md) | 컴포넌트 구조, 레이아웃/페이지/공용 UI 컴포넌트 |
| [06-api.md](./06-api.md) | Supabase 클라이언트, API 라우트, 유틸리티 함수 |

## 시스템 개요

- **앱 이름**: 청파중앙교회 교육위원회 관리 시스템
- **기술 스택**: Next.js 16.1.6, Supabase, TypeScript, Tailwind CSS v4
- **배포 URL**: https://church-eight-delta.vercel.app
- **GitHub**: https://github.com/onapond/church-management

## 주요 기능 요약

1. **출결 관리** - 부서별 예배/모임 출석 체크
2. **보고서 시스템** - 주차/모임/교육 보고서 작성 및 결재
3. **교인 관리** - 교인 명단, 다중 부서 소속, 생일 관리
4. **통계** - 부서별 출석률 시각화
5. **알림 시스템** - 인앱 알림, 결재 워크플로우 연동
6. **사용자 관리** - 역할 및 부서 할당, 승인 관리

## 문서 업데이트 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-31 | 초기 문서 작성 |
