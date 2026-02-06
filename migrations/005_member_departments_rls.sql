-- member_departments 테이블 RLS 정책 설정
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- RLS 활성화
ALTER TABLE member_departments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Allow select for authenticated users" ON member_departments;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON member_departments;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON member_departments;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON member_departments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON member_departments;

-- 인증된 사용자에게 모든 권한 허용
CREATE POLICY "Allow select for authenticated users" ON member_departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON member_departments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON member_departments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON member_departments
  FOR DELETE TO authenticated USING (true);

-- members 테이블 RLS 정책도 확인/추가
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for authenticated users" ON members;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON members;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON members;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON members;

CREATE POLICY "Allow select for authenticated users" ON members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON members
  FOR DELETE TO authenticated USING (true);

-- 결과 확인
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('members', 'member_departments');
