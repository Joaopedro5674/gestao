-- SUPABASE RLS SETUP
-- Ensures all tables are locked down to the authenticated owner.

-- Enable RLS
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimos ENABLE ROW LEVEL SECURITY;

-- DROP EXISTING
DROP POLICY IF EXISTS "Users can manage their own properties" ON imoveis;
DROP POLICY IF EXISTS "Users can manage their own payments" ON imoveis_pagamentos;
DROP POLICY IF EXISTS "Users can manage their own expenses" ON imoveis_gastos;
DROP POLICY IF EXISTS "Users can manage their own loans" ON emprestimos;

-- CREATE NEW
CREATE POLICY "Users can manage their own properties" ON imoveis 
  FOR ALL TO authenticated  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payments" ON imoveis_pagamentos 
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own expenses" ON imoveis_gastos 
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own loans" ON emprestimos 
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
