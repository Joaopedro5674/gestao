import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// CRON JOB / HEARTBEAT
// Ping this endpoint via Vercel Cron to prevent Supabase pausing
// Schedule: Every day or every few hours
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'anti_hibernation';
        const isFallback = type === 'fallback';

        // 1. Anti-Hibernation Query (Keep functional)
        const { error: heartbeatError } = await supabaseAdmin
            .from('imoveis')
            .select('id')
            .limit(1);

        if (heartbeatError) throw heartbeatError;

        // 2. Log Success
        const message = isFallback ? 'Fallback executado automaticamente' : 'Cron principal executado';

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
