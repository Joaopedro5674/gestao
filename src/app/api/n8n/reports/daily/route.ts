import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { RuleEngine } from '@/engine/ruleEngine';
import { IndexerEngine } from '@/engine/indexerEngine';

export async function GET(request: Request) {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.N8N_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const getTodayBRT = () => {
            const d = new Date();
            const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
            const brtDate = new Date(utcTime - (3 * 3600000));
            return brtDate.toISOString().split('T')[0];
        };
        const todayStr = getTodayBRT();

        // Fetch official CDI
        const bcbData = await IndexerEngine.fetchOfficialBcbRate(12);
        const cdiRate = bcbData ? bcbData.annualRate : 14.15;

        // Fetch banks, products, versions, lots, holidays
        const { data: banks } = await supabaseAdmin.from('banks').select('*').eq('active', true);
        const { data: products } = await supabaseAdmin.from('products').select('*').eq('active', true);
        const { data: ruleVersions } = await supabaseAdmin.from('product_rule_versions').select('*, tax_rules_config(*)');
        const { data: holidays } = await supabaseAdmin.from('holidays').select('holiday_date');
        const defaultAnbimaHolidays = [
            '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21',
            '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02',
            '2026-11-15', '2026-11-20', '2026-12-25', '2026-12-31'
        ];
        const holidayDates = (holidays && holidays.length > 0)
            ? holidays.map(h => h.holiday_date)
            : defaultAnbimaHolidays;

        const ruleEngine = new RuleEngine(holidayDates);

        const { data: rawLots } = await supabaseAdmin.from('investment_lots').select('*').neq('status', 'CLOSED');

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

        let totalNetBalance = 0;
        let totalGrossBalance = 0;
        let totalDailyYieldNet = 0;
        let totalMonthlyYieldNet = 0;

        const bankSummaries: Record<string, { bank_name: string; net_balance: number; daily_yield_net: number }> = {};
        (banks || []).forEach((b: any) => {
            bankSummaries[b.id] = { bank_name: b.name, net_balance: 0, daily_yield_net: 0 };
        });

        lots.forEach(lot => {
            const state = ruleEngine.evaluateLot(lot, todayStr, cdiRate);
            totalNetBalance += state.netBalance;
            totalGrossBalance += state.grossBalance;
            totalDailyYieldNet += state.dailyYieldNet;
            totalMonthlyYieldNet += state.totalNetYield;

            const bankId = lot.rule_version?.product?.bank_id;
            if (bankId && bankSummaries[bankId]) {
                bankSummaries[bankId].net_balance += state.netBalance;
                bankSummaries[bankId].daily_yield_net += state.dailyYieldNet;
            }
        });

        const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
        const todayFormatted = new Date().toLocaleDateString('pt-BR');

        let bankDetailsLines = '';
        Object.values(bankSummaries).forEach(b => {
            if (b.net_balance > 0) {
                bankDetailsLines += `• *${b.bank_name}:* ${fmt(b.net_balance)} (+${fmt(b.daily_yield_net)})\n`;
            }
        });

        const formattedMsg = `🚀 *Relatório Matinal de Rendimento — Capital*\n📅 *Data:* ${todayFormatted}\n📈 *CDI Oficial:* ${cdiRate}% a.a.\n\n💰 *Patrimônio Total:* ${fmt(totalNetBalance)}\n🟢 *Rendimento Hoje:* +${fmt(totalDailyYieldNet)}\n📊 *Lucro Acumulado:* +${fmt(totalMonthlyYieldNet)}\n\n🏦 *Detalhamento por Banco:*\n${bankDetailsLines}`;

        return NextResponse.json({
            success: true,
            today: todayStr,
            cdi_annual_rate: cdiRate,
            summary: {
                total_net_balance: totalNetBalance,
                total_gross_balance: totalGrossBalance,
                total_daily_yield_net: totalDailyYieldNet,
                total_monthly_yield_net: totalMonthlyYieldNet
            },
            banks: Object.values(bankSummaries),
            message: formattedMsg
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
