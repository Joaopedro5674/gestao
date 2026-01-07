"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Imovel, ImovelPagamento, Emprestimo, ImovelGasto, EmprestimoMes } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { useToast } from "@/components/ToastProvider";

interface AppContextType {
    imoveis: Imovel[];
    imoveisPagamentos: ImovelPagamento[];
    imoveisGastos: ImovelGasto[];
    emprestimos: Emprestimo[];
    emprestimosMeses: EmprestimoMes[];
    loading: boolean;

    // Imovel Actions
    adicionarImovel: (imovel: Omit<Imovel, "id" | "created_at" | "user_id">) => Promise<void>;
    atualizarImovel: (id: string, updates: Partial<Imovel>) => Promise<void>;
    deletarImovel: (id: string) => Promise<void>;

    // Pagamento Actions
    receberPagamento: (imovelId: string, dataPagamento: Date) => Promise<void>;

    // Gasto Actions
    adicionarGasto: (gasto: Omit<ImovelGasto, "id" | "created_at" | "user_id">) => Promise<void>;
    deletarGasto: (id: string) => Promise<void>;

    // Emprestimo Actions
    adicionarEmprestimo: (emprestimo: Omit<Emprestimo, "id" | "created_at" | "user_id">) => Promise<void>;
    atualizarEmprestimo: (id: string, updates: Partial<Emprestimo>) => Promise<void>;
    marcarEmprestimoPago: (id: string) => Promise<void>;
    deletarEmprestimo: (id: string) => Promise<void>;
    pagarParcelaJuros: (id: string) => Promise<void>;

    refreshData: () => Promise<void>;
    syncStatus: 'idle' | 'syncing' | 'error';
    lastSync: Date | null;
}

const AppContext = createContext<AppContextType>({
    imoveis: [],
    imoveisPagamentos: [],
    imoveisGastos: [],
    emprestimos: [],
    emprestimosMeses: [],
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
    pagarParcelaJuros: async () => { },

    refreshData: async () => { },
    syncStatus: 'idle',
    lastSync: null
});

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [imoveis, setImoveis] = useState<Imovel[]>([]);
    const [imoveisPagamentos, setImoveisPagamentos] = useState<ImovelPagamento[]>([]);
    const [imoveisGastos, setImoveisGastos] = useState<ImovelGasto[]>([]);
    const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
    const [emprestimosMeses, setEmprestimosMeses] = useState<EmprestimoMes[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // --- FETCH DATA (SUPABASE) ---
    const fetchData = useCallback(async () => {
        if (!user) {
            setImoveis([]);
            setImoveisPagamentos([]);
            setImoveisGastos([]);
            setEmprestimos([]);
            setEmprestimosMeses([]);
            setLoading(false);
            return;
        }

        if (!supabase) {
            console.error("Supabase client not initialized.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setSyncStatus('syncing');
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
                console.warn("Audit: Erro ao buscar gastos:", gastosError.message);
            }

            // 5. Emprestimo Meses
            const { data: mesesData, error: mesesError } = await supabase
                .from('emprestimo_meses')
                .select('*')
                .eq('user_id', user.id);
            if (mesesError) throw mesesError;

            setImoveis(imoveisData || []);
            setEmprestimos(emprestimosData || []);
            setImoveisPagamentos(pagamentosData || []);
            setImoveisGastos(gastosData || []);
            setEmprestimosMeses(mesesData || []);
            console.log("Audit: Sincronização concluída com sucesso.");

            // --- AUTO-GENERATE CURRENT MONTH (Self-Healing) ---
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const currentMesRef = `${year}-${month}`;

            const missingPayments = (imoveisData || []).filter(imovel => {
                if (!imovel.ativo) return false;
                const hasPayment = (pagamentosData || []).some(p =>
                    p.imovel_id === imovel.id && p.mes_referencia === currentMesRef
                );
                return !hasPayment;
            }).map(imovel => ({
                imovel_id: imovel.id,
                mes_referencia: currentMesRef,
                status: 'pendente', // Default clean slate
                user_id: user.id,
                valor: 0 // Will generally be null or 0 until paid/updated? Or usage?
                // Legacy schema might expect 0 or null. 
                // But usually we don't store "valor_aluguel" here until paid?
                // Let's check schema. "pago" is bool. "valor" is numeric.
                // Usually "valor" in payments table is "valor PAGO".
                // So 0 is fine for pending.
            }));

            if (missingPayments.length > 0) {
                console.log(`Audit: Gerando ${missingPayments.length} mensalidades pendentes para ${currentMesRef}...`);
                const { data: newPayments, error: createError } = await supabase
                    .from('imoveis_pagamentos')
                    .insert(missingPayments)
                    .select();

                if (createError) {
                    console.error("Audit: Erro ao gerar mensalidades:", createError);
                } else if (newPayments) {
                    // Append locally to avoid full re-fetch loop
                    setImoveisPagamentos(prev => [...prev, ...newPayments as any]);
                }
            }
            // --------------------------------------------------

            setLastSync(new Date());
            setSyncStatus('idle');
        } catch (error) {
            console.error("Audit Critical: Erro de sincronização:", error);
            showToast("Erro ao sincronizar dados", "error");
            setSyncStatus('error');
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveis' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveis_pagamentos' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'imoveis_gastos' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'emprestimos' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'emprestimo_meses' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    // --- ACTIONS ---

    const adicionarImovel = async (imovel: Omit<Imovel, "id" | "created_at" | "user_id">) => {
        if (!user) return;
        setSyncStatus('syncing');
        try {
            const { data, error } = await supabase.from('imoveis').insert({
                ...imovel,
                user_id: user.id
            }).select().single();

            if (error) throw error;
            console.log("Imóvel criado:", data.id);
            showToast("Imóvel adicionado", "success");
            await fetchData();
        } catch (e) {
            console.error("Erro ao adicionar imóvel:", e);
            showToast("Erro ao adicionar imóvel", "error");
            setSyncStatus('error');
            throw e;
        }
    };

    const atualizarImovel = async (id: string, updates: Partial<Imovel>) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('imoveis').update(updates).eq('id', id).eq('user_id', user.id);
            if (error) throw error;
            showToast("Imóvel atualizado", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao atualizar imóvel", "error");
            throw e;
        }
    };

    const deletarImovel = async (id: string) => {
        if (!user) return;
        try {
            // Delete dependencies manually (Legacy)
            await supabase.from('imoveis_gastos').delete().eq('imovel_id', id).eq('user_id', user.id);
            await supabase.from('imoveis_pagamentos').delete().eq('imovel_id', id).eq('user_id', user.id);
            const { error } = await supabase.from('imoveis').delete().eq('id', id).eq('user_id', user.id);
            if (error) throw error;

            showToast("Imóvel excluído", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao excluir imóvel", "error");
        }
    };

    const receberPagamento = async (imovelId: string, dataPagamento: Date) => {
        if (!user) return;

        const year = dataPagamento.getFullYear();
        const month = String(dataPagamento.getMonth() + 1).padStart(2, '0');
        const mesRef = `${year}-${month}`;
        const imovel = imoveis.find(i => i.id === imovelId);
        if (!imovel) return;

        setSyncStatus('syncing');
        try {
            // Upsert Logic (Legacy)
            const { data, error } = await supabase
                .from('imoveis_pagamentos')
                .update({
                    status: 'pago',
                    pago_em: new Date().toISOString(),
                    valor: imovel.valor_aluguel
                })
                .eq('imovel_id', imovelId)
                .eq('mes_referencia', mesRef)
                .eq('user_id', user.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                const { error: insertError } = await supabase.from('imoveis_pagamentos').insert({
                    imovel_id: imovelId,
                    mes_referencia: mesRef,
                    status: 'pago',
                    valor: imovel.valor_aluguel,
                    pago_em: new Date().toISOString(),
                    user_id: user.id
                });
                if (insertError) throw insertError;
            }

            showToast(`Pagamento confirmado`, "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao processar pagamento", "error");
            setSyncStatus('error');
        }
    };

    const adicionarGasto = async (gasto: Omit<ImovelGasto, "id" | "created_at" | "user_id">) => {
        if (!user) return;
        const { id, ...cleanPayload } = gasto as any;
        try {
            const { error } = await supabase.from('imoveis_gastos').insert({
                ...cleanPayload,
                user_id: user.id
            });
            if (error) throw error;
            showToast("Gasto registrado", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao adicionar gasto", "error");
        }
    };

    const deletarGasto = async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('imoveis_gastos').delete().eq('id', id).eq('user_id', user.id);
            if (error) throw error;
            showToast("Gasto removido", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao remover gasto", "error");
        }
    };

    const adicionarEmprestimo = async (emprestimo: Omit<Emprestimo, "id" | "created_at" | "user_id">) => {
        if (!user) return;
        setSyncStatus('syncing');
        try {
            const { data, error } = await supabase.from('emprestimos').insert({
                cliente_nome: emprestimo.cliente_nome,
                telefone: emprestimo.telefone,
                valor_emprestado: emprestimo.valor_emprestado,
                juros_mensal: emprestimo.juros_mensal,
                dias_contratados: emprestimo.dias_contratados,
                juros_total_contratado: emprestimo.juros_total_contratado,
                data_inicio: emprestimo.data_inicio,
                data_fim: emprestimo.data_fim,
                user_id: user.id
            }).select().single();

            if (error) throw error;
            const newLoanId = data.id;

            // Generate Months (V2 Logic - Keep)
            if (emprestimo.cobranca_mensal) {
                await supabase.from('emprestimos').update({ cobranca_mensal: true }).eq('id', newLoanId);
                const monthsPayload = [];
                const start = new Date(emprestimo.data_inicio + 'T12:00:00');
                const end = new Date(emprestimo.data_fim + 'T12:00:00');
                const monthlyInterestValue = (emprestimo.valor_emprestado * emprestimo.juros_mensal) / 100;

                let current = new Date(start.getFullYear(), start.getMonth(), 1);
                const last = new Date(end.getFullYear(), end.getMonth(), 1);

                while (current <= last) {
                    const year = current.getFullYear();
                    const month = String(current.getMonth() + 1).padStart(2, '0');
                    monthsPayload.push({
                        emprestimo_id: newLoanId,
                        user_id: user.id,
                        mes_referencia: `${year}-${month}`,
                        valor_juros: monthlyInterestValue,
                        pago: false
                    });
                    current.setMonth(current.getMonth() + 1);
                }

                if (monthsPayload.length > 0) {
                    await supabase.from('emprestimo_meses').insert(monthsPayload);
                }
            }

            showToast("Empréstimo criado", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao criar empréstimo", "error");
            setSyncStatus('error');
        }
    };

    const atualizarEmprestimo = async (id: string, updates: Partial<Emprestimo>) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('emprestimos').update(updates).eq('id', id).eq('user_id', user.id);
            if (error) throw error;
            showToast("Empréstimo atualizado", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao atualizar empréstimo", "error");
        }
    };

    const marcarEmprestimoPago = async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('emprestimos').update({
                status: 'pago',
                data_pagamento: new Date().toISOString()
            }).eq('id', id).eq('user_id', user.id);

            if (error) throw error;
            showToast("Empréstimo marcado como pago", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao atualizar empréstimo", "error");
        }
    };

    const deletarEmprestimo = async (id: string) => {
        if (!user) return;
        try {
            // Dependencies handled by CASCADE? Or manual? V2 usually assumed Manual/Cascade. 
            // Logic in V5 deleted dependencies. Legacy also likely did.
            await supabase.from('emprestimos').delete().eq('id', id).eq('user_id', user.id);
            showToast("Empréstimo excluído", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao excluir empréstimo", "error");
        }
    };

    const pagarParcelaJuros = async (id: string) => {
        if (!user) return;
        setSyncStatus('syncing');
        try {
            const { error } = await supabase
                .from('emprestimo_meses')
                .update({ pago: true, pago_em: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            showToast("Juros do mês pagos!", "success");
            await fetchData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao registrar pagamento", "error");
            setSyncStatus('error');
        }
    };

    return (
        <AppContext.Provider
            value={{
                imoveis, imoveisPagamentos, imoveisGastos, emprestimos, emprestimosMeses,
                adicionarImovel, atualizarImovel, deletarImovel,
                receberPagamento, adicionarGasto, deletarGasto,
                adicionarEmprestimo, atualizarEmprestimo, marcarEmprestimoPago, deletarEmprestimo, pagarParcelaJuros,
                refreshData: fetchData, loading, syncStatus, lastSync
            }}
        >
            {children}
        </AppContext.Provider>
    );
}
