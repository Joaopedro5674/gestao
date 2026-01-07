import { useApp } from "@/context/AppContext";
import { ExportDataRow } from "@/utils/exportUtils";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

export interface RentalSpreadsheetRow extends ExportDataRow {
    property: string;
    address: string;
    phone: string;
    month: string;
    rentValue: number;
    status: string;
    paymentDate: string;
    revenue: number;
    expenses: number;
    netProfit: number;
}

export interface LoanSpreadsheetRow extends ExportDataRow {
    client: string;
    phone: string;
    principal: number;
    rate: string;
    days: number;
    interest: number;
    total: number;
    status: string;
    startDate: string;
    dueDate: string;
    paidDate: string;
}

interface DashboardViewData {
    alugueis_pagos_mes: number;
    juros_recebidos_mes: number;
    gastos_mes: number;
    lucro_liquido_mes: number;
}

export function useFinancialData() {
    // Keep context for Spreadsheet Logic (History) and Lists
    const {
        imoveis, imoveisPagamentos, imoveisGastos,
        emprestimos, loading: contextLoading,
        lastSync
    } = useApp();

    const [dashboardView, setDashboardView] = useState<DashboardViewData>({
        alugueis_pagos_mes: 0,
        juros_recebidos_mes: 0,
        gastos_mes: 0,
        lucro_liquido_mes: 0
    });
    const [viewLoading, setViewLoading] = useState(true);

    // FETCH DASHBOARD VIEW
    useEffect(() => {
        const fetchDashboardView = async () => {
            setViewLoading(true);
            try {
                const { data, error } = await supabase
                    .from('dashboard_lucro_mensal')
                    .select('*')
                    .maybeSingle();

                if (error) {
                    console.error("Error fetching dashboard view:", error);
                } else if (data) {
                    setDashboardView({
                        alugueis_pagos_mes: data.alugueis_pagos_mes || 0,
                        juros_recebidos_mes: data.juros_recebidos_mes || 0,
                        gastos_mes: data.gastos_mes || 0,
                        lucro_liquido_mes: data.lucro_liquido_mes || 0
                    });
                }
            } catch (err) {
                console.error("Dashboard fetch exception:", err);
            } finally {
                setViewLoading(false);
            }
        };

        fetchDashboardView();
    }, [lastSync]);

    // --- SPREADSHEET DATA GENERATION ---
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMesRef = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

    const rentalSpreadsheetData: RentalSpreadsheetRow[] = [];
    const monthKeys = new Set<string>();

    imoveisPagamentos.forEach(p => {
        if (p.mes_referencia && p.mes_referencia.length >= 7) monthKeys.add(p.mes_referencia.slice(0, 7)); // YYYY-MM
    });
    imoveisGastos.forEach(g => {
        if (g.mes_ref && g.mes_ref.length >= 7) monthKeys.add(g.mes_ref.slice(0, 7));
    });
    if (monthKeys.size === 0) monthKeys.add(currentMesRef.slice(0, 7));

    const sortedMonths = Array.from(monthKeys).sort().reverse();

    sortedMonths.forEach(ym => {
        const mesRefStrict = `${ym}-01`;
        imoveis.forEach(imovel => {
            const payment = imoveisPagamentos.find(p =>
                p.imovel_id === imovel.id &&
                (p.mes_referencia === mesRefStrict || p.mes_referencia?.slice(0, 7) === ym)
            );
            const monthExpenses = imoveisGastos.filter(e =>
                e.imovel_id === imovel.id &&
                e.mes_ref === mesRefStrict
            );

            const totalExpense = monthExpenses.reduce((sum, e) => sum + e.valor, 0);
            const isPaid = payment?.status === 'pago';
            const valPago = isPaid ? (payment.valor || 0) : 0;

            rentalSpreadsheetData.push({
                property: imovel.nome,
                address: imovel.endereco || "Não informado",
                phone: imovel.telefone || "Não informado",
                month: ym,
                rentValue: imovel.valor_aluguel,
                status: isPaid ? 'Pago' : 'Pendente',
                paymentDate: payment?.pago_em ? new Date(payment.pago_em).toLocaleDateString('pt-BR') : '-',
                revenue: valPago,
                expenses: totalExpense,
                netProfit: valPago - totalExpense
            });
        });
    });

    const loanSpreadsheetData: LoanSpreadsheetRow[] = (emprestimos || []).map(e => ({
        client: e.cliente_nome,
        phone: e.telefone || "Não informado",
        principal: e.valor_emprestado,
        rate: `${e.juros_mensal}%`,
        days: e.dias_contratados,
        interest: e.juros_total_contratado,
        total: e.valor_emprestado + e.juros_total_contratado,
        status: e.status === 'pago' ? 'Recebido' : 'Ativo',
        startDate: e.data_inicio ? new Date(e.data_inicio).toLocaleDateString('pt-BR') : '-',
        dueDate: e.data_fim ? new Date(e.data_fim).toLocaleDateString('pt-BR') : '-',
        paidDate: e.data_pagamento ? new Date(e.data_pagamento).toLocaleDateString('pt-BR') : '-'
    }));

    return {
        loading: contextLoading || viewLoading,
        dashboard: {
            rentalRevenue: dashboardView.alugueis_pagos_mes,
            rentalExpenses: dashboardView.gastos_mes,
            rentalNetProfit: dashboardView.alugueis_pagos_mes - dashboardView.gastos_mes,

            totalLoanInterestReceived: dashboardView.juros_recebidos_mes,

            // Simplified return without Audit/RPC overrides
            validImovelIds: new Set((imoveis || []).map(i => i?.id)),
            validEmprestimoIds: new Set((emprestimos || []).map(e => e?.id))
        },
        spreadsheet: {
            rentals: rentalSpreadsheetData,
            loans: loanSpreadsheetData
        }
    };
}
