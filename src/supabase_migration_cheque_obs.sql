-- Migration: Adicionar campos numero_cheque e observacoes na tabela emprestimos
-- Execute este script no SQL Editor do seu Supabase se desejar salvar numero_cheque e observacoes em campos separados.

ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS numero_cheque text;
ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS observacoes text;
