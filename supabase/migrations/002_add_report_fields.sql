-- weekly_reports 테이블에 누락된 컬럼 추가 (보고서 유형 다양화 대응)
-- 실행 위치: Supabase Dashboard > SQL Editor

-- 1. report_type 컬럼 추가 (기본값 'weekly')
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'weekly';

-- 2. 상세 정보 컬럼 추가
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS meeting_title TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS meeting_location TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS attendees TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS main_content TEXT;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS application_notes TEXT;

-- 3. 셀 ID 연결 (셀장보고서용)
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS cell_id UUID REFERENCES cells(id) ON DELETE SET NULL;

-- 4. 프로젝트 관련 테이블 생성 (기존에 없을 경우)

-- 프로젝트 세부계획 내용
CREATE TABLE IF NOT EXISTS project_content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  col1 TEXT,
  col2 TEXT,
  col3 TEXT,
  col4 TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트 세부 일정표
CREATE TABLE IF NOT EXISTS project_schedule_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  schedule TEXT,
  detail TEXT,
  note TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트 예산
CREATE TABLE IF NOT EXISTS project_budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  category TEXT,
  subcategory TEXT,
  item_name TEXT,
  basis TEXT,
  unit_price INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  amount INTEGER DEFAULT 0,
  note TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE project_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_items ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성 (안전하게)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['project_content_items', 'project_schedule_items', 'project_budget_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I_modify ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_modify ON public.%I FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.weekly_reports WHERE id = %I.report_id AND author_id = auth.uid())
      OR (SELECT role FROM public.users WHERE id = auth.uid()) IN (''super_admin'', ''president'', ''accountant'')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.weekly_reports WHERE id = %I.report_id AND author_id = auth.uid())
      OR (SELECT role FROM public.users WHERE id = auth.uid()) IN (''super_admin'', ''president'', ''accountant'')
    )', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;
