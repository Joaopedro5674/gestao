import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calcularVencimentoParcela } from '@/utils/loanHelpers';

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

        // Fetch all active loans
        const { data: emprestimos, error } = await supabaseAdmin
            .from('emprestimos')
            .select(`
                *,
                emprestimo_meses(*)
            `)
            .eq('status', 'ativo');

        if (error) throw error;

        // Fetch NIS Calendar
        const { data: nisRows } = await supabaseAdmin
            .from('calendario_nis')
            .select('final_nis, dia_pagamento');

        const nisCalendar: Record<number, number> = {
            1: 18, 2: 19, 3: 20, 4: 21, 5: 22,
            6: 25, 7: 26, 8: 27, 9: 28, 0: 29
        };
        if (nisRows) {
            nisRows.forEach((row: any) => {
                nisCalendar[row.final_nis] = row.dia_pagamento;
            });
        }

        const results: any[] = [];

        emprestimos.forEach(emp => {
            // TIPO 2: Juros Mensais / Retiradas Cartão
            if (emp.cobranca_mensal && emp.emprestimo_meses) {
                // Sort all months by mes_referencia ascending to calculate correct installment index
                const sortedAllMonths = [...emp.emprestimo_meses].sort((a: any, b: any) =>
                    a.mes_referencia.localeCompare(b.mes_referencia)
                );
                const totalParcelas = emp.cartao_quantidade_meses || sortedAllMonths.length;

                const pendingMonths = emp.emprestimo_meses.filter((m: any) => !m.pago);
                
                pendingMonths.forEach((m: any) => {
                    const monthIndex = sortedAllMonths.findIndex((sm: any) => sm.id === m.id);
                    const parcelaAtual = monthIndex >= 0 ? monthIndex + 1 : 1;
                    const parcelasRestantes = Math.max(0, totalParcelas - parcelaAtual);

                    const dueDate = calcularVencimentoParcela(
                        emp.data_inicio,
                        m.mes_referencia,
                        emp.tipo === 'cartao',
                        emp.cartao_final_nis,
                        nisCalendar
                    );
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
                            event: status === 'upcoming' ? 'loan.interest.upcoming' : 'loan.interest.overdue',
                            loan_id: emp.id,
                            mes_id: m.id,
                            cliente_nome: emp.cliente_nome,
                            telefone: emp.telefone,
                            tipo_emprestimo: emp.tipo === 'cartao' ? 'cartao_retirada' : 'juros_mensal',
                            valor_parcela: m.valor_juros,
                            data_vencimento: dueDateString,
                            dias_atraso: isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
                            dias_faltantes: isUpcoming ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0,
                            cartao_final_nis: emp.cartao_final_nis !== undefined ? emp.cartao_final_nis : null,
                            cartao_senha: emp.cartao_senha || null,
                            nis: emp.cartao_final_nis !== undefined ? emp.cartao_final_nis : null,
                            senha: emp.cartao_senha || null,
                            parcela_atual: parcelaAtual,
                            total_parcelas: totalParcelas,
                            parcelas_restantes: parcelasRestantes,
                            numero_cheque: emp.numero_cheque || null,
                            observacoes: emp.observacoes || null
                        });
                    }
                });
            }

            // TIPO 1 / VENCIMENTO FINAL: Capital (e juros se não for mensal)
            if (emp.data_fim) {
                const dueDate = new Date(emp.data_fim + 'T12:00:00');
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
                        event: status === 'upcoming' ? 'loan.principal.upcoming' : 'loan.principal.overdue',
                        loan_id: emp.id,
                        cliente_nome: emp.cliente_nome,
                        telefone: emp.telefone,
                        tipo_emprestimo: emp.cobranca_mensal ? 'quitacao_capital' : 'juros_garantidos_final',
                        valor_parcela: emp.cobranca_mensal ? (emp.valor_emprestado + ((emp.valor_emprestado * emp.juros_mensal) / 100)) : emp.valor_emprestado,
                        data_vencimento: dueDateString,
                        dias_atraso: isOverdue ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
                        dias_faltantes: isUpcoming ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0,
                        cartao_final_nis: emp.cartao_final_nis !== undefined ? emp.cartao_final_nis : null,
                        cartao_senha: emp.cartao_senha || null,
                        nis: emp.cartao_final_nis !== undefined ? emp.cartao_final_nis : null,
                        senha: emp.cartao_senha || null,
                        numero_cheque: emp.numero_cheque || null,
                        observacoes: emp.observacoes || null
                    });
                }
            }
        });

        // ✅ Ordenar por data_vencimento (crescente) e depois por cliente_nome (alfabético)
        results.sort((a, b) => {
            const dateComp = a.data_vencimento.localeCompare(b.data_vencimento);
            if (dateComp !== 0) return dateComp;
            return a.cliente_nome.localeCompare(b.cliente_nome);
        });

        return NextResponse.json({ success: true, count: results.length, data: results });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.N8N_API_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        let { loan_id, mes_id, type, command, text, message: inputMsg } = body;

        const rawCmd = command || text || inputMsg || (typeof body === 'string' ? body : '');
        if (typeof rawCmd === 'string' && rawCmd.startsWith('pago:')) {
            const parts = rawCmd.split(':');
            if (parts.length >= 2) {
                const parsedId = parts[1];
                const parsedType = (parts[2] || 'emprestimo').toLowerCase();
                if (parsedType === 'mes' || parsedType === 'juros' || parsedType === 'parcela') {
                    mes_id = parsedId;
                } else {
                    loan_id = parsedId;
                }
                type = parsedType;
            }
        }

        const targetId = loan_id || mes_id || body.id;

        if (!targetId) {
            return NextResponse.json({ error: 'ID do empréstimo ou mês é obrigatório (ou envie command no formato pago:ID:tipo)' }, { status: 400 });
        }

        // Check if mes_id or if type is 'mes', 'juros' or 'parcela'
        const isMonthlyInstallment = !!mes_id || ['mes', 'juros', 'parcela'].includes(String(type).toLowerCase());
        if (isMonthlyInstallment) {
            const mId = mes_id || targetId;
            const { data: mes, error: mErr } = await supabaseAdmin
                .from('emprestimo_meses')
                .update({ pago: true })
                .eq('id', mId)
                .select('*, emprestimo:emprestimos(*)')
                .single();

            if (mErr) throw mErr;

            const clientName = mes.emprestimo?.cliente_nome || 'N/A';
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR');
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const formattedMsg = `✅ Parcela Mensal Quitada com Sucesso!\n\n👤 Cliente: ${clientName}\n💳 Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mes.valor_juros)}\n📅 Data: ${dateStr}\n⏰ Hora: ${timeStr}`;

            return NextResponse.json({
                success: true,
                cliente_nome: clientName,
                valor: mes.valor_juros,
                tipo: 'parcela_mensal',
                data: dateStr,
                hora: timeStr,
                message: formattedMsg,
                data_record: mes
            });
        } else {
            // Full loan payoff
            const { data: loan, error: lErr } = await supabaseAdmin
                .from('emprestimos')
                .update({ status: 'pago', data_pagamento: new Date().toISOString() })
                .eq('id', targetId)
                .select('*')
                .single();

            if (lErr) throw lErr;

            const clientName = loan.cliente_nome || 'N/A';
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR');
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const formattedMsg = `✅ Empréstimo Quitado com Sucesso!\n\n👤 Cliente: ${clientName}\n💳 Tipo: Quitação de Empréstimo\n📅 Data: ${dateStr}\n⏰ Hora: ${timeStr}`;

            return NextResponse.json({
                success: true,
                cliente_nome: clientName,
                valor: loan.valor_emprestado,
                tipo: 'quitacao_emprestimo',
                data: dateStr,
                hora: timeStr,
                message: formattedMsg,
                data_record: loan
            });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
