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
        const { bank_id, name, indexer_percentage, tier_cap_limit, tier_secondary_percentage } = body;

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

        // Fetch valid tax rule ID or fallback to standard
        let taxRuleId = '88888888-8888-8888-8888-888888888888';
        const { data: taxRules } = await supabaseAdmin.from('tax_rules_config').select('id').limit(1);
        if (taxRules && taxRules.length > 0) {
            taxRuleId = taxRules[0].id;
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
