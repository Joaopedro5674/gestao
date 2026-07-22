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

        // If auto_adjust is true, create an adjustment lot in investment_lots so the total balance updates immediately!
        if (auto_adjust && Math.abs(audit.divergenceCents) > 0.01) {
            // Find active version for this bank
            const { data: prods } = await supabaseAdmin
                .from('products')
                .select('*, version:product_rule_versions(*)')
                .eq('bank_id', bank_id);

            let targetVersionId = prods?.[0]?.version?.[0]?.id;

            if (!targetVersionId) {
                // Fallback to standard version if no specific product version
                const { data: versions } = await supabaseAdmin.from('product_rule_versions').select('id').limit(1);
                targetVersionId = versions?.[0]?.id || '55555555-5555-5555-5555-555555555555';
            }

            // Set deposit_date to 1 day prior (yesterday) so that BOTH net_balance AND daily_yield_net update automatically for today!
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const depDate = `${yesterday.toISOString().split('T')[0]}T12:00:00.000Z`;

            await supabaseAdmin.from('investment_lots').insert({
                user_id: userId,
                product_rule_version_id: targetVersionId,
                deposit_date: depDate,
                initial_principal: audit.divergenceCents,
                current_balance: audit.divergenceCents,
                status: 'ACTIVE',
                notes: 'Ajuste de Conciliação Bancária'
            });
        }

        return NextResponse.json({ success: true, audit, record });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
