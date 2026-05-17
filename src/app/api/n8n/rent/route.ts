import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'upcoming' ou 'overdue'
    const daysAhead = parseInt(searchParams.get('days') || '3', 10);

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.N8N_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysAhead);

        const { data: imoveis, error } = await supabaseAdmin
            .from('imoveis')
            .select(`
                *,
                imoveis_pagamentos(*)
            `)
            .eq('ativo', true);

        if (error) throw error;

        const results: any[] = [];

        imoveis.forEach(imovel => {
            const pagamentosPendentes = imovel.imoveis_pagamentos?.filter((p: any) => p.status !== 'pago') || [];

            pagamentosPendentes.forEach((p: any) => {
                if (!p.mes_referencia) return;
                const [yearStr, monthStr] = p.mes_referencia.split('-');
                const year = parseInt(yearStr, 10);
                const month = parseInt(monthStr, 10) - 1;

                const dueDate = new Date(year, month, imovel.dia_pagamento);
                if (dueDate.getMonth() !== month) dueDate.setDate(0);
                dueDate.setHours(0, 0, 0, 0);

                const isUpcoming = dueDate > today && dueDate <= targetDate;
                const isOverdue = dueDate < today;

                if ((status === 'upcoming' && isUpcoming) || (status === 'overdue' && isOverdue)) {
                    results.push({
                        event: status === 'upcoming' ? 'rent.upcoming' : 'rent.overdue',
                        imovel_id: imovel.id,
                        pagamento_id: p.id,
                        locatario_nome: imovel.cliente_nome || 'Não informado',
                        imovel_nome: imovel.nome,
                        telefone: imovel.telefone,
                        valor_aluguel: imovel.valor_aluguel,
                        data_vencimento: dueDate.toISOString().split('T')[0],
                        mes_referencia: p.mes_referencia,
                        dias_atraso: isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
                    });
                }
            });
        });

        return NextResponse.json({ success: true, count: results.length, data: results });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
