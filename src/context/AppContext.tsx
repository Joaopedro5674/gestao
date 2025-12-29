"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Imovel, ImovelPagamento, Emprestimo, Expense } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

interface AppContextType {
    imoveis: Imovel[];
    imoveisPagamentos: ImovelPagamento[];
    emprestimos: Emprestimo[];
    expenses: Expense[]; // Keeping as is for now, but linked to imovel_id
    loading: boolean;

    // Imovel Actions
    adicionarImovel: (imovel: Omit<Imovel, "id" | "created_at">) => Promise<void>;
    atualizarImovel: (id: string, updates: Partial<Imovel>) => Promise<void>;
    deletarImovel: (id: string) => Promise<void>;

    // Pagamento Actions
    receberPagamento: (imovelId: string, dataPagamento: Date) => Promise<void>;

    // Emprestimo Actions
    adicionarEmprestimo: (emprestimo: Omit<Emprestimo, "id" | "created_at">) => Promise<void>;
    marcarEmprestimoPago: (id: string) => Promise<void>;
    deletarEmprestimo: (id: string) => Promise<void>;

    // Expense Actions (Keeping compatibility logic where possible or simple updates)
    addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType>({
    imoveis: [],
    imoveisPagamentos: [],
    emprestimos: [],
    expenses: [],
    loading: true,
    adicionarImovel: async () => { },
    atualizarImovel: async () => { },
    deletarImovel: async () => { },
    receberPagamento: async () => { },
    adicionarEmprestimo: async () => { },
    marcarEmprestimoPago: async () => { },
    deletarEmprestimo: async () => { },
    addExpense: async () => { },
    deleteExpense: async () => { },
});

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [imoveis, setImoveis] = useState<Imovel[]>([]);
    const [imoveisPagamentos, setImoveisPagamentos] = useState<ImovelPagamento[]>([]);
    const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    // --- FETCH DATA (SUPABASE) ---
    const fetchData = useCallback(async () => {
        if (!user) {
            setImoveis([]);
            setImoveisPagamentos([]);
            setEmprestimos([]);
            setExpenses([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Imoveis
            const { data: imoveisData, error: imoveisError } = await supabase.from('imoveis').select('*').order('created_at');
            if (imoveisError) throw imoveisError;

            // 2. Emprestimos
            const { data: emprestimosData, error: emprestimosError } = await supabase.from('emprestimos').select('*').order('created_at');
            if (emprestimosError) throw emprestimosError;

            // 3. Imoveis Pagamentos
            const { data: pagamentosData, error: pagamentosError } = await supabase.from('imoveis_pagamentos').select('*');
            if (pagamentosError) throw pagamentosError;

            // 4. Expenses (Legacy table 'expenses'?)
            const { data: expsData, error: expsError } = await supabase.from('expenses').select('*');
            if (expsError) console.warn("Expenses table check failed or empty", expsError);

            setImoveis(imoveisData || []);
            setEmprestimos(emprestimosData || []);
            setImoveisPagamentos(pagamentosData || []);
            setExpenses(expsData || []); // Mapping needed? Interface matches DB snake_case? Expense interface is mixed.
            // Expense interface: property_id, amount, description... likely matches DB if I updated types.

        } catch (error) {
            console.error("Error fetching (Supabase):", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- ACTIONS (SUPABASE) ---

    // IMOVEIS
    const adicionarImovel = async (imovel: Omit<Imovel, "id" | "created_at">) => {
        if (!user) return;
        const { error } = await supabase.from('imoveis').insert({
            ...imovel,
            user_id: user.id
        });
        if (error) throw error;
        await fetchData();
    };

    const atualizarImovel = async (id: string, updates: Partial<Imovel>) => {
        const { error } = await supabase.from('imoveis').update(updates).eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    const deletarImovel = async (id: string) => {
        const { error } = await supabase.from('imoveis').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    // PAGAMENTOS
    const receberPagamento = async (imovelId: string, dataPagamento: Date) => {
        if (!user) return;

        // Calculate mes_ref (YYYY-MM-01)
        const year = dataPagamento.getFullYear();
        const month = dataPagamento.getMonth() + 1; // 1-based
        const mesRef = `${year}-${String(month).padStart(2, '0')}-01`;

        // Check if already paid
        const { data: existing } = await supabase
            .from('imoveis_pagamentos')
            .select('*')
            .eq('imovel_id', imovelId)
            .eq('mes_ref', mesRef)
            .single();

        if (existing && existing.status === 'pago') {
            console.warn("Pagamento já realizado para este mês.");
            return;
        }

        // Get Rent Value from Property to ensure consistency?
        // Or update it? Logic: Save current rent value as `valor_pago`.
        const { data: imovel } = await supabase.from('imoveis').select('valor_aluguel').eq('id', imovelId).single();
        if (!imovel) throw new Error("Imovel not found");

        const payload = {
            imovel_id: imovelId,
            mes_ref: mesRef,
            status: 'pago',
            data_pagamento: new Date().toISOString(),
            valor_pago: imovel.valor_aluguel,
            user_id: user.id
        };

        if (existing) {
            const { error } = await supabase
                .from('imoveis_pagamentos')
                .update(payload)
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('imoveis_pagamentos')
                .insert(payload);
            if (error) throw error;
        }

        await fetchData();
    };

    // EMPRESTIMOS
    const adicionarEmprestimo = async (emprestimo: Omit<Emprestimo, "id" | "created_at">) => {
        if (!user) return;
        const { error } = await supabase.from('emprestimos').insert({
            ...emprestimo,
            user_id: user.id
        });
        if (error) throw error;
        await fetchData();
    };

    const marcarEmprestimoPago = async (id: string) => {
        const { error } = await supabase.from('emprestimos').update({
            status: 'pago',
            data_pagamento: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    const deletarEmprestimo = async (id: string) => {
        const { error } = await supabase.from('emprestimos').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    // EXPENSES (Legacy/Mixed)
    const addExpense = async (expense: Omit<Expense, "id">) => {
        if (!user) return;
        const { error } = await supabase.from('expenses').insert({
            user_id: user.id,
            property_id: expense.property_id,
            month: expense.month,
            year: expense.year,
            amount: expense.amount,
            category: expense.category,
            description: expense.description
        });
        if (error) throw error;
        await fetchData();
    };

    const deleteExpense = async (id: string) => {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    return (
        <AppContext.Provider
            value={{
                imoveis,
                imoveisPagamentos,
                emprestimos,
                expenses,
                loading,
                adicionarImovel,
                atualizarImovel,
                deletarImovel,
                receberPagamento,
                adicionarEmprestimo,
                marcarEmprestimoPago,
                deletarEmprestimo,
                addExpense,
                deleteExpense
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

