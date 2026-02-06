-- 중복 교인 병합 스크립트
-- 실행 전 반드시 백업을 수행하세요!
-- 이 스크립트는 수동으로 확인 후 실행하는 것을 권장합니다.

-- =====================================================
-- Step 1: 중복 그룹 확인 (먼저 실행하여 검토)
-- 이름+연락처가 동일한 중복 레코드 조회
-- =====================================================
-- SELECT
--   name,
--   phone,
--   COUNT(*) as duplicate_count,
--   STRING_AGG(id::text, ', ') as member_ids,
--   STRING_AGG(d.name, ', ') as departments
-- FROM members m
-- LEFT JOIN departments d ON m.department_id = d.id
-- WHERE name IS NOT NULL
-- GROUP BY name, phone
-- HAVING COUNT(*) > 1
-- ORDER BY name;

-- =====================================================
-- Step 2: 중복 병합 실행
-- 각 중복 그룹에서 가장 오래된 레코드(원본)에 모든 부서를 연결
-- =====================================================

-- 중복 그룹의 원본(가장 오래된 레코드)과 중복 레코드 식별
WITH duplicate_groups AS (
  SELECT
    name,
    phone,
    MIN(created_at) as first_created
  FROM members
  WHERE name IS NOT NULL
  GROUP BY name, phone
  HAVING COUNT(*) > 1
),
originals AS (
  SELECT m.id as original_id, m.name, m.phone
  FROM members m
  JOIN duplicate_groups dg ON m.name = dg.name AND (m.phone = dg.phone OR (m.phone IS NULL AND dg.phone IS NULL))
  WHERE m.created_at = dg.first_created
),
duplicates AS (
  SELECT m.id as duplicate_id, m.department_id, o.original_id
  FROM members m
  JOIN originals o ON m.name = o.name AND (m.phone = o.phone OR (m.phone IS NULL AND o.phone IS NULL))
  WHERE m.id != o.original_id
)
-- 중복 레코드의 부서를 원본의 member_departments에 추가
INSERT INTO member_departments (member_id, department_id, is_primary)
SELECT
  d.original_id,
  d.department_id,
  false  -- 추가되는 부서는 주 소속이 아님
FROM duplicates d
WHERE d.department_id IS NOT NULL
ON CONFLICT (member_id, department_id) DO NOTHING;

-- =====================================================
-- Step 3: 출결 기록 이전
-- 중복 레코드의 출결 기록을 원본으로 이전
-- =====================================================

WITH duplicate_groups AS (
  SELECT
    name,
    phone,
    MIN(created_at) as first_created
  FROM members
  WHERE name IS NOT NULL
  GROUP BY name, phone
  HAVING COUNT(*) > 1
),
originals AS (
  SELECT m.id as original_id, m.name, m.phone
  FROM members m
  JOIN duplicate_groups dg ON m.name = dg.name AND (m.phone = dg.phone OR (m.phone IS NULL AND dg.phone IS NULL))
  WHERE m.created_at = dg.first_created
),
duplicates AS (
  SELECT m.id as duplicate_id, o.original_id
  FROM members m
  JOIN originals o ON m.name = o.name AND (m.phone = o.phone OR (m.phone IS NULL AND o.phone IS NULL))
  WHERE m.id != o.original_id
)
UPDATE attendance_records ar
SET member_id = d.original_id
FROM duplicates d
WHERE ar.member_id = d.duplicate_id;

-- =====================================================
-- Step 4: 중복 레코드 삭제
-- 주의: 되돌릴 수 없습니다!
-- =====================================================

WITH duplicate_groups AS (
  SELECT
    name,
    phone,
    MIN(created_at) as first_created
  FROM members
  WHERE name IS NOT NULL
  GROUP BY name, phone
  HAVING COUNT(*) > 1
),
originals AS (
  SELECT m.id as original_id, m.name, m.phone
  FROM members m
  JOIN duplicate_groups dg ON m.name = dg.name AND (m.phone = dg.phone OR (m.phone IS NULL AND dg.phone IS NULL))
  WHERE m.created_at = dg.first_created
),
duplicates AS (
  SELECT m.id as duplicate_id
  FROM members m
  JOIN originals o ON m.name = o.name AND (m.phone = o.phone OR (m.phone IS NULL AND o.phone IS NULL))
  WHERE m.id != o.original_id
)
DELETE FROM members
WHERE id IN (SELECT duplicate_id FROM duplicates);

-- =====================================================
-- 병합 결과 확인
-- =====================================================
-- SELECT m.name, m.phone, COUNT(md.id) as dept_count,
--        STRING_AGG(d.name, ', ') as departments
-- FROM members m
-- LEFT JOIN member_departments md ON m.id = md.member_id
-- LEFT JOIN departments d ON md.department_id = d.id
-- GROUP BY m.id, m.name, m.phone
-- HAVING COUNT(md.id) > 1
-- ORDER BY m.name;
