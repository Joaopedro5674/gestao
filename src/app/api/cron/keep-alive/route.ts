import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// CRON JOB / HEARTBEAT
// Ping this endpoint via Vercel Cron to prevent Supabase pausing
// Schedule: Every day or every few hours
export async function GET() {
    try {
        // Simple lightweight query
        const { count, error } = await supabaseAdmin.from('imoveis').select('*', { count: 'exact', head: true });

        if (error) {
            console.error("Cron Heartbeat Error:", error);
            return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
        }

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            table: 'imoveis',
            count
        });
    } catch (e) {
        return NextResponse.json({ status: 'error', message: (e as Error).message }, { status: 500 });
    }
}
