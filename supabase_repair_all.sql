-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Tables (IF NOT EXISTS) to fix missing relations
CREATE TABLE IF NOT EXISTS imoveis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  valor_aluguel numeric NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS imoveis_pagamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id uuid REFERENCES imoveis(id) ON DELETE CASCADE NOT NULL,
  mes_ref date NOT NULL,
  status text CHECK (status IN ('pendente', 'pago')) DEFAULT 'pendente',
  data_pagamento timestamptz,
  valor_pago numeric,
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  UNIQUE(imovel_id, mes_ref)
);

CREATE TABLE IF NOT EXISTS imoveis_gastos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id uuid REFERENCES imoveis(id) ON DELETE CASCADE NOT NULL,
  mes_ref date NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  categoria text DEFAULT 'manutencao',
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS emprestimos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome text NOT NULL,
  valor_emprestado numeric NOT NULL,
  juros_mensal numeric NOT NULL,
  dias_contratados int NOT NULL,
  juros_total_contratado numeric NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status text CHECK (status IN ('ativo', 'pago')) DEFAULT 'ativo',
  data_pagamento timestamptz,
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT auth.uid()
);

-- 2. Enable RLS
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimos ENABLE ROW LEVEL SECURITY;

-- 3. Clean up old policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Authenticated access" ON imoveis;
DROP POLICY IF EXISTS "Authenticated access" ON imoveis_pagamentos;
DROP POLICY IF EXISTS "Authenticated access" ON imoveis_gastos;
DROP POLICY IF EXISTS "Authenticated access" ON emprestimos;

DROP POLICY IF EXISTS "Users can manage their own properties" ON imoveis;
DROP POLICY IF EXISTS "Users can manage their own payments" ON imoveis_pagamentos;
DROP POLICY IF EXISTS "Users can manage their own expenses" ON imoveis_gastos;
DROP POLICY IF EXISTS "Users can manage their own loans" ON emprestimos;

-- 4. Re-create Policies (Simple & Robust)
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

-- 5. Grants (Just in case)
GRANT ALL ON imoveis TO authenticated;
GRANT ALL ON imoveis_pagamentos TO authenticated;
GRANT ALL ON imoveis_gastos TO authenticated;
GRANT ALL ON emprestimos TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
