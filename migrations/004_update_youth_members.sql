-- 청소년부(youth) 교인 명단 업데이트
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- 생성일: 2026-01-31

-- 청소년부 (youth) 교인 추가
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

-- 결과 확인
SELECT
  d.name as "부서",
  COUNT(md.member_id) as "교인 수"
FROM departments d
LEFT JOIN member_departments md ON d.id = md.department_id
WHERE d.code = 'youth'
GROUP BY d.name;
