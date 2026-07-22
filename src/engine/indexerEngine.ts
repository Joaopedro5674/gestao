/**
 * Indexer Engine for computing official daily compounding factors (CDI/Selic).
 * Formula: DailyFactor = (1 + (AnnualRate * Percentage / 100))^(1 / 252)
 */
export class IndexerEngine {
    /**
     * Calculates single daily compounding factor from annual rate (e.g. 10.65%).
     * @param annualRate Annual CDI percentage (e.g. 10.65)
     * @param multiplier Product multiplier percentage (e.g. 100 for 100%, 105 for 105%)
     */
    public static calculateDailyFactor(annualRate: number, multiplier: number = 100): number {
        if (annualRate <= 0) return 1.0;
        const effectiveAnnualRate = (annualRate * (multiplier / 100)) / 100;
        // 252 business days convention
        return Math.pow(1 + effectiveAnnualRate, 1 / 252);
    }

    /**
     * Compounds principal over N business days given an average annual rate.
     */
    public static compoundBalance(principal: number, annualRate: number, multiplier: number, businessDays: number): number {
        if (businessDays <= 0 || principal <= 0) return principal;
        const dailyFactor = IndexerEngine.calculateDailyFactor(annualRate, multiplier);
        return principal * Math.pow(dailyFactor, businessDays);
    }

    /**
     * Fetches real-time CDI / Selic rates from Banco Central do Brasil (BCB SGS API).
     * Series 12: CDI Diário / Series 11: SELIC
     */
    public static async fetchOfficialBcbRate(seriesCode: number = 12): Promise<{ date: string; annualRate: number } | null> {
        try {
            const res = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/1?formato=json`, {
                cache: 'no-store'
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const item = data[0]; // { data: "21/07/2026", valor: "0.039276" }
                const dailyVal = parseFloat(item.valor);
                // Convert daily rate back to annual rate: (1 + dailyVal/100)^252 - 1
                const annualRate = (Math.pow(1 + (dailyVal / 100), 252) - 1) * 100;
                
                const [d, m, y] = item.data.split('/');
                const isoDate = `${y}-${m}-${d}`;

                return { date: isoDate, annualRate };
            }
        } catch (err) {
            console.warn("Audit: Não foi possível obter CDI do Banco Central (usando fallback):", err);
        }
        return null;
    }
}
