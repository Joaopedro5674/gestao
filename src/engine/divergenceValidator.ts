import { RoundingEngine } from "./roundingEngine";

/**
 * Divergence Validator for comparing user bank app balance with engine balance in cents.
 */
export class DivergenceValidator {
    /**
     * Audits balance divergence between app balance and calculated engine balance.
     */
    public static auditDivergence(userReportedBalance: number, calculatedBalance: number): {
        userReported: number;
        calculated: number;
        divergenceCents: number;
        status: 'MATCH' | 'DIVERGENT' | 'ADJUSTED';
        message: string;
    } {
        const userReported = RoundingEngine.round(userReportedBalance, 2);
        const calculated = RoundingEngine.round(calculatedBalance, 2);
        const divergenceCents = RoundingEngine.round(userReported - calculated, 2);

        if (Math.abs(divergenceCents) < 0.01) {
            return {
                userReported,
                calculated,
                divergenceCents: 0,
                status: 'MATCH',
                message: 'Saldos perfeitamente conciliados (0 centavos de diferença).'
            };
        } else {
            const absDiffStr = Math.abs(divergenceCents).toFixed(2);
            return {
                userReported,
                calculated,
                divergenceCents,
                status: 'DIVERGENT',
                message: `Divergência de R$ ${absDiffStr} (${divergenceCents > 0 ? 'Sobras no Banco' : 'Sobras no Motor'}).`
            };
        }
    }
}
