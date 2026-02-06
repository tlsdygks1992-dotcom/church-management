-- 보고서 사진 및 부서 활동 사진 테이블
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. 보고서 첨부 사진 테이블
CREATE TABLE IF NOT EXISTS report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES weekly_reports(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  order_index integer DEFAULT 0,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 2. 부서 활동 사진 테이블
CREATE TABLE IF NOT EXISTS department_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  title text,
  description text,
  photo_date date,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_photos ENABLE ROW LEVEL SECURITY;

-- report_photos RLS
CREATE POLICY "Allow select for authenticated users" ON report_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON report_photos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON report_photos
  FOR DELETE TO authenticated USING (true);

-- department_photos RLS
CREATE POLICY "Allow select for authenticated users" ON department_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON department_photos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow delete for authenticated users" ON department_photos
  FOR DELETE TO authenticated USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_report_photos_report_id ON report_photos(report_id);
CREATE INDEX IF NOT EXISTS idx_department_photos_department_id ON department_photos(department_id);
CREATE INDEX IF NOT EXISTS idx_department_photos_date ON department_photos(photo_date DESC);
