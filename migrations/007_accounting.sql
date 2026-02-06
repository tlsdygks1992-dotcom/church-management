-- 회계 관리 기능을 위한 테이블 생성
-- 실행 날짜: 2025-XX-XX

-- =====================================================
-- 1. 지출결의서 테이블
-- =====================================================
CREATE TABLE expense_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  requester_id UUID NOT NULL REFERENCES users(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount INTEGER NOT NULL DEFAULT 0,
  recipient_name VARCHAR(100),  -- 수령인
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 지출결의서 인덱스
CREATE INDEX idx_expense_requests_dept ON expense_requests(department_id);
CREATE INDEX idx_expense_requests_date ON expense_requests(request_date);
CREATE INDEX idx_expense_requests_requester ON expense_requests(requester_id);

-- =====================================================
-- 2. 지출결의서 항목 테이블
-- =====================================================
CREATE TABLE expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  item_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 지출결의서 항목 인덱스
CREATE INDEX idx_expense_items_request ON expense_items(expense_request_id);

-- =====================================================
-- 3. 회계장부 테이블
-- =====================================================
CREATE TABLE accounting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  record_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  income_amount INTEGER DEFAULT 0,      -- 수입금액
  expense_amount INTEGER DEFAULT 0,     -- 지출금액
  balance INTEGER NOT NULL,             -- 잔액
  category VARCHAR(50) NOT NULL,
  notes TEXT,
  expense_request_id UUID REFERENCES expense_requests(id),  -- 지출결의서 연결 (선택)
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 회계장부 인덱스
CREATE INDEX idx_accounting_records_dept ON accounting_records(department_id);
CREATE INDEX idx_accounting_records_date ON accounting_records(record_date);
CREATE INDEX idx_accounting_records_created_by ON accounting_records(created_by);

-- =====================================================
-- 4. RLS 정책
-- =====================================================
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_records ENABLE ROW LEVEL SECURITY;

-- 지출결의서: super_admin, accountant, president는 전체 조회 가능
-- team_leader는 자기 부서만
CREATE POLICY "expense_requests_select" ON expense_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role IN ('super_admin', 'accountant', 'president')
        OR (users.role = 'team_leader' AND users.department_id = expense_requests.department_id)
        OR expense_requests.requester_id = auth.uid()
      )
    )
  );

CREATE POLICY "expense_requests_insert" ON expense_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'accountant', 'president', 'team_leader')
    )
  );

CREATE POLICY "expense_requests_update" ON expense_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role IN ('super_admin', 'accountant', 'president')
        OR expense_requests.requester_id = auth.uid()
      )
    )
  );

CREATE POLICY "expense_requests_delete" ON expense_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'accountant')
    )
  );

-- 지출결의서 항목: 부모 지출결의서에 접근 가능하면 항목도 접근 가능
CREATE POLICY "expense_items_select" ON expense_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expense_requests
      WHERE expense_requests.id = expense_items.expense_request_id
    )
  );

CREATE POLICY "expense_items_insert" ON expense_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_requests
      WHERE expense_requests.id = expense_items.expense_request_id
    )
  );

CREATE POLICY "expense_items_update" ON expense_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM expense_requests
      WHERE expense_requests.id = expense_items.expense_request_id
    )
  );

CREATE POLICY "expense_items_delete" ON expense_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM expense_requests
      WHERE expense_requests.id = expense_items.expense_request_id
    )
  );

-- 회계장부: super_admin, accountant, president는 전체 조회 가능
-- team_leader는 자기 부서만
CREATE POLICY "accounting_records_select" ON accounting_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role IN ('super_admin', 'accountant', 'president')
        OR (users.role = 'team_leader' AND users.department_id = accounting_records.department_id)
      )
    )
  );

CREATE POLICY "accounting_records_insert" ON accounting_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'accountant', 'president', 'team_leader')
    )
  );

CREATE POLICY "accounting_records_update" ON accounting_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'accountant', 'president')
    )
  );

CREATE POLICY "accounting_records_delete" ON accounting_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'accountant')
    )
  );

-- =====================================================
-- 5. updated_at 자동 갱신 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expense_requests_updated_at
  BEFORE UPDATE ON expense_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_records_updated_at
  BEFORE UPDATE ON accounting_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
