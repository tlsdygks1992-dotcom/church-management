-- 1청년부(cu1), 2청년부(cu2), 청소년부(youth) 교인 명단 전체 교체
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- 생성일: 2026-01-31
-- 주의: 기존 교인을 삭제하고 새로운 명단으로 교체합니다!

BEGIN;

-- ============================================
-- 1. 기존 교인 삭제 (cu1, cu2, youth)
-- ============================================

-- 해당 부서의 member_departments 연결 삭제
DELETE FROM member_departments
WHERE department_id IN (
  SELECT id FROM departments WHERE code IN ('cu1', 'cu2', 'youth')
);

-- 어떤 부서에도 속하지 않는 교인 삭제 (출석 기록도 함께 삭제)
DELETE FROM attendance_records
WHERE member_id IN (
  SELECT m.id FROM members m
  LEFT JOIN member_departments md ON m.id = md.member_id
  WHERE md.id IS NULL
);

DELETE FROM members
WHERE id IN (
  SELECT m.id FROM members m
  LEFT JOIN member_departments md ON m.id = md.member_id
  WHERE md.id IS NULL
);

-- ============================================
-- 2. 1청년 (cu1) 교인 추가 - 35명
-- ============================================

WITH cu1_dept AS (
  SELECT id FROM departments WHERE code = 'cu1'
),
new_members AS (
  INSERT INTO members (name, phone, birth_date, email, is_active)
  VALUES
    ('김효정', '010-3744-4029', '2000-04-20', NULL, true),
    ('김선웅', '010-6230-5126', '1998-11-08', 'sun110829@naver.com', true),
    ('조민정', '010-5042-0658', '1998-02-19', 'alswjd12345@naver.com', true),
    ('김동욱', '010-7471-6881', '2001-02-01', NULL, true),
    ('이현진', '010-2943-2263', '2003-01-06', NULL, true),
    ('김채현', '010-9436-8780', '1999-05-21', NULL, true),
    ('현수빈', NULL, NULL, NULL, true),
    ('송준선', '010-5839-0191', '1999-04-13', NULL, true),
    ('이승재', '010-2445-7593', NULL, NULL, true),
    ('김은수', '010-9965-0179', '2001-12-16', NULL, true),
    ('한수연', '010-6605-2347', '2002-07-18', NULL, true),
    ('임채승', '010-4541-3191', '2002-04-08', 'gkdnwj12@naver.com', true),
    ('정시후', '010-9217-3708', '2002-01-09', NULL, true),
    ('정은재', '010-4940-3113', '2002-07-19', NULL, true),
    ('박준수', '010-4107-7926', '1999-09-28', NULL, true),
    ('정예은', '010-4428-6610', '2005-01-14', NULL, true),
    ('정성모', '010-4435-6610', '1999-03-11', NULL, true),
    ('김재우', '010-2674-6562', '1997-06-05', NULL, true),
    ('김민지', '010-2557-0319', '2005-03-19', 'imingi5757@naver.com', true),
    ('김지솔', '010-9285-0325', '2005-09-17', NULL, true),
    ('장성재', '010-2121-9662', '2006-02-17', NULL, true),
    ('장미화', '010-3858-9662', '2001-09-15', NULL, true),
    ('구예린', '010-2729-9997', '2006-08-25', 'yerin-0825@naver.com', true),
    ('김영효', '010-5658-3439', '2000-09-02', 'rladudhy@naver.com', true),
    ('우현승', '010-8873-7371', '2005-05-12', NULL, true),
    ('박수빈', '010-9367-3316', '2002-03-13', NULL, true),
    ('김현주', '010-2047-9391', '1999-03-31', NULL, true),
    ('신원주', '010-5215-9506', '2004-07-19', NULL, true),
    ('강민아', '010-2790-1443', '1999-05-14', NULL, true),
    ('이다희', '010-7683-1886', '2001-06-12', NULL, true),
    ('이태희', '010-5460-5772', '2001-01-27', 'leephil0127@gmail.com', true),
    ('김동혁', NULL, NULL, NULL, true),
    ('이지욱', NULL, NULL, NULL, true),
    ('박승조', NULL, NULL, NULL, true),
    ('구현서', NULL, NULL, NULL, true)
  RETURNING id
)
INSERT INTO member_departments (member_id, department_id, is_primary)
SELECT nm.id, cu1_dept.id, true
FROM new_members nm, cu1_dept;

-- ============================================
-- 3. 2청년 (cu2) 교인 추가 - 14명
-- ============================================

WITH cu2_dept AS (
  SELECT id FROM departments WHERE code = 'cu2'
),
new_members AS (
  INSERT INTO members (name, phone, birth_date, email, is_active)
  VALUES
    ('권성경', '010-9747-2020', '1996-09-25', NULL, true),
    ('김유창', '010-7130-3401', '1996-09-26', NULL, true),
    ('김준일', '010-8784-6948', '1995-01-01', NULL, true),
    ('동은희', '010-8199-1785', '1994-01-22', NULL, true),
    ('신요한', '010-7767-5442', '1992-04-09', NULL, true),
    ('유하은', '010-4147-9523', '1995-02-03', NULL, true),
    ('김민혁', '010-3980-3439', '1996-11-26', NULL, true),
    ('김윤교', '010-5833-7246', '1992-02-21', NULL, true),
    ('송준호', '010-6761-0191', '1997-02-27', NULL, true),
    ('이건영', '010-2146-9559', '1995-03-13', NULL, true),
    ('이원석', '010-6349-0362', '1997-01-06', NULL, true),
    ('임승빈', '010-3808-2706', '1995-05-02', NULL, true),
    ('임채원', '010-7745-0640', '1992-10-24', NULL, true),
    ('정시온', '010-8880-3113', '1997-03-04', NULL, true)
  RETURNING id
)
INSERT INTO member_departments (member_id, department_id, is_primary)
SELECT nm.id, cu2_dept.id, true
FROM new_members nm, cu2_dept;

-- ============================================
-- 4. 청소년부 (youth) 교인 추가 - 8명
-- ============================================

WITH youth_dept AS (
  SELECT id FROM departments WHERE code = 'youth'
),
new_members AS (
  INSERT INTO members (name, phone, birth_date, email, is_active)
  VALUES
    ('김주한', NULL, NULL, NULL, true),
    ('구성민', NULL, NULL, NULL, true),
    ('우현제', NULL, NULL, NULL, true),
    ('윤서현', NULL, NULL, NULL, true),
    ('김민혁', NULL, NULL, NULL, true),
    ('김민서', NULL, NULL, NULL, true),
    ('정태후', NULL, NULL, NULL, true),
    ('주예원', NULL, NULL, NULL, true)
  RETURNING id
)
INSERT INTO member_departments (member_id, department_id, is_primary)
SELECT nm.id, youth_dept.id, true
FROM new_members nm, youth_dept;

COMMIT;

-- ============================================
-- 5. 결과 확인
-- ============================================

SELECT
  d.name as "부서",
  d.code as "코드",
  COUNT(md.member_id) as "교인 수"
FROM departments d
LEFT JOIN member_departments md ON d.id = md.department_id
WHERE d.code IN ('cu1', 'cu2', 'youth')
GROUP BY d.name, d.code
ORDER BY d.code;
