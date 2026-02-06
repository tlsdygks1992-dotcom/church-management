# 세션 노트

## 최근 작업 (2026-02-06)

### 문서 정리 완료 (커밋: f8511fc)
- 구식 파일 3개 삭제 (723줄), session-notes/CLAUDE.md 경량화
- docs/status/ 3개 파일 업데이트 (리팩토링 인프라 반영)
- bugs.md Netlify 관련 버그 아카이브

### 대규모 리팩토링 완료 (커밋: cc4691e)
6 Phase 리팩토링 + 5개 후속 개선을 모두 완료하고 Vercel 배포함.

**Phase 0~6 요약:**
- Phase 0: Claude 스킬 8개 설치
- Phase 1: 기반 인프라 (shared types, permissions, hooks, errors, constants, utils)
- Phase 2: TanStack Query + Auth Context Provider
- Phase 3: 컴포넌트 분해 (MemberForm→3개, MemberList→5개, ReportForm→5개)
- Phase 4: 코드 품질 (constants, utils 통합)
- Phase 5: 테스트 인프라 (vitest, 34개 테스트)
- Phase 6: 보안 (rate-limit)

**후속 개선 5개:**
- TanStack Query 훅을 MemberList, AccountingLedger, NotificationBell에 적용
- useAuth()로 Header/Sidebar prop drilling 제거
- rate-limit을 /api/notifications GET/PATCH에 적용
- ErrorBoundary: error.tsx (글로벌 + 대시보드)
- Toast: ToastProvider 글로벌 Context, 7개 컴포넌트 alert→toast 전환

### 이전 작업 (2026-02-05 이전)
상세 내역은 `docs/REPORT/` 일일 보고서 참조:
- 2026-02-05: 회계장부 체크박스, CU 부서, 5가지 핵심 개선
- 2026-02-03: PWA 로딩 성능 최적화
- 2026-02-02: 대시보드 SSR, 쿼리 병렬화
- 2026-01-31: 다중 부서, 알림 시스템, Tiptap 에디터, Vercel 이전
- 2026-01-30: 보고서 3유형, 리더 부서, Netlify 배포

---

## 다음 작업

### 우선순위 높음
- [ ] Lighthouse 재측정 및 성능 확인
- [ ] 웹 푸시 알림 (Phase 2) - Service Worker, 백그라운드 알림
- [ ] iPhone Safari PWA 테스트

### 우선순위 중간
- [ ] 보고서 통계 대시보드 - 부서별/유형별 보고서 현황
- [ ] 새신자 → 정식 교인 전환 기능
- [ ] 보고서 인쇄 기능 개선

---

## 참고사항
- **Supabase 이메일 확인 OFF**: 회원가입 시 이메일 발송 안 함 (Rate limit 해결)
- **사용자 승인 필드**: `is_active` (is_approved 아님)
- **Supabase Storage**: member-photos 버킷
- **Supabase Realtime**: notifications 테이블 구독 활성화 필요
