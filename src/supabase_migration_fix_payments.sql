-- Migration: Fix Property Payments Logic & Backfill RPC

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure Table Structure
CREATE TABLE IF NOT EXISTS public.imoveis_pagamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
    mes_ref VARCHAR(10) NOT NULL, -- Format YYYY-MM-01
    status VARCHAR(20) CHECK (status IN ('pendente', 'pago', 'atrasado')),
    valor_pago NUMERIC,
    data_pagamento TIMESTAMP WITH TIME ZONE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add Unique Constraint (Safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'imoveis_pagamentos_uniq_mes_user') THEN
        ALTER TABLE public.imoveis_pagamentos
        ADD CONSTRAINT imoveis_pagamentos_uniq_mes_user UNIQUE (imovel_id, mes_ref, user_id);
    END IF;
END
$$;

-- 3. RLS Policies
ALTER TABLE public.imoveis_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payments" ON public.imoveis_pagamentos;
CREATE POLICY "Users can view their own payments" ON public.imoveis_pagamentos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.imoveis_pagamentos;
CREATE POLICY "Users can insert their own payments" ON public.imoveis_pagamentos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payments" ON public.imoveis_pagamentos;
CREATE POLICY "Users can update their own payments" ON public.imoveis_pagamentos FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own payments" ON public.imoveis_pagamentos;
CREATE POLICY "Users can delete their own payments" ON public.imoveis_pagamentos FOR DELETE USING (auth.uid() = user_id);

-- 4. RPC to Backfill/Generate Monthly Records
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
    v_mes_ref VARCHAR;
BEGIN
    -- Get current month (start of month)
    d_current := date_trunc('month', now())::DATE;

    -- Iterate over ACTIVE properties for the confirmed user
    FOR r_imovel IN SELECT id, created_at, valor_aluguel, user_id FROM imoveis WHERE user_id = auth.uid() LOOP
        
        -- Safe start date: created_at or fallback (if null, skip or use now)
        d_start := date_trunc('month', COALESCE(r_imovel.created_at, now()))::DATE;
        d_iter := d_start;

        -- Loop until current month
        WHILE d_iter <= d_current LOOP
            v_mes_ref := to_char(d_iter, 'YYYY-MM-01');

            -- Insert if not exists
            INSERT INTO imoveis_pagamentos (imovel_id, mes_ref, status, valor_pago, user_id)
            VALUES (r_imovel.id, v_mes_ref, 'pendente', NULL, r_imovel.user_id)
            ON CONFLICT (imovel_id, mes_ref, user_id) DO NOTHING;

            d_iter := d_iter + INTERVAL '1 month';
        END LOOP;
    END LOOP;
END;
$$;
