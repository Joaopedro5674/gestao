import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DivergenceValidator } from '@/engine/divergenceValidator';

export async function GET() {
    try {
        const { data: metrics, error } = await supabaseAdmin
            .from('divergence_metrics')
            .select('*, bank:banks(*)')
            .order('check_date', { ascending: false })
            .limit(20);

        if (error) throw error;
        return NextResponse.json({ success: true, metrics });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bank_id, user_reported_balance, engine_calculated_balance, adjustment_notes, auto_adjust } = body;

        if (!bank_id || user_reported_balance === undefined || engine_calculated_balance === undefined) {
            return NextResponse.json({ error: 'bank_id, user_reported_balance e engine_calculated_balance são obrigatórios' }, { status: 400 });
        }

        const userVal = parseFloat(user_reported_balance);
        const engineVal = parseFloat(engine_calculated_balance);

        const audit = DivergenceValidator.auditDivergence(userVal, engineVal);
        const status = auto_adjust ? 'ADJUSTED' : audit.status;

        const userId = '00000000-0000-0000-0000-000000000000';

        const { data: record, error } = await supabaseAdmin
            .from('divergence_metrics')
            .insert({
                user_id: userId,
                bank_id,
                user_reported_balance: audit.userReported,
                engine_calculated_balance: audit.calculated,
                divergence_cents: audit.divergenceCents,
                status,
                adjustment_notes: auto_adjust 
                    ? `Ajuste automático de R$ ${audit.divergenceCents.toFixed(2)} efetuado pelo usuário`
                    : (adjustment_notes ? adjustment_notes.trim() : audit.message)
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, audit, record });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
