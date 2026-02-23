-- weekly_reports 열람 권한 완화 (누구나 볼 수 있게)
-- 실행 위치: Supabase Dashboard > SQL Editor

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "reports_select_admin" ON public.weekly_reports;
DROP POLICY IF EXISTS "reports_select_author" ON public.weekly_reports;
DROP POLICY IF EXISTS "reports_select_dept" ON public.weekly_reports;
DROP POLICY IF EXISTS "View reports based on role" ON public.weekly_reports;

-- 2. 새 통합 정책 생성
-- 규칙: 작성자 본인이거나, 상태가 'draft'가 아니면 누구나 조회 가능
CREATE POLICY "reports_select_all" ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (
    author_id = auth.uid() 
    OR status != 'draft'
  );

-- 3. 하위 테이블(진행순서, 새신자, 프로젝트항목) 정책도 동일하게 완화
-- 기존 정책들이 weekly_reports의 접근 권한을 체크하므로, 상위 보고서가 보이면 하위 항목도 보이게 됨

-- report_programs
DROP POLICY IF EXISTS "report_programs_select" ON public.report_programs;
CREATE POLICY "report_programs_select" ON public.report_programs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_reports
      WHERE id = report_programs.report_id
    )
  );

-- newcomers
DROP POLICY IF EXISTS "newcomers_select" ON public.newcomers;
CREATE POLICY "newcomers_select" ON public.newcomers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.weekly_reports
      WHERE id = newcomers.report_id
    )
  );

-- project_content_items, project_schedule_items, project_budget_items
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['project_content_items', 'project_schedule_items', 'project_budget_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.weekly_reports WHERE id = %I.report_id)
    )', tbl, tbl, tbl);
  END LOOP;
END $$;
