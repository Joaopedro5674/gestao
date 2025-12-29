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

        // Fallback: Update system_health table
        // Using UPSERT on known ID to minimal footprint
        const SYSTEM_ID = '00000000-0000-0000-0000-000000000001';

        // First, try plain read (Lightweight)
        await supabase.from('properties').select('id').limit(1);

        // Then, touch the system_health table
        const { error: healthError } = await supabase
            .from('system_health')
            .upsert({
                id: SYSTEM_ID,
                last_ping_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (healthError) {
            console.error('Keep-Alive Health Update Error:', healthError);
            // Ignore error, goal is just to touch DB.
        }

        return NextResponse.json({ ok: true, timestamp: new Date().toISOString() }, { status: 200 });

    } catch (error) {
        console.error('Keep-Alive Unexpected Error:', error);
        return NextResponse.json({ ok: true, note: 'exception_suppressed' }, { status: 200 });
    }
}
