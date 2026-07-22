/**
 * Indexer Engine for computing official daily compounding factors (CDI/Selic).
 * Formula: DailyFactor = (1 + (AnnualRate * Percentage / 100))^(1 / 252)
 */
export class IndexerEngine {
    /**
     * Calculates single daily compounding factor from annual rate (e.g. 14.15%).
     * @param annualRate Annual CDI percentage (e.g. 14.15)
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
     * Series 12: CDI Diário / Series 11: SELIC Diária / Series 432: Meta Selic
     */
    public static async fetchOfficialBcbRate(seriesCode: number = 12): Promise<{ date: string; annualRate: number } | null> {
        const seriesToTry = [seriesCode, 12, 11, 432];

        for (const series of seriesToTry) {
            try {
                const res = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados/ultimos/1?formato=json`, {
                    cache: 'no-store',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json'
                    }
                });

                if (!res.ok) continue;

                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const item = data[0]; // { data: "20/07/2026", valor: "0.052531" }
                    const rawVal = parseFloat(item.valor);

                    if (isNaN(rawVal) || rawVal <= 0) continue;

                    // If value > 1, it's already an annual percentage (e.g. Series 432 = 14.25)
                    // If value < 1, it's daily percentage (e.g. Series 12 = 0.052531)
                    let annualRate = rawVal > 1 
                        ? rawVal 
                        : (Math.pow(1 + (rawVal / 100), 252) - 1) * 100;

                    annualRate = Math.round(annualRate * 100) / 100; // e.g. 14.15%

                    const [d, m, y] = item.data.split('/');
                    const isoDate = `${y}-${m}-${d}`;

                    return { date: isoDate, annualRate };
                }
            } catch (err) {
                console.warn(`Audit: Tentativa de busca CDI na série ${series} falhou:`, err);
            }
        }

        return null;
    }
}
