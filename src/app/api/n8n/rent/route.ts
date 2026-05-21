import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    let status = searchParams.get('status'); // 'upcoming', 'overdue', ou 'today'
    let daysAhead = parseInt(searchParams.get('days') || '3', 10);

    // ✅ Suporte a status=today: tratar como upcoming + days=0
    if (status === 'today') {
        status = 'upcoming';
        daysAhead = 0;
    }

    // ✅ Se days=0 sem status definido, tratar como today
    if (daysAhead === 0 && !status) {
        status = 'upcoming';
    }

    // ✅ Verificação de autenticação com null safety
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.N8N_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // ✅ Usar data como STRING para comparação (evita problemas de timezone)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0]; // "2026-05-21"

        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysAhead);
        const targetDateString = targetDate.toISOString().split('T')[0];

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

                // ✅ CORRIGIDO: Comparar STRINGS em formato YYYY-MM-DD
                const dueDateString = dueDate.toISOString().split('T')[0];

                let isUpcoming = false;
                if (daysAhead === 0) {
                    // Exatamente hoje
                    isUpcoming = dueDateString === todayString;
                } else {
                    // Próximos N dias
                    isUpcoming = dueDateString > todayString && dueDateString <= targetDateString;
                }

                const isOverdue = dueDateString < todayString;

                if ((status === 'upcoming' && isUpcoming) || (status === 'overdue' && isOverdue)) {
                    results.push({
                        event: status === 'upcoming' ? 'rent.upcoming' : 'rent.overdue',
                        imovel_id: imovel.id,
                        pagamento_id: p.id,
                        locatario_nome: imovel.cliente_nome || 'Não informado',
                        imovel_nome: imovel.nome,
                        telefone: imovel.telefone,
                        valor_aluguel: imovel.valor_aluguel,
                        data_vencimento: dueDateString,
                        mes_referencia: p.mes_referencia,
                        dias_atraso: isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
                    });
                }
            });
        });

        // ✅ Ordenar por data_vencimento (crescente) e depois por locatario_nome (alfabético)
        results.sort((a, b) => {
            const dateComp = a.data_vencimento.localeCompare(b.data_vencimento);
            if (dateComp !== 0) return dateComp;
            return a.locatario_nome.localeCompare(b.locatario_nome);
        });

        return NextResponse.json({ success: true, count: results.length, data: results });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
