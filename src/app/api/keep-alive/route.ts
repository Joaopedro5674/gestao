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

        // 3. QUERY PERMITIDA (APENAS LEITURA)
        // "SELECT id FROM imoveis LIMIT 1" -> Mapping 'imoveis' to 'properties' based on project structure
        const { error } = await supabase
            .from('properties') // Using 'properties' table as identified in AppContext
            .select('id')
            .limit(1);

        if (error) {
            console.error('Keep-Alive Cron Error:', error);
            // 7. TOLERÂNCIA A ERRO: Return 200 even on API error to avoid noisy alerts if desired, 
            // though typically 500 helps identifying issues. User asked for "erro silencioso para o cron".
            // Returning 200 ensures Vercel Cron considers it a success.
            return NextResponse.json({ ok: true, note: 'error_suppressed' }, { status: 200 });
        }

        // 2. Retornar 200 OK
        return NextResponse.json({ ok: true, timestamp: new Date().toISOString() }, { status: 200 });

    } catch (error) {
        console.error('Keep-Alive Unexpected Error:', error);
        return NextResponse.json({ ok: true, note: 'exception_suppressed' }, { status: 200 });
    }
}
