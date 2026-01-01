-- Migration: Align Schema with User Request (Fix Payments)
-- 1. Alter Table Structure
ALTER TABLE imoveis_pagamentos 
  DROP CONSTRAINT IF EXISTS imoveis_pagamentos_status_check;

ALTER TABLE imoveis_pagamentos
  ADD CONSTRAINT imoveis_pagamentos_status_check CHECK (status IN ('pendente', 'atrasado', 'pago'));

-- Rename/Transform columns if they exist, or create if missing
DO $$
BEGIN
    -- mes_ref -> mes_referencia (TEXT)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='imoveis_pagamentos' AND column_name='mes_ref') THEN
        ALTER TABLE imoveis_pagamentos RENAME COLUMN mes_ref TO mes_referencia;
        ALTER TABLE imoveis_pagamentos ALTER COLUMN mes_referencia TYPE TEXT USING to_char(mes_referencia, 'YYYY-MM');
    END IF;

    -- valor_pago -> valor
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='imoveis_pagamentos' AND column_name='valor_pago') THEN
        ALTER TABLE imoveis_pagamentos RENAME COLUMN valor_pago TO valor;
    END IF;

    -- data_pagamento -> pago_em
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='imoveis_pagamentos' AND column_name='data_pagamento') THEN
        ALTER TABLE imoveis_pagamentos RENAME COLUMN data_pagamento TO pago_em;
    END IF;
END $$;

-- Ensure constraints
ALTER TABLE imoveis_pagamentos DROP CONSTRAINT IF EXISTS imoveis_pagamentos_imovel_id_mes_ref_user_id_key;
ALTER TABLE imoveis_pagamentos ADD CONSTRAINT imoveis_pagamentos_unq UNIQUE (imovel_id, mes_referencia, user_id);

-- 2. RLS Policies
ALTER TABLE imoveis_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON imoveis_pagamentos;
CREATE POLICY "Users can view own payments" ON imoveis_pagamentos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payments" ON imoveis_pagamentos;
CREATE POLICY "Users can insert own payments" ON imoveis_pagamentos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payments" ON imoveis_pagamentos;
CREATE POLICY "Users can update own payments" ON imoveis_pagamentos FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own payments" ON imoveis_pagamentos;
CREATE POLICY "Users can delete own payments" ON imoveis_pagamentos FOR DELETE USING (auth.uid() = user_id);


-- 3. RPC: Gerar Mensalidades (TEXT based)
DROP FUNCTION IF EXISTS gerar_mensalidades_pendentes();

CREATE OR REPLACE FUNCTION gerar_mensalidades_pendentes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_imovel RECORD;
    d_start DATE;
    d_end DATE;
    d_iter DATE;
    v_mes_txt VARCHAR;
    v_status VARCHAR;
BEGIN
    -- Current month start
    d_end := date_trunc('month', now())::DATE;

    FOR r_imovel IN SELECT id, created_at, valor_aluguel, user_id FROM imoveis WHERE user_id = auth.uid() LOOP
        
        -- Default start: created_at or now. 
        -- If created_at is null, fallback to now.
        d_start := date_trunc('month', COALESCE(r_imovel.created_at, now()))::DATE;
        d_iter := d_start;

        WHILE d_iter <= d_end LOOP
            v_mes_txt := to_char(d_iter, 'YYYY-MM');
            
            -- Prepare status
            IF d_iter < d_end THEN
                v_status := 'atrasado';
            ELSE
                v_status := 'pendente';
            END IF;

            -- Insert if not exists
            INSERT INTO imoveis_pagamentos (imovel_id, mes_referencia, status, valor, user_id)
            VALUES (r_imovel.id, v_mes_txt, v_status, NULL, r_imovel.user_id)
            ON CONFLICT (imovel_id, mes_referencia, user_id) DO NOTHING;

            d_iter := d_iter + INTERVAL '1 month';
        END LOOP;

    END LOOP;

    -- Update 'pendente' to 'atrasado' if time passed
    UPDATE imoveis_pagamentos
    SET status = 'atrasado'
    WHERE user_id = auth.uid()
      AND status = 'pendente'
      AND mes_referencia < to_char(d_end, 'YYYY-MM');
END;
$$;
