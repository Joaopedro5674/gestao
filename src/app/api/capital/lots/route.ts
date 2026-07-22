import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    try {
        const { data: lots, error } = await supabaseAdmin
            .from('investment_lots')
            .select(`
                *,
                rule_version:product_rule_versions (
                    *,
                    product:products (
                        *,
                        bank:banks (*)
                    ),
                    tax_rules_config (*)
                )
            `)
            .order('deposit_date', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, lots });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { product_rule_version_id, deposit_date, initial_principal, notes } = body;

        if (!product_rule_version_id || !initial_principal) {
            return NextResponse.json({ error: 'product_rule_version_id e initial_principal são obrigatórios' }, { status: 400 });
        }

        const principal = parseFloat(initial_principal);
        const depDate = deposit_date ? new Date(deposit_date).toISOString() : new Date().toISOString();

        // Fixed demo user ID for single-tenant / local mode
        const userId = '00000000-0000-0000-0000-000000000000';

        const { data: lot, error } = await supabaseAdmin
            .from('investment_lots')
            .insert({
                user_id: userId,
                product_rule_version_id,
                deposit_date: depDate,
                initial_principal: principal,
                current_balance: principal,
                status: 'ACTIVE',
                notes: notes ? notes.trim() : null
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, lot });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
