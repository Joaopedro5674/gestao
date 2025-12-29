
export type Frequency = 'monthly' | 'yearly'; // Simplified

// SUPABASE MAPPED TYPES (Snake Case matches DB, camelCase where appropriate if mapped)

export interface Imovel {
    id: string;
    user_id?: string;
    nome: string;
    valor_aluguel: number;
    ativo: boolean;
    created_at?: string;
}

export interface ImovelPagamento {
    id: string;
    imovel_id: string;
    mes_ref: string; // YYYY-MM-DD (Always 01)
    status: 'pendente' | 'pago';
    data_pagamento?: string; // ISO date
    valor_pago?: number;
    created_at?: string;
    user_id?: string;
}

export interface Emprestimo {
    id: string;
    cliente_nome: string;
    valor_emprestado: number;
    juros_mensal: number;
    dias_contratados: number;
    juros_total_contratado: number;
    data_inicio: string; // YYYY-MM-DD
    data_fim: string;    // YYYY-MM-DD
    status: 'ativo' | 'pago';
    data_pagamento?: string; // ISO
    created_at?: string;
    user_id?: string;
}

// Keeping Expense for now as it wasn't mentioned to be overhauled, but we might need to update it to use Property ID correctly if that changed?
// The prompt didn't strictly say to delete Expenses, but it's part of the dashboard.
// We should check if we need to migrate expenses table too. The prompt only listed 3 tables.
// We will keep Expense interface compatible with existing code or update if we rename it.
// User said "Estratégia de de migração... assumindo a partir do zero ou manual".
// I will keep Expense as is for now, but linked to `imovel_id` instead of `propertyId`?
// No, the legacy code used `property_id` in DB.
// I'll keep the interface but we will likely need to adjust usage in code.
export interface Expense {
    id: string;
    property_id: string; // Refers to Imovel.id
    description: string;
    amount: number;
    category: 'manutencao' | 'imposto' | 'emergencia' | 'outros';
    month: number;
    year: number;
}
