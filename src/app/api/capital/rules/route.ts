import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    try {
        const { data: products, error: pErr } = await supabaseAdmin.from('products').select('*, bank:banks(*)');
        const { data: versions, error: vErr } = await supabaseAdmin.from('product_rule_versions').select('*, tax_rules_config(*)');

        if (pErr) throw pErr;
        if (vErr) throw vErr;

        return NextResponse.json({ success: true, products, versions });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bank_id, name, indexer_percentage, tier_cap_limit, tier_secondary_percentage, tax_type } = body;

        if (!bank_id || !name || !indexer_percentage) {
            return NextResponse.json({ error: 'Instituição (bank_id), Nome do produto e % CDI são obrigatórios' }, { status: 400 });
        }

        const productCode = `${name.replace(/\s+/g, '_').toUpperCase()}_${Date.now()}`;

        // 1. Insert Product
        const { data: product, error: pErr } = await supabaseAdmin
            .from('products')
            .insert({
                bank_id,
                name: name.trim(),
                product_code: productCode,
                active: true
            })
            .select()
            .single();

        if (pErr) throw pErr;

        // Determine tax rule ID based on user selection (STANDARD, NO_IOF, EXEMPT)
        let taxRuleId = '88888888-8888-8888-8888-888888888888';

        if (tax_type === 'NO_IOF') {
            const { data: noIofRule } = await supabaseAdmin
                .from('tax_rules_config')
                .select('id')
                .eq('code', 'NO_IOF_WITH_IR')
                .maybeSingle();

            if (noIofRule) {
                taxRuleId = noIofRule.id;
            } else {
                const { data: createdRule } = await supabaseAdmin
                    .from('tax_rules_config')
                    .insert({
                        id: '77777777-7777-7777-7777-777777777777',
                        code: 'NO_IOF_WITH_IR',
                        name: 'Isento de IOF (Apenas IR Regressivo)',
                        is_exempt: false,
                        iof_table_json: {},
                        ir_table_json: { "180": 0.225, "360": 0.20, "720": 0.175, "9999": 0.15 }
                    })
                    .select()
                    .single();
                if (createdRule) taxRuleId = createdRule.id;
            }
        } else if (tax_type === 'EXEMPT') {
            const { data: exemptRule } = await supabaseAdmin
                .from('tax_rules_config')
                .select('id')
                .eq('code', 'EXEMPT_ALL')
                .maybeSingle();

            if (exemptRule) {
                taxRuleId = exemptRule.id;
            } else {
                const { data: createdRule } = await supabaseAdmin
                    .from('tax_rules_config')
                    .insert({
                        id: '99999999-9999-9999-9999-999999999999',
                        code: 'EXEMPT_ALL',
                        name: '100% Isento de Impostos (LCI/LCA)',
                        is_exempt: true,
                        iof_table_json: {},
                        ir_table_json: {}
                    })
                    .select()
                    .single();
                if (createdRule) taxRuleId = createdRule.id;
            }
        } else {
            // STANDARD: CDB Padrão (IOF + IR)
            const { data: stdRule } = await supabaseAdmin
                .from('tax_rules_config')
                .select('id')
                .eq('code', 'STANDARD_CDB_IOF_IR')
                .maybeSingle();
            if (stdRule) taxRuleId = stdRule.id;
        }

        // 2. Prepare payload for Rule Version
        const insertPayload: any = {
            product_id: product.id,
            version_number: 1,
            valid_from: new Date().toISOString(),
            indexer_code: 'CDI',
            indexer_percentage: parseFloat(indexer_percentage),
            day_count_convention: 'BUSINESS_252',
            tax_rule_id: taxRuleId
        };

        if (tier_cap_limit) {
            insertPayload.tier_cap_limit = parseFloat(tier_cap_limit);
        }
        if (tier_secondary_percentage) {
            insertPayload.tier_secondary_percentage = parseFloat(tier_secondary_percentage);
        }

        let { data: version, error: vErr } = await supabaseAdmin
            .from('product_rule_versions')
            .insert(insertPayload)
            .select()
            .single();

        // Safe fallback if tier_cap_limit column does not exist yet in DB schema
        if (vErr && (vErr.message?.includes('tier_cap_limit') || vErr.code === 'PGRST204')) {
            delete insertPayload.tier_cap_limit;
            delete insertPayload.tier_secondary_percentage;

            const fallbackRes = await supabaseAdmin
                .from('product_rule_versions')
                .insert(insertPayload)
                .select()
                .single();

            version = fallbackRes.data;
            vErr = fallbackRes.error;
        }

        if (vErr) throw vErr;

        return NextResponse.json({ success: true, product, version });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
