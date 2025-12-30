
// STRICT SUPABASE TYPES
// Source of Truth: Supabase Schema

export type Frequency = 'monthly' | 'yearly';

export interface Imovel {
    id: string;
    nome: string;
    valor_aluguel: number;
    ativo: boolean;
    dia_pagamento: number; // Day of month (1-31)
    created_at?: string;
    user_id?: string;
}

export interface ImovelPagamento {
    id: string;
    imovel_id: string;
    mes_ref: string; // YYYY-MM-01 (Strict Date)
    status: 'pendente' | 'pago';
    data_pagamento?: string | null; // ISO Timestamp
    valor_pago?: number | null;
    created_at?: string;
    user_id?: string;
}

export interface ImovelGasto {
    id: string;
    imovel_id: string;
    mes_ref: string; // YYYY-MM-01 (Strict Date)
    descricao: string;
    valor: number;
    // Optional category if used in UI, but DB core is minimal
    categoria?: string;
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
    data_pagamento?: string | null; // ISO Timestamp
    created_at?: string;
    user_id?: string;
}
