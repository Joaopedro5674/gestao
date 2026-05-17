import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'upcoming' ou 'overdue'
    const daysAhead = parseInt(searchParams.get('days') || '3', 10);

    // Simple API Key protection
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.N8N_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysAhead);

        // Fetch all active loans
        const { data: emprestimos, error } = await supabaseAdmin
            .from('emprestimos')
            .select(`
                *,
                emprestimo_meses(*)
            `)
            .eq('status', 'ativo');

        if (error) throw error;

        const results: any[] = [];

        emprestimos.forEach(emp => {
            // TIPO 2: Juros Mensais
            if (emp.cobranca_mensal && emp.emprestimo_meses) {
                const pendingMonths = emp.emprestimo_meses.filter((m: any) => !m.pago);
                
                pendingMonths.forEach((m: any) => {
                    const [refYear, refMonth] = m.mes_referencia.split('-').map(Number);
                    const start = new Date(emp.data_inicio + 'T12:00:00');
                    const startYear = start.getFullYear();
                    const startMonth = start.getMonth() + 1;

                    const monthDiff = ((refYear - startYear) * 12) + (refMonth - startMonth);
                    const multiplier = Math.max(0, monthDiff + 1);

                    const dueDate = new Date(start);
                    dueDate.setDate(dueDate.getDate() + (30 * multiplier));
                    dueDate.setHours(0, 0, 0, 0);

                    const isUpcoming = dueDate > today && dueDate <= targetDate;
                    const isOverdue = dueDate < today;

                    if ((status === 'upcoming' && isUpcoming) || (status === 'overdue' && isOverdue)) {
                        results.push({
                            event: status === 'upcoming' ? 'loan.interest.upcoming' : 'loan.interest.overdue',
                            loan_id: emp.id,
                            mes_id: m.id,
                            cliente_nome: emp.cliente_nome,
                            telefone: emp.telefone,
                            tipo_emprestimo: 'juros_mensal',
                            valor_parcela: (emp.valor_emprestado * emp.juros_mensal) / 100,
                            data_vencimento: dueDate.toISOString().split('T')[0],
                            dias_atraso: isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
                        });
                    }
                });
            }

            // TIPO 1 / VENCIMENTO FINAL: Capital (e juros se não for mensal)
            if (emp.data_fim) {
                const dueDate = new Date(emp.data_fim + 'T12:00:00');
                dueDate.setHours(0, 0, 0, 0);

                const isUpcoming = dueDate > today && dueDate <= targetDate;
                const isOverdue = dueDate < today;

                if ((status === 'upcoming' && isUpcoming) || (status === 'overdue' && isOverdue)) {
                    results.push({
                        event: status === 'upcoming' ? 'loan.principal.upcoming' : 'loan.principal.overdue',
                        loan_id: emp.id,
                        cliente_nome: emp.cliente_nome,
                        telefone: emp.telefone,
                        tipo_emprestimo: emp.cobranca_mensal ? 'quitacao_capital' : 'juros_garantidos_final',
                        valor_parcela: emp.cobranca_mensal ? emp.valor_emprestado : (emp.valor_emprestado + emp.juros_total_contratado),
                        data_vencimento: dueDate.toISOString().split('T')[0],
                        dias_atraso: isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
                    });
                }
            }
        });

        return NextResponse.json({ success: true, count: results.length, data: results });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
