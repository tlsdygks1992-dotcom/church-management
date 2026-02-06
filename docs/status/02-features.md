# 구현된 기능 목록

## 기능 현황 요약

| 기능 | 상태 | 경로 |
|------|------|------|
| 로그인/회원가입 | 완료 | `/login` |
| 대시보드 | 완료 | `/dashboard` |
| 출결 관리 | 완료 | `/attendance` |
| 보고서 관리 | 완료 | `/reports` |
| 교인 관리 | 완료 | `/members` |
| 출석 통계 | 완료 | `/stats` |
| 결재함 | 완료 | `/approvals` |
| 사용자 관리 | 완료 | `/users` |
| 안내 페이지 | 완료 | `/guide` |
| 알림 시스템 | 완료 | 인앱 알림 |

---

## 1. 로그인/회원가입

**경로**: `/login`
**파일**: `src/app/(auth)/login/page.tsx`

### 기능

- 이메일/비밀번호 로그인
- 회원가입 (관리자 승인 필요)
- 로그인/회원가입 모드 토글
- 에러 메시지 상세 표시
  - 이미 가입된 이메일
  - Rate limit 초과
  - 잘못된 이메일/비밀번호

### 회원가입 후 흐름

1. 회원가입 완료 → `is_active: false` 상태
2. `/pending` 페이지로 이동 (승인 대기)
3. 관리자가 `/users`에서 승인
4. 로그인 가능

---

## 2. 대시보드

**경로**: `/dashboard`
**파일**: `src/app/(dashboard)/dashboard/page.tsx`

### 기능

- 환영 메시지 및 사용자 정보 표시
- 이번 주 출석 통계
  - 예배 출석 인원
  - 모임 출석 인원
  - 재적 인원
- 역할별 결재 대기 건수
- 빠른 액션 버튼
  - 출결 관리
  - 보고서 작성
  - 교인 명단
  - 교육위원회 안내
- 최근 보고서 목록 (최대 5건)

---

## 3. 출결 관리

**경로**: `/attendance`
**파일**:
- `src/app/(dashboard)/attendance/page.tsx`
- `src/components/attendance/AttendanceGrid.tsx`

### 기능

- 부서별 출석 체크 인터페이스
- 예배/모임 출석 토글 (체크박스)
- 교인별 사진 표시
- 실시간 저장 (Optimistic Update)
- 부서 전환 드롭다운
- 엑셀 내보내기

### 권한

- 팀장 이상만 출석 체크 가능
- 비관리자는 소속 부서만 조회

---

## 4. 보고서 관리

**경로**: `/reports`

### 4.1 보고서 목록

**파일**: `src/app/(dashboard)/reports/page.tsx`

- 주차/모임/교육 보고서 탭
- 부서별, 상태별 필터링
- 검색 기능
- 새 보고서 작성 버튼

### 4.2 보고서 작성

**경로**: `/reports/new`
**파일**:
- `src/app/(dashboard)/reports/new/page.tsx`
- `src/components/reports/ReportForm.tsx`

#### 보고서 유형별 필드

| 유형 | 주요 필드 |
|------|----------|
| 주차 보고서 | 출결 현황, 새신자 명단, 순서지, 말씀 정보 |
| 모임 보고서 | 모임 개요, 참석자, 주요 내용 |
| 교육 보고서 | 교육 개요, 교육 내용, 적용점 |

#### 기능

- 동적 프로그램 추가 (시간, 내용, 담당자)
- 신입자 정보 입력
- 출석 현황 입력 (셀별)
- 리치 텍스트 에디터 (Tiptap)
- 초안 저장 / 제출

### 4.3 보고서 상세보기

**경로**: `/reports/[id]`
**파일**: `src/components/reports/ReportDetail.tsx`

- 보고서 내용 조회
- 결재 흐름 및 이력 표시
- 역할별 결재 액션
  - 협조 (회장)
  - 결재 (부장)
  - 확인 (목사)
  - 반려
  - 수정 요청
- 인쇄 기능

### 4.4 보고서 수정

**경로**: `/reports/[id]/edit`
**파일**: `src/app/(dashboard)/reports/[id]/edit/page.tsx`

- draft 상태에서만 수정 가능
- 기존 데이터 로드
- 제출 취소 → draft 복귀

---

## 5. 교인 관리

**경로**: `/members`

### 5.1 교인 목록

**파일**:
- `src/app/(dashboard)/members/page.tsx`
- `src/components/members/MemberList.tsx`

#### 기능

- 그리드/리스트 뷰 전환
- 부서별 필터링 (드롭다운)
- 생일 월별 필터 (1월~12월 버튼)
- 검색 (이름/연락처)
- 엑셀 내보내기
- 교인 삭제 (팀장/관리자 권한)

#### 다중 부서 지원

- 한 교인이 여러 부서에 소속 가능
- 주 소속 부서 표시 (파란색 태그)
- 부서명을 `·`로 구분하여 표시

### 5.2 교인 등록

**경로**: `/members/new`
**파일**: `src/components/members/MemberForm.tsx`

#### 입력 필드

- 이름 (필수)
- 연락처
- 이메일
- 생년월일
- 주소
- 직업
- 부서 (다중 선택, 주 소속 지정)
- 프로필 사진

### 5.3 교인 상세/수정

**경로**: `/members/[id]`
**파일**: `src/app/(dashboard)/members/[id]/page.tsx`

- 교인 정보 조회
- 소속 부서 태그 표시
- 정보 수정

---

## 6. 출석 통계

**경로**: `/stats`
**파일**:
- `src/app/(dashboard)/stats/page.tsx`
- `src/components/stats/StatsCharts.tsx`

### 기능

- 부서별 출석률 시각화
  - 주간 추이 라인 차트
  - 부서별 분포 파이 차트
  - 부서별 비교 바 차트
- 기간 필터링 (월간/분기/연간)
- 부서별 상세 비교표
- 엑셀 내보내기

### 권한

- 관리자 역할만 접근 가능

---

## 7. 결재함

**경로**: `/approvals`
**파일**: `src/app/(dashboard)/approvals/page.tsx`

### 기능

- 역할별 결재 대기 목록
- 대기 중 / 처리 완료 탭
- 보고서 상세 페이지로 이동

### 결재 흐름

```
팀장(작성) → 회장(협조) → 부장(결재) → 목사(확인)
```

---

## 8. 사용자 관리

**경로**: `/users`
**파일**: `src/components/users/UserManagement.tsx`

### 기능

- 미승인 사용자 관리
  - 역할 할당 (드롭다운)
  - 부서 할당 (다중 선택)
  - 승인 / 거부 버튼
- 기존 사용자 관리
  - 역할 변경
  - 부서 변경
  - 사용자 삭제
- 저장 버튼 (변경사항 일괄 저장)
- 변경된 필드 하이라이트

### 권한

- super_admin, president 역할만 접근 가능

---

## 9. 안내 페이지

**경로**: `/guide`
**파일**: `src/app/(dashboard)/guide/page.tsx`

### 내용

- 2026년도 교육위원회 조직 소개
- 역할별 업무 안내
- 결재 프로세스 설명
- 부서 구성 및 담당자 정보

---

## 10. 알림 시스템

**파일**:
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationItem.tsx`
- `src/lib/notifications.ts`

### 기능

- 인앱 알림 (벨 아이콘 + 드롭다운)
- 읽지 않은 알림 개수 배지
- 알림 클릭 시 해당 페이지로 이동
- 읽음 / 모두 읽음 처리
- 실시간 업데이트 (폴링)

### 알림 트리거

| 상태 변경 | 수신자 | 메시지 |
|----------|--------|--------|
| draft → submitted | 회장 | 새 보고서 제출됨 |
| submitted → coordinator_reviewed | 부장 | 회장 협조 완료 |
| coordinator_reviewed → manager_approved | 목사 | 부장 결재 완료 |
| manager_approved → final_approved | 작성자 | 최종 승인 완료 |
| any → rejected | 작성자 | 보고서 반려 |

---

## 11. 회계 관리

**경로**: `/accounting`

### 11.1 회계장부

**파일**:
- `src/app/(dashboard)/accounting/page.tsx`
- `src/components/accounting/AccountingLedger.tsx`
- `src/components/accounting/AccountingSummary.tsx`

#### 기능

- 부서별/월별 회계장부 조회
- 수입/지출 내역 테이블
- 잔액 자동 계산 (누적)
- 월별 요약 (총 수입, 총 지출, 최종 잔액)
- 체크박스 선택 및 일괄 삭제
- 전체 선택/해제 기능
- 모바일 카드 뷰 / 데스크톱 테이블 뷰
- 엑셀 가져오기/내보내기

### 11.2 지출결의서

**경로**: `/accounting/expense`
**파일**:
- `src/app/(dashboard)/accounting/expense/page.tsx`
- `src/components/accounting/ExpenseRequestForm.tsx`
- `src/components/accounting/ExpenseRequestList.tsx`

#### 기능

- 지출결의서 작성
- 항목별 금액 입력
- 카테고리 선택
- 지출결의서 목록 조회

### 11.3 장부 입력

**경로**: `/accounting/ledger/new`
**파일**: `src/components/accounting/AccountingRecordForm.tsx`

#### 기능

- 수입/지출 내역 직접 입력
- 날짜, 적요, 금액, 카테고리, 비고

### 권한

- super_admin, accountant, president: 전체 부서 조회/편집
- team_leader: 소속 부서만 조회

---

## 공통 기능

### 엑셀 내보내기

**파일**: `src/lib/excel.ts`

지원 영역:
- 교인 명단
- 출결 기록
- 통계 데이터

### 반응형 디자인

- 모바일 우선 설계
- `lg:` 프리픽스로 데스크톱 스타일 구분
- 모바일 하단 네비게이션 바
- 데스크톱 고정 사이드바

### 성능 최적화

- Optimistic Updates (삭제, 읽음 처리)
- 동적 임포트 (차트 컴포넌트)
- 컴포넌트 메모이제이션
