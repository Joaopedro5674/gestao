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

        if (!name) {
            return NextResponse.json({ error: 'Nome do banco é obrigatório' }, { status: 400 });
        }

        const generatedCode = (code || `BANK_${name.replace(/\s+/g, '_')}_${Date.now()}`).trim().toUpperCase();

        const { data: bank, error } = await supabaseAdmin
            .from('banks')
            .insert({
                code: generatedCode,
                name: name.trim(),
                brand_color: brand_color || '#820ad1',
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

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, brand_color } = body;

        if (!id || !name) {
            return NextResponse.json({ error: 'ID e Nome do banco são obrigatórios' }, { status: 400 });
        }

        const { data: bank, error } = await supabaseAdmin
            .from('banks')
            .update({
                name: name.trim(),
                brand_color: brand_color || '#820ad1'
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, bank });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID do banco é obrigatório' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('banks')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
