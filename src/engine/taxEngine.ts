import { TaxRulesConfig } from "./types";

/**
 * Tax Engine for computing IOF and IR regressive taxes with parametric rules.
 */
export class TaxEngine {
    // Official IOF Regressive Table (Decreto 6.306/2007)
    public static readonly DEFAULT_IOF_TABLE: Record<number, number> = {
        1: 0.96, 2: 0.93, 3: 0.90, 4: 0.86, 5: 0.83, 6: 0.80, 7: 0.76, 8: 0.73, 9: 0.70,
        10: 0.66, 11: 0.63, 12: 0.60, 13: 0.56, 14: 0.53, 15: 0.50, 16: 0.46, 17: 0.43,
        18: 0.40, 19: 0.36, 20: 0.33, 21: 0.30, 22: 0.26, 23: 0.23, 24: 0.20, 25: 0.16,
        26: 0.13, 27: 0.10, 28: 0.06, 29: 0.03, 30: 0.00
    };

    /**
     * Calculates applicable IOF percentage (0.00 to 0.96) for a given calendar age in days.
     */
    public static getIofRate(calendarDays: number, taxConfig?: TaxRulesConfig): number {
        if (taxConfig?.is_exempt) return 0;
        if (calendarDays >= 30) return 0;
        if (calendarDays <= 0) return 0.96;

        const table = taxConfig?.iof_table_json || TaxEngine.DEFAULT_IOF_TABLE;
        return table[calendarDays] !== undefined ? table[calendarDays] : 0;
    }

    /**
     * Calculates applicable IR (Imposto de Renda) percentage for a given calendar age in days.
     * Table (Lei 11.033/2004):
     * <= 180 days: 22.5% (0.225)
     * 181 to 360 days: 20.0% (0.20)
     * 361 to 720 days: 17.5% (0.175)
     * > 720 days: 15.0% (0.15)
     */
    public static getIrRate(calendarDays: number, taxConfig?: TaxRulesConfig): number {
        if (taxConfig?.is_exempt) return 0;
        if (calendarDays <= 180) return 0.225;
        if (calendarDays <= 360) return 0.200;
        if (calendarDays <= 720) return 0.175;
        return 0.150;
    }

    /**
     * Computes exact IOF and IR amounts over gross yield.
     */
    public static computeTaxes(
        grossYield: number,
        calendarDays: number,
        taxConfig?: TaxRulesConfig
    ): { iofAmount: number; iofRate: number; irAmount: number; irRate: number; netYield: number } {
        if (grossYield <= 0) {
            return { iofAmount: 0, iofRate: 0, irAmount: 0, irRate: 0, netYield: 0 };
        }

        const iofRate = TaxEngine.getIofRate(calendarDays, taxConfig);
        const iofAmount = grossYield * iofRate;

        // IR applies on (Gross Yield - IOF)
        const baseForIr = Math.max(0, grossYield - iofAmount);
        const irRate = TaxEngine.getIrRate(calendarDays, taxConfig);
        const irAmount = baseForIr * irRate;

        const netYield = Math.max(0, grossYield - iofAmount - irAmount);

        return { iofAmount, iofRate, irAmount, irRate, netYield };
    }
}
