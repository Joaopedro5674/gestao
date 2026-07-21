-- ==========================================
-- SCRIPT DE MIGRAÇÃO: ADIÇÃO DO TIPO CARTÃO
-- ==========================================
-- Como executar:
-- 1. Abra o painel do seu Supabase (https://supabase.com)
-- 2. Vá em "SQL Editor"
-- 3. Crie uma nova query, cole este script e clique em "Run"

-- 1. Adiciona colunas para suportar Empréstimos tipo Cartão na tabela principal
ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'comum';
ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS cartao_senha text;
ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS cartao_valor_retirada numeric;
ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS cartao_final_nis int;
ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS cartao_quantidade_meses int;

-- 2. Cria tabela de apoio para o Calendário NIS
CREATE TABLE IF NOT EXISTS calendario_nis (
  final_nis int PRIMARY KEY,
  dia_pagamento int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilita Row Level Security (RLS) para a nova tabela
ALTER TABLE calendario_nis ENABLE ROW LEVEL SECURITY;

-- Remove política antiga se existir (para evitar erros ao rodar duas vezes)
DROP POLICY IF EXISTS "Permitir leitura para usuarios autenticados" ON calendario_nis;
DROP POLICY IF EXISTS "Permitir escrita para usuarios autenticados" ON calendario_nis;

-- Cria política permitindo leitura de dados do calendário para usuários autenticados
CREATE POLICY "Permitir leitura para usuarios autenticados" ON calendario_nis
    FOR SELECT TO authenticated USING (true);

-- Cria política permitindo escrita de dados do calendário para usuários autenticados
CREATE POLICY "Permitir escrita para usuarios autenticados" ON calendario_nis
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Popula com os dias de pagamento padrão por final de NIS
INSERT INTO calendario_nis (final_nis, dia_pagamento) VALUES
  (1, 18),
  (2, 19),
  (3, 20),
  (4, 21),
  (5, 22),
  (6, 25),
  (7, 26),
  (8, 27),
  (9, 28),
  (0, 29)
ON CONFLICT (final_nis) DO UPDATE SET dia_pagamento = EXCLUDED.dia_pagamento;

-- Concede privilégios de acesso às tabelas para a role autenticada
GRANT ALL ON calendario_nis TO authenticated;
