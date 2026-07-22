import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DivergenceValidator } from '@/engine/divergenceValidator';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bank_id, user_reported_balance, engine_calculated_balance, adjustment_notes } = body;

        if (!bank_id || user_reported_balance === undefined || engine_calculated_balance === undefined) {
            return NextResponse.json({ error: 'bank_id, user_reported_balance e engine_calculated_balance são obrigatórios' }, { status: 400 });
        }

        const audit = DivergenceValidator.auditDivergence(
            parseFloat(user_reported_balance),
            parseFloat(engine_calculated_balance)
        );

        const userId = '00000000-0000-0000-0000-000000000000';

        const { data: record, error } = await supabaseAdmin
            .from('divergence_metrics')
            .insert({
                user_id: userId,
                bank_id,
                user_reported_balance: audit.userReported,
                engine_calculated_balance: audit.calculated,
                divergence_cents: audit.divergenceCents,
                status: audit.status,
                adjustment_notes: adjustment_notes ? adjustment_notes.trim() : audit.message
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, audit, record });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
