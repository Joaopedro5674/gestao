import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    try {
        const { data: banks, error } = await supabaseAdmin.from('banks').select('*').order('name');
        if (error) throw error;
        return NextResponse.json({ success: true, banks });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, name, brand_color } = body;

        if (!code || !name) {
            return NextResponse.json({ error: 'code e name são obrigatórios' }, { status: 400 });
        }

        const { data: bank, error } = await supabaseAdmin
            .from('banks')
            .insert({
                code: code.trim().toUpperCase(),
                name: name.trim(),
                brand_color: brand_color || '#4f46e5',
                active: true
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, bank });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
