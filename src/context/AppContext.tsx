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
            console.log("Audit: Sincronizando dados para usuário", user.id);
            // 1. Imoveis
            const { data: imoveisData, error: imoveisError } = await supabase
                .from('imoveis')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at');
            if (imoveisError) throw imoveisError;

            // 2. Emprestimos
            const { data: emprestimosData, error: emprestimosError } = await supabase
                .from('emprestimos')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at');
            if (emprestimosError) throw emprestimosError;

            // 3. Imoveis Pagamentos
            const { data: pagamentosData, error: pagamentosError } = await supabase
                .from('imoveis_pagamentos')
                .select('*')
                .eq('user_id', user.id);
            if (pagamentosError) throw pagamentosError;

            // 4. Imoveis Gastos
            const { data: gastosData, error: gastosError } = await supabase
                .from('imoveis_gastos')
                .select('*')
                .eq('user_id', user.id);
            if (gastosError) {
                console.warn("Audit: Erro ao buscar gastos (pode estar vazia):", gastosError.message);
            }

            setImoveis(imoveisData || []);
            setEmprestimos(emprestimosData || []);
            setImoveisPagamentos(pagamentosData || []);
            setImoveisGastos(gastosData || []);
            console.log("Audit: Sincronização concluída com sucesso.");

        } catch (error) {
            console.error("Audit Critical: Erro de sincronização:", error);
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
        console.log("Supabase: Adicionando imóvel...", imovel);
        try {
            const { data, error } = await supabase.from('imoveis').insert({
                ...imovel,
                user_id: user.id
            }).select();

            if (error) throw error;
            console.log("Supabase: Imóvel adicionado com sucesso:", data);

            showToast("Imóvel adicionado", "success");
            await fetchData();
        } catch (e) {
            console.error("Supabase Error (adicionarImovel):", e);
            showToast("Erro ao adicionar imóvel", "error");
            throw e; // Rethrow to prevent false success in UI
        }
    };

    const atualizarImovel = async (id: string, updates: Partial<Imovel>) => {
        if (!user) return;
        console.log(`Audit: Atualizando imóvel ${id} para usuário ${user.id}...`, updates);
        try {
            const { data, error } = await supabase
                .from('imoveis')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select();

            if (error) throw error;
            console.log("Audit Success: Imóvel atualizado:", data);

            showToast("Imóvel atualizado", "success");
            await fetchData();
        } catch (e) {
            console.error("Audit Critical: Erro ao atualizar imóvel:", e);
            showToast("Erro ao atualizar imóvel", "error");
            throw e;
        }
    };

    const deletarImovel = async (id: string) => {
        if (!user) return;
        console.log(`Audit: Excluindo imóvel ${id} e registros relacionados para usuário ${user.id}...`);
        try {
            // 1. Apagar todos os gastos do imóvel (Filtro por imovel_id e user_id)
            const { error: gastosError } = await supabase
                .from('imoveis_gastos')
                .delete()
                .eq('imovel_id', id)
                .eq('user_id', user.id);
            if (gastosError) throw gastosError;

            // 2. Apagar todos os pagamentos do imóvel
            const { error: pagamentosError } = await supabase
                .from('imoveis_pagamentos')
                .delete()
                .eq('imovel_id', id)
                .eq('user_id', user.id);
            if (pagamentosError) throw pagamentosError;

            // 3. Apagar o imóvel principal
            const { error: imovelError } = await supabase
                .from('imoveis')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            if (imovelError) throw imovelError;

            console.log("Audit Success: Imóvel e dependências excluídos.");
            showToast("Imóvel e todos os registros relacionados foram excluídos", "success");
            await fetchData();
        } catch (e) {
            const error = e as { message?: string };
            console.error("Audit Critical: Erro ao deletar imóvel:", error);
            showToast("Erro ao excluir imóvel: " + (error.message || "Tente novamente"), "error");
        }
    };

    // PAGAMENTOS REFACTOR
    const receberPagamento = async (imovelId: string, dataPagamento: Date) => {
        if (!user) {
            showToast("Usuário não autenticado", "error");
            return;
        }

        // Strict MesRef: YYYY-MM-01 (ISO Fix)
        const year = dataPagamento.getFullYear();
        const month = String(dataPagamento.getMonth() + 1).padStart(2, '0');
        const mesRef = `${year}-${month}-01`;

        console.log(`Supabase: Registrando pagamento para ${imovelId} em ${mesRef}...`);

        try {
            const imovel = imoveis.find(i => i.id === imovelId);
            if (!imovel) throw new Error("Imóvel não encontrado localmente");

            const payload = {
                imovel_id: imovelId,
                mes_ref: mesRef,
                status: 'pago' as const,
                data_pagamento: new Date().toISOString(),
                valor_pago: imovel.valor_aluguel,
                user_id: user.id
            };

            const { data, error } = await supabase
                .from('imoveis_pagamentos')
                .upsert(payload, { onConflict: 'imovel_id, mes_ref' })
                .select();

            if (error) throw error;
            console.log("Supabase: Pagamento registrado:", data);

            showToast(`Pagamento recebido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}`, "success");
            await fetchData();

        } catch (e) {
            console.error("Supabase Error (receberPagamento):", e);
            showToast("Erro ao processar pagamento", "error");
            throw e;
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
        } catch (e) {
            console.error(e);
            showToast("Erro ao adicionar gasto", "error");
        }
    };

    const deletarGasto = async (id: string) => {
        if (!user) return;
        console.log(`Audit: Excluindo gasto ${id} para usuário ${user.id}...`);
        try {
            const { error } = await supabase
                .from('imoveis_gastos')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            console.log("Audit Success: Gasto removido.");
            showToast("Gasto removido", "success");
            await fetchData();
        } catch (e) {
            console.error("Audit Critical: Erro ao remover gasto:", e);
            showToast("Erro ao remover gasto", "error");
        }
    };

    // EMPRESTIMOS
    const adicionarEmprestimo = async (emprestimo: Omit<Emprestimo, "id" | "created_at" | "user_id">) => {
        if (!user) return;
        console.log("Supabase: Criando empréstimo...", emprestimo);
        try {
            const { data, error } = await supabase.from('emprestimos').insert({
                ...emprestimo,
                user_id: user.id
            }).select();
            if (error) throw error;
            console.log("Supabase: Empréstimo criado:", data);

            showToast("Empréstimo criado", "success");
            await fetchData();
        } catch (e) {
            console.error("Supabase Error (adicionarEmprestimo):", e);
            showToast("Erro ao criar empréstimo", "error");
            throw e;
        }
    };

    const atualizarEmprestimo = async (id: string, updates: Partial<Emprestimo>) => {
        if (!user) return;
        console.log(`Audit: Atualizando empréstimo ${id} para usuário ${user.id}...`, updates);
        try {
            const { data, error } = await supabase
                .from('emprestimos')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select();
            if (error) throw error;
            console.log("Audit Success: Empréstimo atualizado:", data);

            showToast("Empréstimo atualizado", "success");
            await fetchData();
        } catch (e) {
            console.error("Audit Critical: Erro ao atualizar empréstimo:", e);
            showToast("Erro ao atualizar empréstimo", "error");
            throw e;
        }
    };

    const marcarEmprestimoPago = async (id: string) => {
        if (!user) return;
        console.log(`Audit: Marcando empréstimo ${id} como PAGO para usuário ${user.id}...`);
        try {
            const { data, error } = await supabase
                .from('emprestimos')
                .update({
                    status: 'pago',
                    data_pagamento: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', user.id)
                .select();

            if (error) throw error;
            console.log("Audit Success: Empréstimo finalizado:", data);

            showToast("Empréstimo marcado como pago", "success");
            await fetchData();
        } catch (e) {
            console.error("Audit Critical: Erro ao finalizar empréstimo:", e);
            showToast("Erro ao atualizar empréstimo", "error");
            throw e;
        }
    };

    const deletarEmprestimo = async (id: string) => {
        if (!user) return;
        console.log(`Audit: Excluindo empréstimo ${id} para usuário ${user.id}...`);
        try {
            const { error } = await supabase
                .from('emprestimos')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            console.log("Audit Success: Empréstimo excluído.");

            showToast("Empréstimo excluído", "success");
            await fetchData();
        } catch (e) {
            console.error("Audit Critical: Erro ao excluir empréstimo:", e);
            showToast("Erro ao excluir empréstimo", "error");
            throw e;
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
