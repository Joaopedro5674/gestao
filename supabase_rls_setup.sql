-- 1. Enable RLS on all tables
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimos ENABLE ROW LEVEL SECURITY;

-- 2. Create "Authenticated access" Policies
-- Allow users to see/edit ONLY their own data (based on user_id)
-- Assuming 'user_id' column exists and links to auth.users.id

-- Imoveis
CREATE POLICY "Users can manage their own properties" ON imoveis
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Imoveis Pagamentos
CREATE POLICY "Users can manage their own payments" ON imoveis_pagamentos
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Imoveis Gastos
CREATE POLICY "Users can manage their own expenses" ON imoveis_gastos
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Emprestimos
CREATE POLICY "Users can manage their own loans" ON emprestimos
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Grant usage to authenticated users (redundant usually, but safe)
GRANT ALL ON imoveis TO authenticated;
GRANT ALL ON imoveis_pagamentos TO authenticated;
GRANT ALL ON imoveis_gastos TO authenticated;
GRANT ALL ON emprestimos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE imoveis_id_seq TO authenticated; -- If serial, verify names
