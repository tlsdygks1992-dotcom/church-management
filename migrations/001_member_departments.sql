-- 교인 다중 부서 지원을 위한 마이그레이션 스크립트
-- 실행 전 반드시 백업을 수행하세요!

-- =====================================================
-- Step 1: member_departments 테이블 생성
-- =====================================================
CREATE TABLE IF NOT EXISTS member_departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,  -- 주 소속 부서 표시
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, department_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_member_departments_member ON member_departments(member_id);
CREATE INDEX IF NOT EXISTS idx_member_departments_dept ON member_departments(department_id);

-- RLS 정책 설정
ALTER TABLE member_departments ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 조회 가능
CREATE POLICY "member_departments_select_policy" ON member_departments
  FOR SELECT USING (auth.role() = 'authenticated');

-- 인증된 사용자는 삽입/수정/삭제 가능
CREATE POLICY "member_departments_insert_policy" ON member_departments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "member_departments_update_policy" ON member_departments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "member_departments_delete_policy" ON member_departments
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- Step 2: 기존 데이터 마이그레이션
-- 기존 members.department_id를 member_departments로 이동
-- =====================================================
INSERT INTO member_departments (member_id, department_id, is_primary)
SELECT id, department_id, true
FROM members
WHERE department_id IS NOT NULL
ON CONFLICT (member_id, department_id) DO NOTHING;

-- =====================================================
-- Step 3: members.department_id를 NULL 허용으로 변경
-- (호환성을 위해 컬럼은 유지하되 NULL 허용)
-- =====================================================
ALTER TABLE members ALTER COLUMN department_id DROP NOT NULL;

-- =====================================================
-- 마이그레이션 완료 확인
-- =====================================================
-- 아래 쿼리로 마이그레이션 결과를 확인하세요:
-- SELECT m.name, md.is_primary, d.name as dept_name
-- FROM members m
-- JOIN member_departments md ON m.id = md.member_id
-- JOIN departments d ON md.department_id = d.id
-- ORDER BY m.name;
