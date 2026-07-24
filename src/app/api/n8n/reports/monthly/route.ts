import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        // Default to previous month if no date is provided
        // This handles running on the 1st of the month for the previous month's data
        let targetMonthStr = searchParams.get('month'); // YYYY-MM
        
        let firstDay: Date;
        let lastDay: Date;
        let monthLabel = '';

        if (targetMonthStr) {
            const [year, month] = targetMonthStr.split('-');
            firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
            lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
            monthLabel = `${month}/${year}`;
        } else {
            const now = new Date();
            // Go back one month
            firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            
            const m = (firstDay.getMonth() + 1).toString().padStart(2, '0');
            const y = firstDay.getFullYear();
            monthLabel = `${m}/${y}`;
        }

        const firstDayIso = firstDay.toISOString();
        const lastDayIso = lastDay.toISOString();

        // 1. Aluguéis Recebidos no mês
        const { data: alugueis, error: errAlugueis } = await supabaseAdmin
            .from('imoveis_pagamentos')
            .select('valor')
            .eq('status', 'pago')
            .gte('pago_em', firstDayIso)
            .lte('pago_em', lastDayIso);

        if (errAlugueis) console.error(errAlugueis);
        const totalAlugueis = alugueis?.reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0;

        // 2. Gastos com Casas no mês
        const { data: gastos, error: errGastos } = await supabaseAdmin
            .from('imoveis_gastos')
            .select('valor')
            .gte('created_at', firstDayIso)
            .lte('created_at', lastDayIso);

        if (errGastos) console.error(errGastos);
        const totalGastos = gastos?.reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0;

        // 3. Juros Mensais (EmprestimoMes) pagos no mês
        const { data: jurosMensais, error: errJuros } = await supabaseAdmin
            .from('emprestimo_meses')
            .select('valor_juros')
            .eq('pago', true);

        if (errJuros) console.error(errJuros);
        const totalJurosMensais = jurosMensais?.reduce((acc, curr) => acc + (curr.valor_juros || 0), 0) || 0;

        // 4. Empréstimos finalizados no mês (Juros Garantido Final e Devolução de Capital)
        const { data: emprestimos, error: errEmprestimos } = await supabaseAdmin
            .from('emprestimos')
            .select('valor_emprestado, juros_total_contratado')
            .eq('status', 'pago')
            .gte('data_pagamento', firstDayIso)
            .lte('data_pagamento', lastDayIso);

        if (errEmprestimos) console.error(errEmprestimos);
        const chequesQuitados = emprestimos?.length || 0;
        const totalJurosFinais = emprestimos?.reduce((acc, curr) => acc + (curr.juros_total_contratado || 0), 0) || 0;
        const capitalRetornado = emprestimos?.reduce((acc, curr) => acc + (curr.valor_emprestado || 0), 0) || 0;

        // Formatação
        const formatBrl = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        const lucroCasas = totalAlugueis - totalGastos;
        const lucroJuros = totalJurosMensais + totalJurosFinais;
        const lucroTotal = lucroCasas + lucroJuros;

        return NextResponse.json({
            success: true,
            mes: monthLabel,
            dados: {
                alugueis_recebidos: totalAlugueis,
                gastos_casas: totalGastos,
                lucro_casas: lucroCasas,
                cheques_quitados: chequesQuitados,
                capital_retornado: capitalRetornado,
                juros_mensais_pagos: totalJurosMensais,
                juros_finais_pagos: totalJurosFinais,
                lucro_juros: lucroJuros,
                lucro_total: lucroTotal
            },
            formatado: {
                alugueis_recebidos: formatBrl(totalAlugueis),
                gastos_casas: formatBrl(totalGastos),
                lucro_casas: formatBrl(lucroCasas),
                capital_retornado: formatBrl(capitalRetornado),
                juros_mensais_pagos: formatBrl(totalJurosMensais),
                juros_finais_pagos: formatBrl(totalJurosFinais),
                lucro_juros: formatBrl(lucroJuros),
                lucro_total: formatBrl(lucroTotal)
            }
        });

    } catch (error) {
        console.error("Error generating monthly report:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
