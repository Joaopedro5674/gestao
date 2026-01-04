-- 1. Ensure mes_referencia is populated (Self-Healing) for EMPRESTIMO_MESES
-- Safe text casting for updates if needed, though usually created_at is timestamptz
UPDATE emprestimo_meses
SET mes_referencia = to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
WHERE (mes_referencia IS NULL OR mes_referencia = '') AND created_at IS NOT NULL;

-- 2. Update the View with ROBUST type handling
-- We cast to ::text before substring to handle both DATE and TEXT column types safely.

CREATE OR REPLACE VIEW dashboard_lucro_mensal AS
WITH 
  current_month_data AS (
    SELECT to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') as current_ym
  ),
  loans_interest AS (
    SELECT COALESCE(SUM(p.valor_juros), 0) as total
    FROM emprestimo_meses p
    JOIN emprestimos e ON e.id = p.emprestimo_id
    CROSS JOIN current_month_data cm
    WHERE e.cobranca_mensal = true
      AND p.pago = true
      -- p.mes_referencia is usually TEXT 'YYYY-MM', but safe to cast
      AND substring(p.mes_referencia::text from 1 for 7) = cm.current_ym
  ),
  rentals_revenue AS (
    SELECT COALESCE(SUM(p.valor), 0) as total
    FROM imoveis_pagamentos p
    CROSS JOIN current_month_data cm
    WHERE p.status = 'pago'
      -- Cast to text to handle if it is stored as DATE or TEXT
      AND substring(p.mes_referencia::text from 1 for 7) = cm.current_ym
  ),
  rentals_expenses AS (
    SELECT COALESCE(SUM(g.valor), 0) as total
    FROM imoveis_gastos g
    CROSS JOIN current_month_data cm
    -- Fix for "function substring(date, ...) does not exist": Cast to text first
    WHERE substring(g.mes_ref::text from 1 for 7) = cm.current_ym
  )
SELECT 
  r.total as alugueis_pagos_mes,
  l.total as juros_recebidos_mes,
  g.total as gastos_mes,
  (r.total - g.total) as lucro_liquido_mes
FROM rentals_revenue r, loans_interest l, rentals_expenses g;
