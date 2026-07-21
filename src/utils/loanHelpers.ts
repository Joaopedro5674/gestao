/**
 * Calculates the exact NIS-based due date for card loans.
 * 
 * @param startDate The start date string (e.g. YYYY-MM-DD)
 * @param finalNis The final NIS digit (0-9)
 * @param months The number of months for the loan
 * @param nisCalendar Map of final NIS digit to payment day (e.g. { 9: 30 })
 * @returns The formatted due date string (YYYY-MM-DD), or empty string if invalid
 */
export function calcularVencimentoCartao(
    startDate: string,
    finalNis: number,
    months: number,
    nisCalendar: Record<number, number>
): string {
    if (!startDate || isNaN(finalNis) || isNaN(months)) {
        return "";
    }

    const payDay = nisCalendar[finalNis];
    if (payDay === undefined) {
        return "";
    }

    const start = new Date(startDate + 'T12:00:00');
    if (isNaN(start.getTime())) {
        return "";
    }

    const startDay = start.getDate();
    const monthsToAdd = startDay > payDay ? months + 1 : months;

    const targetYear = start.getFullYear();
    const targetMonth = start.getMonth() + monthsToAdd - 1;

    const calculatedDue = new Date(targetYear, targetMonth, payDay, 12, 0, 0);
    if (isNaN(calculatedDue.getTime())) {
        return "";
    }

    return calculatedDue.toISOString().split('T')[0];
}

/**
 * Calculates the total, interest, and equivalent monthly interest rate for card loans.
 * 
 * @param principal The starting borrowed principal amount
 * @param monthlyWithdrawal The amount withdrawn per month
 * @param months The number of months
 */
export function calcularFinanceiroCartao(
    principal: number,
    monthlyWithdrawal: number,
    months: number
): { total: number; interest: number; rate: number } {
    const total = monthlyWithdrawal * months;
    const interest = Math.max(0, total - principal);
    const rate = principal > 0 ? (monthlyWithdrawal * 100) / principal : 0;

    return { total, interest, rate };
}

/**
 * Calculates the due date for a specific monthly installment.
 * 
 * @param startDate The start date string of the loan (e.g. YYYY-MM-DD)
 * @param mesReferencia The reference month of the installment (e.g. YYYY-MM)
 * @param isCartao Whether this is a card loan
 * @param finalNis The final NIS digit (0-9) or undefined/null
 * @param nisCalendar Map of final NIS digit to payment day
 * @returns A Date object representing the due date
 */
export function calcularVencimentoParcela(
    startDate: string,
    mesReferencia: string,
    isCartao: boolean,
    finalNis: number | null | undefined,
    nisCalendar: Record<number, number>
): Date {
    const [refYear, refMonth] = mesReferencia.split('-').map(Number);
    const start = new Date(startDate + 'T12:00:00');
    
    if (isCartao && finalNis !== undefined && finalNis !== null) {
        const payDay = nisCalendar[finalNis] || 25;
        return new Date(refYear, refMonth - 1, payDay, 12, 0, 0);
    } else {
        const startYear = start.getFullYear();
        const startMonth = start.getMonth() + 1;
        const monthDiff = ((refYear - startYear) * 12) + (refMonth - startMonth);
        const multiplier = Math.max(0, monthDiff + 1);
        const dueDate = new Date(start);
        dueDate.setDate(dueDate.getDate() + (30 * multiplier));
        return dueDate;
    }
}
