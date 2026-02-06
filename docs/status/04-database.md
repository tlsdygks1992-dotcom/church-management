# 데이터베이스 구조

## 개요

- **데이터베이스**: Supabase (PostgreSQL)
- **타입 정의**: `src/types/database.ts`

---

## 테이블 목록

| 테이블 | 설명 | 주요 용도 |
|--------|------|----------|
| departments | 부서 정보 | 부서 코드, 이름 |
| users | 사용자 | 인증, 역할, 부서 |
| user_departments | 사용자-부서 매핑 | 팀장 여부 |
| members | 교인 정보 | 교인 명단 |
| member_departments | 교인-부서 매핑 | 다중 부서 소속 |
| weekly_reports | 보고서 | 주차/모임/교육 보고서 |
| approval_history | 결재 이력 | 상태 변경 기록 |
| report_programs | 보고서 프로그램 | 순서지 항목 |
| attendance_records | 출석 기록 | 예배/모임 출석 |
| newcomers | 신입자 | 새신자 정보 |
| notifications | 알림 | 인앱 알림 |
| push_subscriptions | 푸시 구독 | 웹 푸시 알림 |

---

## 테이블 상세

### departments (부서)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| code | department_code | 부서 코드 (ck, cu_worship, youth, cu1, cu2, leader) |
| name | text | 부서 이름 |
| description | text | 설명 (nullable) |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |

### users (사용자)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK (Supabase Auth와 동일) |
| email | text | 이메일 |
| name | text | 이름 |
| phone | text | 연락처 (nullable) |
| role | user_role | 역할 |
| department_id | uuid | FK → departments |
| is_active | boolean | 활성화 여부 (승인 상태) |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |

### user_departments (사용자-부서 매핑)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| department_id | uuid | FK → departments |
| is_team_leader | boolean | 해당 부서 팀장 여부 |
| created_at | timestamp | 생성일시 |

### members (교인)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| name | text | 이름 |
| phone | text | 연락처 (nullable) |
| email | text | 이메일 (nullable) |
| birth_date | date | 생년월일 (nullable) |
| address | text | 주소 (nullable) |
| occupation | text | 직업 (nullable) |
| photo_url | text | 프로필 사진 URL (nullable) |
| photo_updated_at | timestamp | 사진 수정일시 (nullable) |
| department_id | uuid | FK → departments (호환성용, nullable) |
| is_active | boolean | 활성화 여부 |
| joined_at | timestamp | 등록일 |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |

### member_departments (교인-부서 매핑)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| member_id | uuid | FK → members |
| department_id | uuid | FK → departments |
| is_primary | boolean | 주 소속 부서 여부 |
| created_at | timestamp | 생성일시 |

### weekly_reports (보고서)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| department_id | uuid | FK → departments |
| report_date | date | 보고서 날짜 |
| week_number | integer | 주차 (nullable) |
| year | integer | 연도 |
| author_id | uuid | FK → users |
| total_registered | integer | 재적 인원 |
| worship_attendance | integer | 예배 출석 |
| meeting_attendance | integer | 모임 출석 |
| notes | text | 비고 (nullable) |
| status | approval_status | 결재 상태 |
| submitted_at | timestamp | 제출일시 (nullable) |
| coordinator_id | uuid | 협조자 (nullable) |
| coordinator_reviewed_at | timestamp | 협조일시 (nullable) |
| coordinator_comment | text | 협조 코멘트 (nullable) |
| manager_id | uuid | 결재자 (nullable) |
| manager_approved_at | timestamp | 결재일시 (nullable) |
| manager_comment | text | 결재 코멘트 (nullable) |
| final_approver_id | uuid | 최종 승인자 (nullable) |
| final_approved_at | timestamp | 최종 승인일시 (nullable) |
| final_comment | text | 최종 코멘트 (nullable) |
| rejected_by | uuid | 반려자 (nullable) |
| rejected_at | timestamp | 반려일시 (nullable) |
| rejection_reason | text | 반려 사유 (nullable) |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |

### approval_history (결재 이력)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| report_id | uuid | FK → weekly_reports |
| approver_id | uuid | FK → users |
| from_status | approval_status | 이전 상태 |
| to_status | approval_status | 변경 상태 |
| comment | text | 코멘트 (nullable) |
| created_at | timestamp | 생성일시 |

### report_programs (보고서 프로그램)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| report_id | uuid | FK → weekly_reports |
| start_time | text | 시작 시간 |
| content | text | 내용 |
| person_in_charge | text | 담당자 (nullable) |
| order_index | integer | 순서 |
| created_at | timestamp | 생성일시 |

### attendance_records (출석 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| member_id | uuid | FK → members |
| report_id | uuid | FK → weekly_reports (nullable) |
| attendance_date | date | 출석 날짜 |
| attendance_type | attendance_type | 출석 유형 (worship/meeting) |
| is_present | boolean | 출석 여부 |
| checked_by | uuid | 체크한 사용자 (nullable) |
| checked_via | text | 체크 방법 (nullable) |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |

### newcomers (신입자)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| report_id | uuid | FK → weekly_reports |
| name | text | 이름 |
| phone | text | 연락처 (nullable) |
| birth_date | date | 생년월일 (nullable) |
| introducer | text | 인도자 (nullable) |
| address | text | 주소 (nullable) |
| affiliation | text | 소속 (nullable) |
| department_id | uuid | FK → departments (nullable) |
| converted_to_member_id | uuid | 정식 교인 전환 ID (nullable) |
| created_at | timestamp | 생성일시 |

### notifications (알림)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| title | text | 제목 |
| body | text | 본문 (nullable) |
| link | text | 링크 (nullable) |
| report_id | uuid | FK → weekly_reports (nullable) |
| is_read | boolean | 읽음 여부 |
| is_sent | boolean | 푸시 발송 여부 |
| sent_at | timestamp | 발송일시 (nullable) |
| created_at | timestamp | 생성일시 |

### push_subscriptions (푸시 구독)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| endpoint | text | 푸시 엔드포인트 |
| p256dh_key | text | P256DH 키 |
| auth_key | text | Auth 키 |
| device_name | text | 디바이스 이름 (nullable) |
| user_agent | text | User-Agent (nullable) |
| is_active | boolean | 활성화 여부 |
| created_at | timestamp | 생성일시 |
| updated_at | timestamp | 수정일시 |

---

## 뷰 (Views)

### pending_approvals (결재 대기)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | 보고서 ID |
| report_date | date | 보고서 날짜 |
| status | approval_status | 현재 상태 |
| department_name | text | 부서명 |
| author_name | text | 작성자명 |
| created_at | timestamp | 생성일시 |
| submitted_at | timestamp | 제출일시 |
| pending_role | text | 대기 중인 역할 (coordinator/manager/final) |

### department_attendance_summary (부서별 출석 통계)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| department_id | uuid | 부서 ID |
| department_name | text | 부서명 |
| report_date | date | 보고서 날짜 |
| year | integer | 연도 |
| week_number | integer | 주차 |
| total_registered | integer | 재적 인원 |
| worship_attendance | integer | 예배 출석 |
| meeting_attendance | integer | 모임 출석 |
| worship_rate | decimal | 예배 출석률 |

---

## Enum 값

### user_role (사용자 역할)

| 값 | 설명 |
|------|------|
| super_admin | 최고 관리자 (목사) |
| president | 회장 |
| accountant | 부장/회계 |
| team_leader | 팀장 |
| member | 일반 회원 |

### department_code (부서 코드)

| 값 | 설명 |
|------|------|
| ck | 유치부 솔트 |
| cu | CU (통합) |
| cu_worship | CU워십 |
| youth | 청소년부 |
| cu1 | CU1부 |
| cu2 | CU2부 |
| leader | 리더 |

### expense_category (회계 카테고리)

**수입 카테고리**:
| 값 | 설명 |
|------|------|
| 운영비 수입 | 정기 운영비 |
| 기타 수입 | 기타 수입 |

**지출 카테고리**:
| 값 | 설명 |
|------|------|
| 운영비 | 일반 운영비 |
| 비품 | 비품 구입 |
| 경조사 | 경조사 지원 |
| CU1행사 | CU1부 행사비 |
| CU2행사 | CU2부 행사비 |
| CU공통 | CU 공통 행사비 |
| 리더지원 | 리더 지원금 |
| 셀장지원 | 셀장 지원금 |
| 교육 | 교육비 |
| 기타 | 기타 지출 |

### approval_status (결재 상태)

| 값 | 설명 |
|------|------|
| draft | 초안 |
| submitted | 제출됨 |
| coordinator_reviewed | 회장 협조 완료 |
| manager_approved | 부장 결재 완료 |
| final_approved | 최종 승인 |
| rejected | 반려 |
| revision_requested | 수정 요청 |

### attendance_type (출석 유형)

| 값 | 설명 |
|------|------|
| worship | 예배 |
| meeting | 모임 |

### report_type (보고서 유형)

| 값 | 설명 |
|------|------|
| weekly | 주차 보고서 |
| meeting | 모임 보고서 |
| education | 교육 보고서 |

---

## ERD (Entity Relationship Diagram)

```
┌──────────────┐
│  departments │
├──────────────┤
│ id (PK)      │◄─────────────────────────────────────────────────┐
│ code         │                                                   │
│ name         │                                                   │
└──────────────┘                                                   │
       │                                                           │
       │ 1:N                                                       │
       ▼                                                           │
┌──────────────────┐        ┌──────────────────┐                  │
│      users       │        │ user_departments │                  │
├──────────────────┤        ├──────────────────┤                  │
│ id (PK)          │◄──────▶│ user_id (FK)     │                  │
│ email            │        │ department_id(FK)│──────────────────┘
│ name             │        │ is_team_leader   │                  │
│ role             │        └──────────────────┘                  │
│ department_id(FK)│────────────────────────────────────────────┐ │
│ is_active        │                                            │ │
└──────────────────┘                                            │ │
       │                                                        │ │
       │ 1:N                                                    ▼ │
       ▼                                                  ┌───────┴───────┐
┌──────────────────┐                                      │  departments  │
│  weekly_reports  │                                      └───────────────┘
├──────────────────┤                                            ▲
│ id (PK)          │                                            │
│ department_id(FK)│────────────────────────────────────────────┤
│ author_id (FK)   │────────────────────────────────────────────┤
│ status           │                                            │
│ ...              │                                            │
└──────────────────┘                                            │
       │                                                        │
       │ 1:N                                                    │
       ▼                                                        │
┌──────────────────┐        ┌──────────────────┐               │
│approval_history  │        │ report_programs  │               │
├──────────────────┤        ├──────────────────┤               │
│ report_id (FK)   │        │ report_id (FK)   │               │
│ approver_id (FK) │        │ content          │               │
│ from_status      │        │ start_time       │               │
│ to_status        │        └──────────────────┘               │
└──────────────────┘                                            │
                                                                │
┌──────────────────┐        ┌────────────────────┐             │
│     members      │        │ member_departments │             │
├──────────────────┤        ├────────────────────┤             │
│ id (PK)          │◄──────▶│ member_id (FK)     │             │
│ name             │        │ department_id (FK) │─────────────┘
│ phone            │        │ is_primary         │
│ birth_date       │        └────────────────────┘
│ photo_url        │
└──────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│attendance_records│
├──────────────────┤
│ member_id (FK)   │
│ report_id (FK)   │
│ attendance_date  │
│ attendance_type  │
│ is_present       │
└──────────────────┘

┌──────────────────┐        ┌──────────────────────┐
│  notifications   │        │  push_subscriptions  │
├──────────────────┤        ├──────────────────────┤
│ user_id (FK)     │        │ user_id (FK)         │
│ title            │        │ endpoint             │
│ body             │        │ p256dh_key           │
│ is_read          │        │ auth_key             │
│ report_id (FK)   │        │ is_active            │
└──────────────────┘        └──────────────────────┘
```

---

## 마이그레이션 이력

| 파일 | 설명 |
|------|------|
| `migrations/001_member_departments.sql` | member_departments 테이블 생성 및 기존 데이터 이전 |
| `migrations/002_merge_duplicate_members.sql` | 중복 교인 병합 (수동 실행) |

### 마이그레이션 실행 방법

1. Supabase Dashboard → SQL Editor 접속
2. 마이그레이션 파일 내용 복사
3. 쿼리 실행

---

## 스토리지 (Storage)

### 버킷: member-photos

- **용도**: 교인 프로필 사진 저장
- **접근**: 공개 (public)
- **파일 형식**: 이미지 (JPEG, PNG 등)

### 파일 경로 규칙

```
member-photos/{member_id}/{filename}
```
