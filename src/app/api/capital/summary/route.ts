import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { RuleEngine } from '@/engine/ruleEngine';
import { IndexerEngine } from '@/engine/indexerEngine';

export async function GET(request: Request) {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch official rate from BCB or fallback
        const bcbData = await IndexerEngine.fetchOfficialBcbRate(12);
        const cdiRate = bcbData ? bcbData.annualRate : 10.65;

        // Fetch banks, products, product_rule_versions, tax_rules_config
        const { data: banks } = await supabaseAdmin.from('banks').select('*').eq('active', true);
        const { data: products } = await supabaseAdmin.from('products').select('*').eq('active', true);
        const { data: ruleVersions } = await supabaseAdmin.from('product_rule_versions').select('*, tax_rules_config(*)');
        const { data: holidays } = await supabaseAdmin.from('holidays').select('holiday_date');

        const holidayDates = holidays ? holidays.map(h => h.holiday_date) : [];
        const ruleEngine = new RuleEngine(holidayDates);

        // Fetch all active investment lots
        const { data: rawLots, error } = await supabaseAdmin
            .from('investment_lots')
            .select('*')
            .neq('status', 'CLOSED');

        if (error) throw error;

        // Associate rule versions
        const lots = (rawLots || []).map((lot: any) => {
            const version = (ruleVersions || []).find((v: any) => v.id === lot.product_rule_version_id);
            if (version) {
                const prod = (products || []).find((p: any) => p.id === version.product_id);
                if (prod) {
                    const bank = (banks || []).find((b: any) => b.id === prod.bank_id);
                    prod.bank = bank;
                }
                version.product = prod;
            }
            lot.rule_version = version;
            return lot;
        });

        // Evaluate state of each lot
        let totalNetBalance = 0;
        let totalGrossBalance = 0;
        let totalDailyYieldNet = 0;
        let totalMonthlyYieldNet = 0;
        let totalIofAccumulated = 0;
        let totalIrAccumulated = 0;

        const bankSummaries: Record<string, {
            bank_id: string;
            bank_name: string;
            bank_code: string;
            brand_color: string;
            net_balance: number;
            gross_balance: number;
            daily_yield_net: number;
            lot_count: number;
        }> = {};

        // Initialize bank summaries
        (banks || []).forEach((b: any) => {
            bankSummaries[b.id] = {
                bank_id: b.id,
                bank_name: b.name,
                bank_code: b.code,
                brand_color: b.brand_color || '#4f46e5',
                net_balance: 0,
                gross_balance: 0,
                daily_yield_net: 0,
                lot_count: 0
            };
        });

        const evaluatedLots = lots.map(lot => {
            const state = ruleEngine.evaluateLot(lot, todayStr, cdiRate);

            totalNetBalance += state.netBalance;
            totalGrossBalance += state.grossBalance;
            totalDailyYieldNet += state.dailyYieldNet;
            totalMonthlyYieldNet += state.totalNetYield; // Accumulation for period
            totalIofAccumulated += state.iofAmount;
            totalIrAccumulated += state.irAmount;

            const bankId = lot.rule_version?.product?.bank_id;
            if (bankId && bankSummaries[bankId]) {
                bankSummaries[bankId].net_balance += state.netBalance;
                bankSummaries[bankId].gross_balance += state.grossBalance;
                bankSummaries[bankId].daily_yield_net += state.dailyYieldNet;
                bankSummaries[bankId].lot_count += 1;
            }

            return state;
        });

        return NextResponse.json({
            success: true,
            cdi_annual_rate: cdiRate,
            today: todayStr,
            summary: {
                total_net_balance: totalNetBalance,
                total_gross_balance: totalGrossBalance,
                total_daily_yield_net: totalDailyYieldNet,
                total_monthly_yield_net: totalMonthlyYieldNet,
                total_iof_accumulated: totalIofAccumulated,
                total_ir_accumulated: totalIrAccumulated,
                active_lots_count: evaluatedLots.length
            },
            banks: Object.values(bankSummaries),
            lots: evaluatedLots
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
