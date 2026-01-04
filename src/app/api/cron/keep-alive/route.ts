import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// CRON JOB / HEARTBEAT
// Ping this endpoint via Vercel Cron to prevent Supabase pausing
// Schedule: Every day or every few hours
export async function GET() {
    try {
        // 1. Anti-Hibernation Query (Keep functional)
        const { error: heartbeatError } = await supabaseAdmin
            .from('imoveis')
            .select('id')
            .limit(1);

        if (heartbeatError) throw heartbeatError;

        // 2. Log Success
        const { error: logError } = await supabaseAdmin
            .from('cron_logs')
            .insert({
                executed_at: new Date().toISOString(),
                status: 'success'
            });

        if (logError) console.error("Cron Log Error:", logError);

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'Anti-hibernation executed and logged'
        });

    } catch (e) {
        // 3. Log Error (Attempt)
        const { error: errorLogErr } = await supabaseAdmin
            .from('cron_logs')
            .insert({
                executed_at: new Date().toISOString(),
                status: 'error'
            });

        if (errorLogErr) {
            console.error("Failed to log error:", errorLogErr);
        }

        return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 });
    }
}
