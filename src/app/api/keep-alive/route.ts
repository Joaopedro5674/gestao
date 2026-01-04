import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 4. VARIÁVEIS DE AMBIENTE (SEGURANÇA)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Fail silently if configuration is missing, but return 200 as requested
        if (!supabaseUrl || !supabaseKey) {
            console.error('Keep-Alive: Missing env vars.');
            return NextResponse.json({ ok: true, status: 'missing_config' }, { status: 200 });
        }

        // 2. CRIAR ROTA ISOLADA (SERVERLESS) & 4. VARIÁVEIS DE AMBIENTE
        // initializing specific client with Service Role Key
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. QUERY PERMITIDA (APENAS LEITURA / UPDATE LAST PING)

        // 2. QUERY PERMITIDA (APENAS LEITURA)
        // First, try plain read (Lightweight)
        await supabase.from('imoveis').select('id').limit(1);

        // 3. LOG TO CRON LOGS (Unified System)
        const { error: logError } = await supabase
            .from('cron_logs')
            .insert({
                executed_at: new Date().toISOString(),
                status: 'success',
                type: 'keep_alive_ping',
                message: 'Keep-alive fallback execution'
            });

        if (logError) {
            console.error('Keep-Alive Log Error:', logError);
        }

        return NextResponse.json({ ok: true, timestamp: new Date().toISOString() }, { status: 200 });

    } catch (error) {
        console.error('Keep-Alive Unexpected Error:', error);
        return NextResponse.json({ ok: true, note: 'exception_suppressed' }, { status: 200 });
    }
}
