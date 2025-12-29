import { useApp } from "@/context/AppContext";

export function useFinancialData() {
    const { imoveis, imoveisPagamentos, imoveisGastos, emprestimos, loading } = useApp();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    // Fixed Month Ref for DB comparison (YYYY-MM-01)
    const currentMesRef = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

    // VALID IDS (Single Source of Truth)
    const validImovelIds = new Set(imoveis.map(i => i.id));
    const validEmprestimoIds = new Set(emprestimos.map(e => e.id));

    // --- DASHBOARD CALCULATIONS (CURRENT MONTH) ---

    // 1. Rental Revenue (Current Month Strict)
    // Sum 'valor_pago' from imoveis_pagamentos where mes_ref matches current month
    const rentalRevenue = imoveisPagamentos
        .filter(p => {
            if (!validImovelIds.has(p.imovel_id)) return false;
            if (p.status !== 'pago') return false;
            return p.mes_ref === currentMesRef;
        })
        .reduce((acc, p) => acc + (p.valor_pago || 0), 0);

    // 2. Rental Expenses (Current Month Strict)
    // Sum 'valor' from imoveis_gastos where mes_ref matches current month
    const rentalExpenses = imoveisGastos
        .filter(e => {
            if (!validImovelIds.has(e.imovel_id)) return false;
            return e.mes_ref === currentMesRef;
        })
        .reduce((acc, e) => acc + e.valor, 0);

    const rentalNetProfit = rentalRevenue - rentalExpenses;

    // 3. Loans Interest (Contracted - Active Portfolio Value)
    // Sum 'juros_total_contratado' for ALL ACTIVE loans.
    // Represents the user's "Asset Value" in terms of future interest.
    const totalLoanInterestContracted = emprestimos
        .filter(e => validEmprestimoIds.has(e.id))
        .filter(e => e.status === 'ativo')
        .reduce((acc, e) => acc + e.juros_total_contratado, 0);

    // 4. Loan Revenue (Total Received in Current Month)
    // Optional: How much cash flow from loans this month?
    // Based on 'data_pagamento'.
    const loanRevenue = emprestimos
        .filter(e => validEmprestimoIds.has(e.id))
        .filter(e => e.status === 'pago')
        .filter(e => {
            if (!e.data_pagamento) return false;
            const d = new Date(e.data_pagamento);
            // Match Year and Month
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((acc, e) => acc + (e.valor_emprestado + e.juros_total_contratado), 0);

    // --- SPREADSHEET DATA GENERATION (History) ---

    const rentalSpreadsheetData: any[] = [];

    // 1. Collect all unique months from History (Payments + Expenses)
    const monthKeys = new Set<string>();

    // Add check: ensure valid strings
    imoveisPagamentos.forEach(p => {
        if (p.mes_ref && p.mes_ref.length >= 7) monthKeys.add(p.mes_ref.slice(0, 7)); // YYYY-MM
    });
    imoveisGastos.forEach(g => {
        if (g.mes_ref && g.mes_ref.length >= 7) monthKeys.add(g.mes_ref.slice(0, 7));
    });

    // Sort months desc
    // If no data, ensure we at least show current month
    if (monthKeys.size === 0) monthKeys.add(currentMesRef.slice(0, 7));

    const sortedMonths = Array.from(monthKeys).sort().reverse();

    sortedMonths.forEach(ym => { // "2024-12"
        const mesRefStrict = `${ym}-01`;

        // For this month, list all properties (matrix view)
        imoveis.forEach(imovel => {
            // Find payment
            const payment = imoveisPagamentos.find(p =>
                p.imovel_id === imovel.id &&
                p.mes_ref === mesRefStrict
            );

            // Find expenses
            const monthExpenses = imoveisGastos.filter(e =>
                e.imovel_id === imovel.id &&
                e.mes_ref === mesRefStrict
            );

            const totalExpense = monthExpenses.reduce((sum, e) => sum + e.valor, 0);
            const isPaid = payment?.status === 'pago';
            const valPago = isPaid ? (payment.valor_pago || 0) : 0;

            rentalSpreadsheetData.push({
                property: imovel.nome,
                month: ym, // YYYY-MM
                rentValue: imovel.valor_aluguel,
                status: isPaid ? 'Pago' : 'Pendente',
                paymentDate: payment?.data_pagamento ? new Date(payment.data_pagamento).toLocaleDateString('pt-BR') : '-',
                revenue: valPago,
                expenses: totalExpense,
                netProfit: valPago - totalExpense
            });
        });
    });

    // Loans Sheet
    const loanSpreadsheetData = emprestimos.map(e => ({
        client: e.cliente_nome,
        principal: e.valor_emprestado,
        rate: `${e.juros_mensal}%`,
        days: e.dias_contratados,
        interest: e.juros_total_contratado,
        total: e.valor_emprestado + e.juros_total_contratado,
        status: e.status === 'pago' ? 'Recebido' : 'Ativo',
        startDate: new Date(e.data_inicio).toLocaleDateString('pt-BR'),
        dueDate: new Date(e.data_fim).toLocaleDateString('pt-BR'),
        paidDate: e.data_pagamento ? new Date(e.data_pagamento).toLocaleDateString('pt-BR') : '-'
    }));

    return {
        loading,
        dashboard: {
            rentalRevenue,
            rentalExpenses,
            rentalNetProfit,
            loanRevenue,
            totalLoanInterestContracted,
            validImovelIds,
            validEmprestimoIds
        },
        spreadsheet: {
            rentals: rentalSpreadsheetData,
            loans: loanSpreadsheetData
        }
    };
}
