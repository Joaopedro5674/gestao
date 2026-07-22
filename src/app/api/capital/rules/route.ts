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
            return NextResponse.json({ error: 'bank_id, name e indexer_percentage são obrigatórios' }, { status: 400 });
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

        // Default tax rule ID (Standard CDB IOF + IR)
        const taxRuleId = '88888888-8888-8888-8888-888888888888';

        // 2. Insert Rule Version
        const { data: version, error: vErr } = await supabaseAdmin
            .from('product_rule_versions')
            .insert({
                product_id: product.id,
                version_number: 1,
                valid_from: new Date().toISOString(),
                indexer_code: 'CDI',
                indexer_percentage: parseFloat(indexer_percentage),
                day_count_convention: 'BUSINESS_252',
                tax_rule_id: taxRuleId,
                tier_cap_limit: tier_cap_limit ? parseFloat(tier_cap_limit) : null,
                tier_secondary_percentage: tier_secondary_percentage ? parseFloat(tier_secondary_percentage) : 100
            })
            .select()
            .single();

        if (vErr) throw vErr;

        return NextResponse.json({ success: true, product, version });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
