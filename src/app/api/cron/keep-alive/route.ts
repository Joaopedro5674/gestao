import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { IndexerEngine } from '@/engine/indexerEngine';
import { RuleEngine } from '@/engine/ruleEngine';

// CRON JOB / HEARTBEAT
// Ping this endpoint via Vercel Cron to prevent Supabase pausing, auto-sync CDI, and record daily snapshots
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'anti_hibernation';
        const isFallback = type === 'fallback';

        // 1. Anti-Hibernation Query
        const { error: heartbeatError } = await supabaseAdmin
            .from('imoveis')
            .select('id')
            .limit(1);

        if (heartbeatError) throw heartbeatError;

        // 2. Auto Sync CDI from Banco Central
        let cdiSyncedRate = 14.15;
        try {
            const bcbData = await IndexerEngine.fetchOfficialBcbRate(12);
            if (bcbData) {
                cdiSyncedRate = bcbData.annualRate;
                await supabaseAdmin
                    .from('daily_rates')
                    .upsert({
                        indexer_code: 'CDI',
                        rate_date: bcbData.date,
                        annualized_rate: bcbData.annualRate,
                        daily_rate: Math.pow(1 + (bcbData.annualRate / 100), 1/252) - 1,
                        source_name: 'Banco Central do Brasil (SGS 12)'
                    }, { onConflict: 'indexer_code,rate_date' });
            }
        } catch (cdiErr) {
            console.warn("Cron CDI Auto-Sync Warning:", cdiErr);
        }

        // 3. Record Daily Lot Snapshots into daily_snapshots
        try {
            const getTodayBRT = () => {
                const d = new Date();
                const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
                const brtDate = new Date(utcTime - (3 * 3600000));
                return brtDate.toISOString().split('T')[0];
            };
            const todayStr = getTodayBRT();

            const { data: rawLots } = await supabaseAdmin.from('investment_lots').select('*').neq('status', 'CLOSED');
            const { data: ruleVersions } = await supabaseAdmin.from('product_rule_versions').select('*, tax_rules_config(*)');
            const { data: holidays } = await supabaseAdmin.from('holidays').select('holiday_date');
            const holidayDates = (holidays || []).map(h => h.holiday_date);

            const ruleEngine = new RuleEngine(holidayDates);

            if (rawLots && rawLots.length > 0) {
                for (const lot of rawLots) {
                    const version = (ruleVersions || []).find(v => v.id === lot.product_rule_version_id);
                    lot.rule_version = version;
                    const state = ruleEngine.evaluateLot(lot, todayStr, cdiSyncedRate);

                    await supabaseAdmin
                        .from('daily_snapshots')
                        .insert({
                            lot_id: lot.id,
                            snapshot_date: todayStr,
                            gross_balance: state.grossBalance,
                            net_balance: state.netBalance,
                            gross_yield_day: state.dailyYieldGross,
                            net_yield_day: state.dailyYieldNet,
                            iof_accumulated: state.iofAmount,
                            ir_accumulated: state.irAmount,
                            calendar_days: state.calendarDays,
                            business_days: state.businessDays,
                            cdi_used: cdiSyncedRate
                        });
                }
            }
        } catch (snapErr) {
            console.warn("Cron Snapshot Warning:", snapErr);
        }

        // 4. Log Success
        const message = isFallback 
            ? `Fallback executado (CDI: ${cdiSyncedRate}% a.a.)` 
            : `Cron principal executado (CDI: ${cdiSyncedRate}% a.a.)`;

        const { error: logError } = await supabaseAdmin
            .from('cron_logs')
            .insert({
                executed_at: new Date().toISOString(),
                status: 'success',
                type: type,
                message: message
            });

        if (logError) console.error("Cron Log Error:", logError);

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: message,
            type: type
        });

    } catch (e) {
        await supabaseAdmin
            .from('cron_logs')
            .insert({
                executed_at: new Date().toISOString(),
                status: 'error',
                type: 'anti_hibernation',
                message: (e as Error).message
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            .then(({ error: err }: { error: any }) => {
                if (err) console.error("Failed to log error:", err);
            });

        return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 });
    }
}
