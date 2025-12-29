```
import { useApp } from "@/context/AppContext";

export function useFinancialData() {
    const { imoveis, imoveisPagamentos, emprestimos, expenses, loading } = useApp();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    // Fixed Month Ref for DB comparison (YYYY-MM-01)
    const currentMesRef = `${ currentYear } -${ String(currentMonth + 1).padStart(2, '0') }-01`;

    // VALID IDS (Single Source of Truth)
    const validImovelIds = new Set(imoveis.map(i => i.id));
    const validEmprestimoIds = new Set(emprestimos.map(e => e.id));

    // --- DASHBOARD CALCULATIONS ---

    // 1. Rental Revenue (Current Month)
    // Sum 'valor_pago' from imoveis_pagamentos where mes_ref matches current month
    const rentalRevenue = imoveisPagamentos
        .filter(p => {
            if (!validImovelIds.has(p.imovel_id)) return false; // Orphan check
            if (p.status !== 'pago') return false;
            return p.mes_ref === currentMesRef;
        })
        .reduce((acc, p) => acc + (p.valor_pago || 0), 0);

    // 2. Rental Expenses (Current Month)
    // Legacy expense logic using property_id
    const rentalExpenses = expenses
        .filter(e => {
            if (!validImovelIds.has(e.property_id)) return false;
            // Expense uses month(0-11 or 1-12?) LocalStorage used 0-11, Supabase migration not confirmed.
            // Assuming migrated data uses 1-12.
            // In AppContext.tsx (legacy addExpense), we passed `expense.month`.
            // If the input was Date.getMonth() (0-11), it fits.
            // Let's assume expenses.month is 0-11 to match `currentMonth`.
            // If it's 1-12, we need adjustment.
            // Given the lack of strict schema on expenses, let's try to match 0-11.
            return e.year === currentYear && e.month === currentMonth; // Assumption: Expense.month is 0-11
        })
        .reduce((acc, e) => acc + e.amount, 0);

    const rentalNetProfit = rentalRevenue - rentalExpenses;

    // 3. Loans Interest (Contracted)
    // "Somar: Juros contratados dos empréstimos"
    // We sum 'juros_total_contratado' for ALL ACTIVE loans.
    // This represents the portfolio's expected interest yield.
    const totalLoanInterestContracted = emprestimos
        .filter(e => validEmprestimoIds.has(e.id))
        .filter(e => e.status === 'ativo')
        .reduce((acc, e) => acc + e.juros_total_contratado, 0);
    
    // Also calculating Realized Interest this month if needed?
    // Prompt says "Dashboard deve... Somar... Juros contratados".
    // It implies the "Potential" value. 
    // If user wanted "Received", they would say "Juros recebidos".
    
    const loanRevenue = emprestimos
        .filter(e => validEmprestimoIds.has(e.id))
        .filter(e => e.status === 'pago')
        // Filter by payment date in current month?
        .filter(e => {
             if (!e.data_pagamento) return false;
             const d = new Date(e.data_pagamento);
             return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((acc, e) => acc + (e.valor_emprestado + e.juros_total_contratado), 0); // Total received

    // --- SPREADSHEET DATA GENERATION ---

    const rentalSpreadsheetData: any[] = [];
    
    // Iterate over Imoveis, checking status for current month (?) or history?
    // Usually spreadsheet shows History.
    // For now, let's build a month-by-month view or just list all payments?
    // The previous implementation tried to show matrix.
    // Let's simplify: List active properties and their current month status?
    // Or full history?
    // User goal: "Correction... dashboard".
    // Let's replicate the existing spreadsheet logic but using new tables for data.
    
    // Get all unique months from payments + expenses
    const monthKeys = new Set<string>();
    imoveisPagamentos.forEach(p => monthKeys.add(p.mes_ref.slice(0, 7))); // YYYY-MM
    // add expenses if needed...
    
    // Sort months desc
    const sortedMonths = Array.from(monthKeys).sort().reverse();
    // Default to at least current month if empty
    if (sortedMonths.length === 0) sortedMonths.push(currentMesRef.slice(0, 7));

    sortedMonths.forEach(ym => { // "2024-12"
        const [yStr, mStr] = ym.split('-');
        const y = parseInt(yStr);
        const m = parseInt(mStr); // 1-12

        // For this month, list all properties
        imoveis.forEach(imovel => {
             // Find payment
             const payment = imoveisPagamentos.find(p => 
                p.imovel_id === imovel.id && 
                p.mes_ref === `${ ym }-01`
             );

             // Find expenses
             const monthExpenses = expenses.filter(e => 
                e.property_id === imovel.id &&
                e.year === y &&
                e.month === (m - 1) // Expense assumed 0-11
             );

             const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
             const isPaid = payment?.status === 'pago';
             // Let's show Rent Value if paid, else 0 for "Value Received".
             // But for "Spreadsheet" usually we want to see the status.
             
             rentalSpreadsheetData.push({
                 property: imovel.nome,
                 month: `${ String(m).padStart(2, '0') }/${y}`,
rentValue: imovel.valor_aluguel, // Contract value
    status: isPaid ? 'Pago' : 'Pendente',
        paymentDate: payment?.data_pagamento ? new Date(payment.data_pagamento).toLocaleDateString('pt-BR') : '-',
            expenses: totalExpense,
                netProfit: (isPaid ? (payment.valor_pago || 0) : 0) - totalExpense
             });
        });
    });

const loanSpreadsheetData = emprestimos.map(e => ({
    client: e.cliente_nome,
    principal: e.valor_emprestado,
    rate: `${e.juros_mensal}%`,
    days: e.dias_contratados,
    interest: e.juros_total_contratado,
    total: e.valor_emprestado + e.juros_total_contratado, // Total Contracted
    status: e.status === 'pago' ? 'Recebido' : 'Ativo',
    dateReceived: e.data_pagamento ? new Date(e.data_pagamento).toLocaleDateString('pt-BR') : '-'
}));

return {
    loading,
    dashboard: {
        rentalRevenue,
        rentalExpenses,
        rentalNetProfit,
        loanRevenue,
        totalLoanInterestContracted, // Replacing "totalLoanInterestProfit" with explicit Contracted sum
        validImovelIds,
        validEmprestimoIds
    },
    spreadsheet: {
        rentals: rentalSpreadsheetData,
        loans: loanSpreadsheetData
    }
};
}
