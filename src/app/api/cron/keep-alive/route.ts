import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { IndexerEngine } from '@/engine/indexerEngine';

// CRON JOB / HEARTBEAT
// Ping this endpoint via Vercel Cron to prevent Supabase pausing and auto-sync CDI
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
        let cdiSyncedRate = null;
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

        // 3. Log Success
        const message = isFallback 
            ? `Fallback executado (CDI: ${cdiSyncedRate || '14.15'}% a.a.)` 
            : `Cron principal executado (CDI: ${cdiSyncedRate || '14.15'}% a.a.)`;

        const { error: logError } = await supabaseAdmin
            .from('cron_logs')
            .insert({
                executed_at: new Date().toISOString(),
                status: 'success',
                type: type, // 'anti_hibernation' or 'fallback'
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
        // 3. Log Error (Attempt)
        await supabaseAdmin
            .from('cron_logs')
            .insert({
                executed_at: new Date().toISOString(),
                status: 'error',
                type: 'anti_hibernation', // Default to main type for errors if unknown
                message: (e as Error).message
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            .then(({ error: err }: { error: any }) => {
                if (err) console.error("Failed to log error:", err);
            });

        return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 });
    }
}
