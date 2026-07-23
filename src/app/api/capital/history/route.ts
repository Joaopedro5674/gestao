import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    try {
        const { data: rows, error } = await supabaseAdmin
            .from('daily_snapshots')
            .select(`
                *,
                lot:investment_lots (
                    *,
                    rule_version:product_rule_versions (
                        *,
                        product:products (
                            *,
                            bank:banks (*)
                        )
                    )
                )
            `)
            .order('snapshot_date', { ascending: true });

        if (error) throw error;

        // Group by snapshot_date
        const historyByDate: Record<string, {
            snapshot_date: string;
            total_net_balance: number;
            total_gross_balance: number;
            total_daily_yield_net: number;
            total_iof_accumulated: number;
            total_ir_accumulated: number;
            lot_count: number;
            bank_balances: Record<string, { bank_name: string; net_balance: number }>;
        }> = {};

        (rows || []).forEach((row: any) => {
            const date = row.snapshot_date;
            if (!historyByDate[date]) {
                historyByDate[date] = {
                    snapshot_date: date,
                    total_net_balance: 0,
                    total_gross_balance: 0,
                    total_daily_yield_net: 0,
                    total_iof_accumulated: 0,
                    total_ir_accumulated: 0,
                    lot_count: 0,
                    bank_balances: {}
                };
            }

            const item = historyByDate[date];
            item.total_net_balance += Number(row.net_balance || 0);
            item.total_gross_balance += Number(row.gross_balance || 0);
            item.total_daily_yield_net += Number(row.net_yield_day || 0);
            item.total_iof_accumulated += Number(row.iof_accumulated || 0);
            item.total_ir_accumulated += Number(row.ir_accumulated || 0);
            item.lot_count += 1;

            const bankName = row.lot?.rule_version?.product?.bank?.name || 'Banco';
            if (!item.bank_balances[bankName]) {
                item.bank_balances[bankName] = { bank_name: bankName, net_balance: 0 };
            }
            item.bank_balances[bankName].net_balance += Number(row.net_balance || 0);
        });

        const history = Object.values(historyByDate);

        return NextResponse.json({ success: true, history, raw_snapshots: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
