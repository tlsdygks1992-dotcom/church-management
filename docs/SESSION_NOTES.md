# 세션 노트 - 2026년 1월 30일

## 프로젝트 정보

- **프로젝트명**: 청파중앙교회 교육위원회 통합 관리 시스템
- **GitHub**: https://github.com/onapond/church-management
- **Supabase 프로젝트**: https://zikneyjidzovvkmflibo.supabase.co
- **배포 URL**: https://church-management-cpcc.netlify.app

---

## 오늘 완료한 작업 (2026-01-30)

### 1. Netlify 배포 완료
- [x] Vercel 로그인 문제로 Netlify로 대체
- [x] `netlify.toml` 설정 파일 생성
- [x] 환경 변수 설정 완료
- [x] 프로덕션 배포 완료: https://church-management-cpcc.netlify.app

### 2. 회원가입 + 관리자 승인 시스템
- [x] 로그인 페이지에 회원가입 탭 추가
- [x] 신규 가입자 자동 `is_approved = FALSE` 설정
- [x] 승인 대기 페이지 (`/pending`) 생성
- [x] 사용자 관리 페이지 (`/users`) - 관리자 전용
- [x] 미들웨어에서 승인 상태 체크 및 리디렉션
- [x] DB 트리거: 회원가입 시 자동으로 `users` 테이블에 레코드 생성

### 3. 모바일 반응형 전면 개선
- [x] 대시보드 - 카드, 통계, 빠른 작업 반응형
- [x] 출결 관리 - 컨트롤/테이블 모바일 최적화
- [x] 교인 명단 - 그리드/리스트 뷰 반응형
- [x] 보고서 목록/상세 - 모바일 레이아웃 개선
- [x] 결재 타임라인 - 모바일에서 세로 표시
- [x] 모바일 헤더에 관리자 메뉴 추가

### 4. 사용자 계정 설정
- [x] 신요한 계정 생성 (`yohan@church.com` / `super_admin`)
- [x] 교육부 총괄로 설정 (CU 회장)

### 5. RLS 정책 수정
- [x] 관리자 사용자 업데이트 권한 추가
- [x] 트리거용 INSERT 정책 추가

### 6. 성능 최적화
- [x] `MemberList.tsx` - 검색 디바운싱 (300ms), React.memo 적용
- [x] `AttendanceGrid.tsx` - useMemo/useCallback으로 재렌더링 최소화
- [x] 출결 레코드 Map으로 O(1) 조회 성능 개선
- [x] `next/image` 최적화 (Supabase 스토리지 도메인 설정)
- [x] 컴포넌트 메모이제이션 (MemberRow, MemberGridCard, MemberListItem)

### 7. 인쇄 기능 개선
- [x] 팝업 → iframe 방식으로 변경 (모바일 호환)
- [x] 인쇄 옵션 모달 추가 (기본 인쇄 / 네트워크 프린터 IP)
- [x] 프린터 IP localStorage 저장
- [x] 모바일 무선 인쇄 안내 추가

### 8. 부서 구조 업데이트
- [x] `department_code` enum에 `cu_worship` 추가
- [x] 부서 데이터 업데이트:
  - `ck` → 유치부/아동부
  - `cu_worship` → CU워십
  - `youth` → 청소년부
  - `cu1` → 1청년
  - `cu2` → 2청년

### 9. 출석 일괄 체크 기능
- [x] "전체" 버튼 - 모든 교인 한번에 출석 체크
- [x] "초기화" 버튼 - 모든 교인 결석 처리
- [x] 예배/모임 각각 일괄 처리 가능

### 10. 통계 차트 추가 (recharts)
- [x] 라인 차트 - 주간 예배/모임 출석 추이
- [x] 바 차트 - 주간 출석 비교
- [x] 파이 차트 2개 - 부서별 예배/모임 출석 분포
- [x] 가로 바 차트 - 부서별 출석률 비교

### 11. 엑셀 내보내기 기능 (xlsx)
- [x] `src/lib/excel.ts` 유틸리티 생성
- [x] 교인 명단 내보내기 (이름, 연락처, 부서, 상태, 등록일)
- [x] 출결 기록 내보내기 (이름, 날짜, 예배O/X, 모임O/X)
- [x] 통계 내보내기 (부서, 재적, 출석 횟수, 출석률)

---

## 기억해야 할 사항

### 계정 정보

| 구분 | 정보 |
|------|------|
| 관리자 계정 | `yohan@church.com` (super_admin, CU 회장) |
| 테스트 계정 | `test@church.com` / `test1234` |
| GitHub 계정 | `onapond` |

### 조직 구조

```
교육부
├── 신요한 (CU 회장, super_admin) - 모든 권한
├── 강현숙 (교육부 부장, manager) - 결재 권한 (계정 미생성)
├── 전홍균 (교육부 목사, pastor) - 최종 확인 (계정 미생성)
│
├── CK (유치부/아동부)
└── CU
    ├── CU워십
    ├── 청소년부
    ├── 1청년
    └── 2청년
```

### 데이터베이스

| 테이블 | 용도 |
|--------|------|
| `users` | 사용자 (role, department_id, **is_approved** 포함) |
| `departments` | 부서 (code는 enum: ck, cu_worship, youth, cu1, cu2) |
| `members` | 교인 명단 |
| `attendance_records` | 출결 기록 |
| `weekly_reports` | 주차 보고서 |
| `report_programs` | 보고서 진행순서 |
| `newcomers` | 새신자 명단 |
| `approval_history` | 결재 이력 |

### 회원가입 흐름

```
사용자 회원가입
  → auth.users 생성
  → 트리거: users 테이블에 is_approved=FALSE로 자동 생성
  → /pending 페이지로 리디렉션 (승인 대기)
  → 관리자가 /users에서 승인 + 역할 지정
  → is_approved=TRUE로 변경
  → 정상 접속 가능
```

### 역할 (user_role enum)

| 역할 | 코드 | 권한 |
|------|------|------|
| 슈퍼관리자 | `super_admin` | 모든 기능 + 사용자 관리 |
| 회장 | `president` | 협조 + 사용자 관리 |
| 부장 | `manager` | 결재 권한 |
| 목사 | `pastor` | 최종 확인 |
| 팀장 | `leader` | 보고서 작성 |
| 일반 | `member` | 자기 부서만 |

### 결재 흐름

```
팀장(제출/submitted)
  → 회장(협조/coordinator_reviewed)
  → 부장(결재/manager_approved)
  → 목사(확인/final_approved)
```

---

## 현재 상태

### 작동 중
- **프로덕션**: https://church-management-cpcc.netlify.app
- **로컬 개발**: `npm run dev` (localhost:3000)

### 주요 페이지
| 경로 | 설명 |
|------|------|
| `/login` | 로그인/회원가입 |
| `/pending` | 승인 대기 (미승인 사용자) |
| `/dashboard` | 대시보드 |
| `/attendance` | 출결 관리 (일괄 체크, 엑셀 내보내기) |
| `/reports` | 보고서 목록 |
| `/members` | 교인 명단 (엑셀 내보내기) |
| `/approvals` | 결재함 (관리자) |
| `/stats` | 통계 + 차트 (엑셀 내보내기) |
| `/users` | 사용자 관리 (관리자) |

### 설치된 주요 라이브러리
- `recharts` - 통계 차트
- `xlsx` - 엑셀 내보내기

---

## 추후 개발 예정 (우선순위 순)

### 높음
- [ ] 강현숙(부장), 전홍균(목사) 계정 생성 (회원가입 후 승인)
- [ ] 결재 알림 (이메일 또는 푸시)

### 중간
- [ ] QR 코드 출결 체크
- [ ] 커스텀 도메인 설정
- [ ] 푸시 알림

### 낮음
- [ ] 연간 출석 현황 대시보드
- [ ] 다크 모드
- [ ] 오프라인 지원 (PWA)

---

## 파일 구조 요약

```
C:/dev/church/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/            # 로그인/회원가입
│   │   │   └── pending/          # 승인 대기
│   │   └── (dashboard)/
│   │       ├── dashboard/        # 대시보드
│   │       ├── attendance/       # 출결 관리
│   │       ├── reports/          # 보고서
│   │       ├── approvals/        # 결재함
│   │       ├── stats/            # 통계 + 차트
│   │       ├── members/          # 교인 명단
│   │       └── users/            # 사용자 관리
│   ├── components/
│   │   ├── layout/               # Sidebar, Header
│   │   ├── attendance/           # AttendanceGrid (일괄체크, 엑셀)
│   │   ├── reports/              # ReportForm, ReportDetail, ReportPrintView
│   │   ├── members/              # MemberForm, MemberList (엑셀)
│   │   └── users/                # UserManagement
│   ├── lib/
│   │   ├── supabase/             # Supabase 클라이언트
│   │   └── excel.ts              # 엑셀 내보내기 유틸리티
│   └── types/
│       └── database.ts           # TypeScript 타입 정의
├── supabase/
│   ├── migrations/               # DB 마이그레이션
│   └── schema.sql                # 스키마 정의
├── docs/
│   └── SESSION_NOTES.md          # 이 문서
├── netlify.toml                  # Netlify 설정
└── .env.local                    # 환경 변수 (git 제외)
```

---

## 배포 명령어

```bash
# 빌드 및 배포
npm run build && npx netlify deploy --prod

# Git 커밋 및 푸시
git add . && git commit -m "메시지" && git push
```

---

## 다음 세션 시작 시

1. **이 문서 읽기**: `docs/SESSION_NOTES.md`
2. **배포 사이트 확인**: https://church-management-cpcc.netlify.app
3. **필요시 로컬 개발**: `npm run dev`

### 다음 세션 예상 작업
- 강현숙(부장), 전홍균(목사) 계정 생성 요청 대기
- 결재 알림 기능 구현 (이메일/푸시)
- QR 코드 출결 체크 기능

---

*마지막 업데이트: 2026-01-30 (엑셀 내보내기 완료)*
