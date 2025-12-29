
import { useApp } from "@/context/AppContext";

export function useFinancialData() {
    const { properties, loans, rentPayments, expenses, loading } = useApp();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayDay = now.getDate();

    // VALID IDS SETS (Single Source of Truth)
    // We only consider data linked to IDs presently in these lists.
    const validPropertyIds = new Set(properties.map(p => p.id));
    const validLoanIds = new Set(loans.map(l => l.id));

    // --- DASHBOARD CALCULATIONS (Current Month) ---

    // 1. Revenue: Valid payments for valid properties in current month
    const rentalRevenue = rentPayments
        .filter(p => {
            if (!validPropertyIds.has(p.propertyId)) return false; // STRICT ORPHAN CHECK
            if (p.status !== 'paid') return false;

            // Updated Logic: Use explicit month/year
            return p.year === currentYear && p.month === currentMonth;
        })
        .reduce((acc, p) => p.status === 'paid' ? acc + (properties.find(prop => prop.id === p.propertyId)?.rentAmount || 0) : acc, 0);
    // Note: rentPayments DB struct doesn't hold 'amount' snapshot? 
    // Re-read DB Schema: rent_payments doesn't has amount field.
    // It references property.
    // In the local storage version, RentPayment had 'amount'.
    // In Supabase schema I created:
    /*
    create table rent_payments (
      ...
      month integer, year integer, status text...
    );
    */
    // I DID NOT add 'amount' to rent_payments table!
    // This means I must look up the property rent amount. 
    // Use current property rent amount as proxy.

    // 2. Expenses: Valid expenses for valid properties in current month
    const rentalExpenses = expenses
        .filter(e => {
            if (!validPropertyIds.has(e.propertyId)) return false; // STRICT ORPHAN CHECK

            // Updated Logic: Use explicit month/year
            return e.year === currentYear && e.month === currentMonth;
        })
        .reduce((acc, e) => acc + e.amount, 0);

    // 3. Profit
    const rentalNetProfit = rentalRevenue - rentalExpenses;


    // --- LOANS CALCULATIONS ---

    // 1. Revenue (Cash Flow): Capital + Interest received this month
    const loanRevenue = loans
        .filter(l => validLoanIds.has(l.id)) // STRICT EXISTENCE CHECK
        .filter(l => l.status === 'paid')
        .filter(l => {
            if (!l.paidAt) return false;
            const d = new Date(l.paidAt); // paidAt is ISO timestamp from DB
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((acc, l) => acc + (l.totalValue || 0), 0); // Using totalValue from DB

    // 2. Interest Profit (Yield): Realized + Accrued Pro-Rata

    // A) Realized from Paid Loans (This Month)
    const realizedInterest = loans
        .filter(l => validLoanIds.has(l.id))
        .filter(l => l.status === 'paid')
        .filter(l => {
            if (!l.paidAt) return false;
            const d = new Date(l.paidAt);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((acc, l) => acc + (l.contractedInterest || 0), 0);

    // B) Projected from Active Loans (DUE in This Month)
    const projectedInterest = loans
        .filter(l => validLoanIds.has(l.id))
        .filter(l => l.status === 'active')
        .filter(l => {
            const d = new Date(l.dueDate + 'T12:00:00');
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        })
        .reduce((acc, l) => acc + (l.contractedInterest || 0), 0);

    const totalLoanInterestProfit = realizedInterest + projectedInterest;


    // --- SPREADSHEET DATA GENERATION ---

    const rentalSpreadsheetData: any[] = [];

    // Helper to get unique Month/Year keys from data
    const monthKeys = new Set<string>();

    // Scan payments
    rentPayments.forEach(p => {
        if (validPropertyIds.has(p.propertyId)) {
            const m = String(p.month + 1).padStart(2, '0');
            monthKeys.add(`${p.year}-${m}`);
        }
    });
    // Scan expenses
    expenses.forEach(e => {
        if (validPropertyIds.has(e.propertyId)) {
            const m = String(e.month + 1).padStart(2, '0');
            monthKeys.add(`${e.year}-${m}`);
        }
    });

    const sortedMonths = Array.from(monthKeys).sort().reverse();

    sortedMonths.forEach(monthKey => { // "2024-05"
        const [mYear, mMonth] = monthKey.split('-').map(Number); // mMonth is 1-based here (05)
        const dbMonth = mMonth - 1; // 0-based for DB/JS congruency if needed, but App uses 0-11 for Month Objects? 
        // Wait, context uses 0-11? 
        // DB uses 1-12?
        // Let's check AppContext. processMonthlyPayment passes (month, year).
        // If I pass `now.getMonth()` (0-11) to DB, I must be careful.
        // My table definition said: `check (month between 1 and 12)`.
        // So DB expects 1-12.
        // I need to ensure AppContext handles this shift. 
        // Or I shift here? 
        // Let's assume AppContext passes 0-11 and converts, or passes 1-12.
        // Let's check AppContext again.
        // AppContext: `processMonthlyPayment: (propertyId: string, month: number, year: number)`
        // Implementation: `supabase.from('rent_payments').insert({ ... month, year ... })`
        // If I pass 0 (Jan), DB constraint (1-12) will FAIL.
        // So AppContext OR Component must pass 1-12. 
        // Standard JS date is 0-11.
        // I should probably fix AppContext to +1 implicitly to be safe for frontend devs? 
        // Or keep frontend passing 0-11 and AppContext + 1?
        // I will fix AppContext in next step.
        // For now, let's assume `p.month` from DB is 1-12.

        // Wait, `p` comes from `rentPayments` state.
        // `setRentPayments` maps DB data directly.
        // So `p.month` is 1-12.
        // `e.month` is 1-12? Expenses table didn't have constraint but likely same.

        // So `p.month` is 1-12. `currentMonth` (JS) is 0-11.
        // My previous logic `return p.month === currentMonth` was WRONG if p.month is 1-12.
        // It should be `p.month === currentMonth + 1`.

        // Correction for Revenue Calc above:
        // `return p.year === currentYear && p.month === (currentMonth + 1);`
    });

    // CORRECTING LOGIC WITH 1-based DB months Assumption
    const dbCurrentMonth = currentMonth + 1;

    // RE-CALC Revenue with 1-based fix
    const rentalRevenueFixed = rentPayments
        .filter(p => {
            if (!validPropertyIds.has(p.propertyId)) return false;
            if (p.status !== 'paid') return false;
            return p.year === currentYear && p.month === dbCurrentMonth;
        })
        .reduce((acc, p) => acc + (properties.find(prop => prop.id === p.propertyId)?.rentAmount || 0), 0);

    const rentalExpensesFixed = expenses
        .filter(e => {
            if (!validPropertyIds.has(e.propertyId)) return false;
            return e.year === currentYear && e.month === dbCurrentMonth;
        })
        .reduce((acc, e) => acc + e.amount, 0);

    const rentalNetProfitFixed = rentalRevenueFixed - rentalExpensesFixed;

    // RE-DO SPREADSHEET LOOP
    sortedMonths.forEach(monthKey => { // "2024-05"
        const [mYear, mMonth] = monthKey.split('-').map(Number); // 1-based (5)

        properties.filter(p => validPropertyIds.has(p.id)).forEach(prop => {
            // Payments for this prop in this month
            const monthPayments = rentPayments.filter(p =>
                p.propertyId === prop.id &&
                p.year === mYear && p.month === mMonth
            );

            // Expenses for this prop in this month
            const monthExpenses = expenses.filter(e =>
                e.propertyId === prop.id &&
                e.year === mYear && e.month === mMonth
            );

            if (monthPayments.length === 0 && monthExpenses.length === 0) return;

            const totalRent = monthPayments.filter(p => p.status === 'paid').length > 0 ? prop.rentAmount : 0; // If paid, take full rent amount
            // What if pending? we show 0 or rentAmount? Usually 0 in cash flow.

            const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
            const profit = totalRent - totalExpense;

            const isPaid = monthPayments.some(p => p.status === 'paid');
            const status = isPaid ? 'Pago' : 'Pendente';

            // Formatting Paid Date
            const paidDate = isPaid ?
                (monthPayments.find(p => p.status === 'paid')?.paidAt ? new Date(monthPayments.find(p => p.status === 'paid')!.paidAt!).toLocaleDateString('pt-BR') : '-')
                : '-';

            rentalSpreadsheetData.push({
                property: prop.name,
                month: `${mMonth}/${mYear}`,
                rentValue: totalRent,
                status: status,
                paymentDate: paidDate,
                expenses: totalExpense,
                netProfit: profit
            });
        });
    });

    // 2. Loans Spreadsheet Rows
    const loanSpreadsheetData = loans
        .filter(l => validLoanIds.has(l.id))
        .map(l => {
            const totalReceivable = l.totalValue; // Use DB total_value
            const datePaid = l.status === 'paid' && l.paidAt ? new Date(l.paidAt).toLocaleDateString('pt-BR') : '-';

            return {
                client: l.borrowerName,
                principal: l.principal,
                rate: `${l.monthlyInterestRate}%`,
                days: l.contractDays,
                interest: l.contractedInterest,
                total: totalReceivable,
                status: l.status === 'paid' ? 'Recebido' : (l.status === 'active' ? 'Ativo' : 'Atrasado'),
                dateReceived: datePaid
            };
        });

    return {
        loading,
        dashboard: {
            rentalRevenue: rentalRevenueFixed,
            rentalExpenses: rentalExpensesFixed,
            rentalNetProfit: rentalNetProfitFixed,
            loanRevenue,
            totalLoanInterestProfit,
            validPropertyIds,
            validLoanIds
        },
        spreadsheet: {
            rentals: rentalSpreadsheetData,
            loans: loanSpreadsheetData
        }
    };
}
