-- Force drop to ensure no stale signature or logic persists
DROP FUNCTION IF EXISTS gerar_mensalidades_pendentes();

CREATE OR REPLACE FUNCTION gerar_mensalidades_pendentes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_imovel RECORD;
    d_start DATE;
    d_current DATE;
    d_iter DATE;
    v_mes_ref DATE;
BEGIN
    -- Get current month (start of month)
    d_current := date_trunc('month', now())::DATE;

    -- 1. Iterate over properties to Backfill missing months
    FOR r_imovel IN SELECT id, created_at, valor_aluguel, user_id FROM imoveis WHERE user_id = auth.uid() LOOP
        
        -- Start from created_at or now if null
        d_start := date_trunc('month', COALESCE(r_imovel.created_at, now()))::DATE;
        d_iter := d_start;

        -- Loop until current month
        WHILE d_iter <= d_current LOOP
            -- v_mes_ref := to_char(d_iter, 'YYYY-MM-01'); -- WRONG: target is DATE
            v_mes_ref := d_iter; -- CORRECT: d_iter is already DATE

            -- Determine initial status based on time
            -- If d_iter is strictly before current month, it starts as 'atrasado' if we are inserting now (late).
            -- But standard logic: insert 'pendente', then update later.
            -- Actually, let's insert correct status right away if missing.
            
            IF d_iter < d_current THEN
                 INSERT INTO imoveis_pagamentos (imovel_id, mes_ref, status, valor_pago, user_id)
                 VALUES (r_imovel.id, v_mes_ref, 'atrasado', NULL, r_imovel.user_id)
                 ON CONFLICT (imovel_id, mes_ref, user_id) DO NOTHING;
            ELSE
                 INSERT INTO imoveis_pagamentos (imovel_id, mes_ref, status, valor_pago, user_id)
                 VALUES (r_imovel.id, v_mes_ref, 'pendente', NULL, r_imovel.user_id)
                 ON CONFLICT (imovel_id, mes_ref, user_id) DO NOTHING;
            END IF;

            d_iter := d_iter + INTERVAL '1 month';
        END LOOP;
    END LOOP;

    -- 2. Update existing 'pendente' records that became 'atrasado'
    -- This handles the case where time passed and the month turned.
    UPDATE imoveis_pagamentos
    SET status = 'atrasado'
    WHERE user_id = auth.uid()
      AND status = 'pendente'
      AND mes_ref < d_current; -- Compare DATE < DATE

END;
$$;
