-- Migration: Dashboard Financial Correction
-- Goal: Create standardized Views for Dashboard consumption
-- ensuring strict monthly cash flow calculation.

-- 1. Ensure 'tipo' column exists in 'emprestimos'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emprestimos' AND column_name = 'tipo') THEN
        ALTER TABLE emprestimos ADD COLUMN tipo text DEFAULT 'pagamento_final';
    END IF;
END $$;

-- 2. Backfill 'tipo' based on 'cobranca_mensal'
-- (Assuming 'cobranca_mensal' exists as per AppContext analysis)
UPDATE emprestimos
SET tipo = 'juros_mensais'
WHERE cobranca_mensal = true;

UPDATE emprestimos
SET tipo = 'pagamento_final'
WHERE cobranca_mensal = false OR cobranca_mensal IS NULL;

-- 3. Create Wrapper View 'gastos' (Maps imoveis_gastos -> gastos)
CREATE OR REPLACE VIEW gastos AS
SELECT
    id,
    user_id,
    valor,
    created_at,
    -- Try to cast mes_ref (YYYY-MM-DD or YYYY-MM) to date.
    -- Assuming mes_ref is YYYY-MM-01 format used in app.
    -- Fix: mes_ref is already a DATE type, so we just use it directly.
    mes_ref as data
FROM imoveis_gastos;

-- 4. Create Wrapper View 'emprestimos_pagamentos' (Maps emprestimo_meses -> emprestimos_pagamentos)
CREATE OR REPLACE VIEW emprestimos_pagamentos AS
SELECT
    id,
    emprestimo_id,
    valor_juros as valor,
    mes_referencia,
    CASE WHEN pago = true THEN 'pago' ELSE 'pendente' END as status,
    user_id
FROM emprestimo_meses;

-- 5. Create Logic View 'dashboard_lucro_mensal'
CREATE OR REPLACE VIEW dashboard_lucro_mensal AS
WITH
  current_month_ref AS (
    -- Get current year-month in Sao Paulo time
    SELECT to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') as ym
  ),
  -- A. Alugueis Pagos (From imoveis_pagamentos, strict)
  alugueis AS (
    SELECT COALESCE(SUM(valor), 0) as total
    FROM imoveis_pagamentos
    CROSS JOIN current_month_ref
    WHERE status = 'pago'
    AND substring(mes_referencia from 1 for 7) = current_month_ref.ym
  ),
  -- B. Juros Pagos (From Wrapper View, strict)
  juros AS (
    SELECT COALESCE(SUM(valor), 0) as total
    FROM emprestimos_pagamentos
    JOIN emprestimos ON emprestimos.id = emprestimos_pagamentos.emprestimo_id
    CROSS JOIN current_month_ref
    WHERE emprestimos.tipo = 'juros_mensais'
    AND emprestimos_pagamentos.status = 'pago'
    AND substring(emprestimos_pagamentos.mes_referencia from 1 for 7) = current_month_ref.ym
  ),
  -- C. Gastos (From Wrapper View)
  despesas AS (
    SELECT COALESCE(SUM(valor), 0) as total
    FROM gastos
    CROSS JOIN current_month_ref
    WHERE to_char(data, 'YYYY-MM') = current_month_ref.ym
  )
SELECT
  (SELECT total FROM alugueis) as alugueis_pagos_mes,
  (SELECT total FROM juros) as juros_recebidos_mes,
  (SELECT total FROM despesas) as gastos_mes,
  ((SELECT total FROM alugueis) + (SELECT total FROM juros) - (SELECT total FROM despesas)) as lucro_liquido_mes;
