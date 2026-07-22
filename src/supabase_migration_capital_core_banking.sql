-- ====================================================================
-- MIGRATION: Core Banking Engine & Módulo CAPITAL
-- Tabela de Dupla Entrada, Regras Versicionadas, Feriados e Divergências
-- ====================================================================

-- 1. Tabela de Bancos / Instituições Financeiras
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    icon_url TEXT,
    brand_color TEXT DEFAULT '#4f46e5',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Produtos Financeiros
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    product_code TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Regras Tributárias (IOF e IR Regressivos ou Isentos)
CREATE TABLE IF NOT EXISTS tax_rules_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_exempt BOOLEAN DEFAULT false,
    iof_table_json JSONB NOT NULL,
    ir_table_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Versões de Regras de Produtos (Rule Engine Versioning)
CREATE TABLE IF NOT EXISTS product_rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    valid_to TIMESTAMP WITH TIME ZONE,
    indexer_code TEXT NOT NULL DEFAULT 'CDI', -- CDI, SELIC, IPCA, PRE
    indexer_percentage NUMERIC(10, 4) NOT NULL DEFAULT 100.0000, -- ex: 100.00, 105.00
    day_count_convention TEXT NOT NULL DEFAULT 'BUSINESS_252', -- BUSINESS_252, CALENDAR_365
    tax_rule_id UUID NOT NULL REFERENCES tax_rules_config(id),
    allows_partial_withdrawals BOOLEAN DEFAULT true,
    rounding_mode TEXT DEFAULT 'HALF_EVEN', -- HALF_EVEN, FLOOR, CEIL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(product_id, version_number)
);

-- 5. Tabela de Lotes de Investimento (Aportes Independentes)
CREATE TABLE IF NOT EXISTS investment_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_rule_version_id UUID NOT NULL REFERENCES product_rule_versions(id),
    deposit_date TIMESTAMP WITH TIME ZONE NOT NULL,
    initial_principal NUMERIC(24, 10) NOT NULL,
    current_balance NUMERIC(24, 10) NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PARTIAL_WITHDRAWN, CLOSED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Contas do Ledger (Dupla Entrada / Double-Entry)
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- ASSET_BANK, REVENUE_YIELD, LIABILITY_TAX_IOF, LIABILITY_TAX_IR, CLIENT_PATRIMONY
    currency TEXT DEFAULT 'BRL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Transações Contábeis (Transações de Dupla Entrada)
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    value_date TIMESTAMP WITH TIME ZONE NOT NULL,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    transaction_type TEXT NOT NULL, -- APORTE, RENDIMENTO_DIARIO, RESGATE, CONCILIACAO
    rule_version_id UUID REFERENCES product_rule_versions(id),
    description TEXT,
    status TEXT DEFAULT 'POSTED'
);

-- 8. Tabela de Lançamentos do Ledger (Débitos e Créditos)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    lot_id UUID REFERENCES investment_lots(id),
    entry_type TEXT NOT NULL, -- DEBIT, CREDIT
    amount NUMERIC(24, 10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Tabela de Taxas Diárias de Indexadores (CDI / Selic Históricos)
CREATE TABLE IF NOT EXISTS daily_rates (
    reference_date DATE NOT NULL,
    indexer_code TEXT NOT NULL DEFAULT 'CDI',
    annual_rate NUMERIC(24, 10) NOT NULL, -- ex: 10.6500
    daily_factor NUMERIC(24, 10) NOT NULL, -- ex: 1.0004012345
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (reference_date, indexer_code)
);

-- 10. Tabela de Snapshots Diários por Lote
CREATE TABLE IF NOT EXISTS daily_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES investment_lots(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    gross_balance NUMERIC(24, 10) NOT NULL,
    net_balance NUMERIC(24, 10) NOT NULL,
    gross_yield_day NUMERIC(24, 10) NOT NULL,
    net_yield_day NUMERIC(24, 10) NOT NULL,
    iof_accumulated NUMERIC(24, 10) NOT NULL,
    ir_accumulated NUMERIC(24, 10) NOT NULL,
    calendar_days INTEGER NOT NULL,
    business_days INTEGER NOT NULL,
    cdi_used NUMERIC(24, 10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(lot_id, snapshot_date)
);

-- 11. Tabela de Resgates Realizados (Withdrawals Audit)
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES investment_lots(id),
    withdrawal_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount_requested NUMERIC(24, 10) NOT NULL,
    principal_withdrawn NUMERIC(24, 10) NOT NULL,
    gross_yield_realized NUMERIC(24, 10) NOT NULL,
    iof_paid NUMERIC(24, 10) NOT NULL,
    ir_paid NUMERIC(24, 10) NOT NULL,
    net_received NUMERIC(24, 10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. Tabela de Métricas de Conciliação e Divergência de Centavos
CREATE TABLE IF NOT EXISTS divergence_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bank_id UUID NOT NULL REFERENCES banks(id),
    check_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_reported_balance NUMERIC(24, 10) NOT NULL,
    engine_calculated_balance NUMERIC(24, 10) NOT NULL,
    divergence_cents NUMERIC(24, 10) NOT NULL,
    status TEXT NOT NULL DEFAULT 'DIVERGENT', -- MATCH, DIVERGENT, ADJUSTED
    adjustment_notes TEXT
);

-- 13. Tabela de Feriados Bancários B3/ANBIMA
CREATE TABLE IF NOT EXISTS holidays (
    holiday_date DATE PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'NATIONAL_BANKING'
);

-- ====================================================================
-- SEED DATA INICIAL (BANCOS, PRODUTOS E REGRAS TRIBUTÁRIAS)
-- ====================================================================

-- Inserir Regra Tributária Padrão (CDB com IOF e IR Regressivos)
INSERT INTO tax_rules_config (id, code, name, is_exempt, iof_table_json, ir_table_json)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    'STANDARD_CDB_IOF_IR',
    'Tributação Padrão Renda Fica (IOF + IR Regressivo)',
    false,
    '{"1": 0.96, "2": 0.93, "3": 0.90, "4": 0.86, "5": 0.83, "6": 0.80, "7": 0.76, "8": 0.73, "9": 0.70, "10": 0.66, "11": 0.63, "12": 0.60, "13": 0.56, "14": 0.53, "15": 0.50, "16": 0.46, "17": 0.43, "18": 0.40, "19": 0.36, "20": 0.33, "21": 0.30, "22": 0.26, "23": 0.23, "24": 0.20, "25": 0.16, "26": 0.13, "27": 0.10, "28": 0.06, "29": 0.03, "30": 0.00}'::jsonb,
    '{"180": 0.225, "360": 0.20, "720": 0.175, "9999": 0.15}'::jsonb
) ON CONFLICT (code) DO NOTHING;

-- Inserir Banco Nubank
INSERT INTO banks (id, code, name, brand_color)
VALUES ('11111111-1111-1111-1111-111111111111', '260_NUBANK', 'Nubank', '#820ad1')
ON CONFLICT (code) DO NOTHING;

-- Inserir Banco Mercado Pago
INSERT INTO banks (id, code, name, brand_color)
VALUES ('22222222-2222-2222-2222-222222222222', '323_MERCADOPAGO', 'Mercado Pago', '#009ee3')
ON CONFLICT (code) DO NOTHING;

-- Inserir Produto Nubank Caixinha 100% CDI
INSERT INTO products (id, bank_id, name, product_code)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Caixinha Reserva 100% CDI', 'NUBANK_CAIXINHA_100CDI')
ON CONFLICT (product_code) DO NOTHING;

-- Inserir Produto Mercado Pago 105% CDI
INSERT INTO products (id, bank_id, name, product_code)
VALUES ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Conta Remunerada 105% CDI', 'MERCADOPAGO_CONTA_105CDI')
ON CONFLICT (product_code) DO NOTHING;

-- Versão da Regra Nubank (100% CDI)
INSERT INTO product_rule_versions (id, product_id, version_number, valid_from, indexer_code, indexer_percentage, day_count_convention, tax_rule_id)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    1,
    '2020-01-01 00:00:00+00',
    'CDI',
    100.0000,
    'BUSINESS_252',
    '88888888-8888-8888-8888-888888888888'
) ON CONFLICT (product_id, version_number) DO NOTHING;

-- Versão da Regra Mercado Pago (105% CDI)
INSERT INTO product_rule_versions (id, product_id, version_number, valid_from, indexer_code, indexer_percentage, day_count_convention, tax_rule_id)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    1,
    '2020-01-01 00:00:00+00',
    'CDI',
    105.0000,
    'BUSINESS_252',
    '88888888-8888-8888-8888-888888888888'
) ON CONFLICT (product_id, version_number) DO NOTHING;
