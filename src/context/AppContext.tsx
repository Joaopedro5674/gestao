"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Imovel, ImovelPagamento, Emprestimo, ImovelGasto } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { useToast } from "@/components/ToastProvider";

interface AppContextType {
    imoveis: Imovel[];
    imoveisPagamentos: ImovelPagamento[];
    imoveisGastos: ImovelGasto[]; // Renamed from expenses
    emprestimos: Emprestimo[];
    loading: boolean;

    // Imovel Actions
    adicionarImovel: (imovel: Omit<Imovel, "id" | "created_at" | "user_id">) => Promise<void>;
    atualizarImovel: (id: string, updates: Partial<Imovel>) => Promise<void>;
    deletarImovel: (id: string) => Promise<void>;

    // Pagamento Actions
    receberPagamento: (imovelId: string, dataPagamento: Date) => Promise<void>;

    // Gasto Actions (Refactored)
    adicionarGasto: (gasto: Omit<ImovelGasto, "id" | "created_at" | "user_id">) => Promise<void>;
    deletarGasto: (id: string) => Promise<void>;

    // Emprestimo Actions
    adicionarEmprestimo: (emprestimo: Omit<Emprestimo, "id" | "created_at" | "user_id">) => Promise<void>;
    atualizarEmprestimo: (id: string, updates: Partial<Emprestimo>) => Promise<void>;
    marcarEmprestimoPago: (id: string) => Promise<void>;
    deletarEmprestimo: (id: string) => Promise<void>;

    refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
    imoveis: [],
    imoveisPagamentos: [],
    imoveisGastos: [],
    emprestimos: [],
    loading: true,
    adicionarImovel: async () => { },
    atualizarImovel: async () => { },
    deletarImovel: async () => { },
    receberPagamento: async () => { },
    adicionarGasto: async () => { },
    deletarGasto: async () => { },
    adicionarEmprestimo: async () => { },
    atualizarEmprestimo: async () => { },
    marcarEmprestimoPago: async () => { },
    deletarEmprestimo: async () => { },
    refreshData: async () => { },
});

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [imoveis, setImoveis] = useState<Imovel[]>([]);
    const [imoveisPagamentos, setImoveisPagamentos] = useState<ImovelPagamento[]>([]);
    const [imoveisGastos, setImoveisGastos] = useState<ImovelGasto[]>([]);
    const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
    const [loading, setLoading] = useState(true);

    // --- FETCH DATA (SUPABASE) ---
    // STRICT SOURCE OF TRUTH
    const fetchData = useCallback(async () => {
        if (!user) {
            setImoveis([]);
            setImoveisPagamentos([]);
            setImoveisGastos([]);
            setEmprestimos([]);
            setLoading(false);
            return;
        }

        // Safety check if supabase is not initialized correctly (e.g. missing envs)
        if (!supabase) {
            console.error("Supabase client not initialized.");
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

            // 4. Imoveis Gastos
            const { data: gastosData, error: gastosError } = await supabase.from('imoveis_gastos').select('*');
            if (gastosError) {
                // Determine if table missing or empty. Suppress if just empty.
                console.warn("Gastos fetch error (might be empty/missing):", gastosError.message);
            }

            setImoveis(imoveisData || []);
            setEmprestimos(emprestimosData || []);
            setImoveisPagamentos(pagamentosData || []);
            setImoveisGastos(gastosData || []);

        } catch (error) {
            console.error("Error fetching (Supabase):", error);
            showToast("Erro ao sincronizar dados", "error");
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- ACTIONS (SUPABASE) ---

    // IMOVEIS
    const adicionarImovel = async (imovel: Omit<Imovel, "id" | "created_at" | "user_id">) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('imoveis').insert({
                ...imovel,
                user_id: user.id
            });
            if (error) throw error;
            showToast("Imóvel adicionado", "success");
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao adicionar imóvel", "error");
        }
    };

    const atualizarImovel = async (id: string, updates: Partial<Imovel>) => {
        try {
            const { error } = await supabase.from('imoveis').update(updates).eq('id', id);
            if (error) throw error;
            showToast("Imóvel atualizado", "success");
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao atualizar imóvel", "error");
        }
    };

    const deletarImovel = async (id: string) => {
        try {
            // 1. Apagar todos os gastos do imóvel
            const { error: gastosError } = await supabase.from('imoveis_gastos').delete().eq('imovel_id', id);
            if (gastosError) throw gastosError;

            // 2. Apagar todos os pagamentos do imóvel
            const { error: pagamentosError } = await supabase.from('imoveis_pagamentos').delete().eq('imovel_id', id);
            if (pagamentosError) throw pagamentosError;

            // 3. Apagar o imóvel principal
            const { error: imovelError } = await supabase.from('imoveis').delete().eq('id', id);
            if (imovelError) throw imovelError;

            showToast("Imóvel e todos os registros relacionados foram excluídos", "success");

            // CRITICAL: Full re-fetch to update all parts of the app (Dashboard, Reports, etc.)
            await fetchData();
        } catch (e: any) {
            console.error("Erro ao deletar imóvel:", e);
            showToast("Erro ao excluir imóvel: " + (e.message || "Tente novamente"), "error");
        }
    };

    // PAGAMENTOS REFACTOR
    const receberPagamento = async (imovelId: string, dataPagamento: Date) => {
        if (!user) {
            showToast("Usuário não autenticado", "error");
            return;
        }

        // Strict MesRef: YYYY-MM-01
        const year = dataPagamento.getFullYear();
        const month = dataPagamento.getMonth() + 1;
        const mesRef = `${year}-${String(month).padStart(2, '0')}-01`;

        try {
            // 2. Get current Rent Value
            const imovel = imoveis.find(i => i.id === imovelId);
            if (!imovel) throw new Error("Imóvel não encontrado localmente");

            const payload = {
                imovel_id: imovelId,
                mes_ref: mesRef,
                status: 'pago' as const,
                data_pagamento: new Date().toISOString(), // Save exact time of click
                valor_pago: imovel.valor_aluguel,
                user_id: user.id
            };

            // 3. Upsert (or Insert if UNIQUE key works)
            // Using upsert on (imovel_id, mes_ref)
            const { error } = await supabase
                .from('imoveis_pagamentos')
                .upsert(payload, { onConflict: 'imovel_id, mes_ref' });

            if (error) throw error;

            showToast(`Pagamento recebido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}`, "success");

            // CRITICAL: Full fetch after success
            await fetchData();

        } catch (e: any) {
            console.error(e);
            showToast("Erro ao processar pagamento", "error");
        }
    };

    // GASTOS (RESTORATION)
    const adicionarGasto = async (gasto: Omit<ImovelGasto, "id" | "created_at" | "user_id">) => {
        if (!user) {
            showToast("Usuário não autenticado", "error");
            return;
        }
        try {
            const { error } = await supabase.from('imoveis_gastos').insert({
                ...gasto,
                user_id: user.id
            });
            if (error) throw error;
            showToast("Gasto registrado com sucesso", "success");

            // CRITICAL: Full fetch after success
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao adicionar gasto", "error");
        }
    };

    const deletarGasto = async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('imoveis_gastos').delete().eq('id', id);
            if (error) throw error;
            showToast("Gasto removido", "success");

            // CRITICAL: Full fetch after success
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao remover gasto", "error");
        }
    };

    // EMPRESTIMOS
    const adicionarEmprestimo = async (emprestimo: Omit<Emprestimo, "id" | "created_at" | "user_id">) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('emprestimos').insert({
                ...emprestimo,
                user_id: user.id
            });
            if (error) throw error;
            showToast("Empréstimo criado", "success");
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao criar empréstimo", "error");
        }
    };

    const atualizarEmprestimo = async (id: string, updates: Partial<Emprestimo>) => {
        try {
            const { error } = await supabase.from('emprestimos').update(updates).eq('id', id);
            if (error) throw error;
            showToast("Empréstimo atualizado", "success");
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao atualizar empréstimo", "error");
        }
    };

    const marcarEmprestimoPago = async (id: string) => {
        try {
            const { error } = await supabase.from('emprestimos').update({
                status: 'pago',
                data_pagamento: new Date().toISOString()
            }).eq('id', id);

            if (error) throw error;
            showToast("Empréstimo marcado como pago", "success");
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao atualizar empréstimo", "error");
        }
    };

    const deletarEmprestimo = async (id: string) => {
        try {
            const { error } = await supabase.from('emprestimos').delete().eq('id', id);
            if (error) throw error;
            showToast("Empréstimo excluído", "success");
            await fetchData();
        } catch (e: any) {
            console.error(e);
            showToast("Erro ao excluir empréstimo", "error");
        }
    };

    return (
        <AppContext.Provider
            value={{
                imoveis,
                imoveisPagamentos,
                imoveisGastos,
                emprestimos,
                loading,
                adicionarImovel,
                atualizarImovel,
                deletarImovel,
                receberPagamento,
                adicionarGasto,
                deletarGasto,
                adicionarEmprestimo,
                atualizarEmprestimo,
                marcarEmprestimoPago,
                deletarEmprestimo,
                refreshData: fetchData
            }}
        >
            {children}
        </AppContext.Provider>
    );
}
