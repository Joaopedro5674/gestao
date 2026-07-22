import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { RuleEngine } from '@/engine/ruleEngine';

export async function GET() {
    try {
        const { data: withdrawals, error } = await supabaseAdmin
            .from('withdrawals')
            .select('*, lot:investment_lots(*)')
            .order('withdrawal_date', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, withdrawals });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bank_id, lot_id, amount, withdrawal_date } = body;

        if (!amount || parseFloat(amount) <= 0) {
            return NextResponse.json({ error: 'Valor de resgate inválido' }, { status: 400 });
        }

        const requestedAmount = parseFloat(amount);
        const wDate = withdrawal_date ? `${withdrawal_date.split('T')[0]}T12:00:00.000Z` : new Date().toISOString();
        const targetDateStr = wDate.split('T')[0];

        // Fetch products, versions, tax configs
        const { data: products } = await supabaseAdmin.from('products').select('*');
        const { data: versions } = await supabaseAdmin.from('product_rule_versions').select('*, tax_rules_config(*)');
        const { data: holidays } = await supabaseAdmin.from('holidays').select('holiday_date');
        const holidayDates = (holidays || []).map(h => h.holiday_date);

        const ruleEngine = new RuleEngine(holidayDates);

        // Fetch target lots (FIFO order: oldest deposit first)
        let query = supabaseAdmin
            .from('investment_lots')
            .select('*')
            .neq('status', 'CLOSED')
            .order('deposit_date', { ascending: true });

        if (lot_id) {
            query = query.eq('id', lot_id);
        }

        const { data: rawLots, error: lErr } = await query;
        if (lErr) throw lErr;

        // Filter lots by bank_id if requested
        let candidateLots = rawLots || [];
        if (bank_id && !lot_id) {
            candidateLots = candidateLots.filter(l => {
                const ver = (versions || []).find(v => v.id === l.product_rule_version_id);
                if (!ver) return false;
                const prod = (products || []).find(p => p.id === ver.product_id);
                return prod && prod.bank_id === bank_id;
            });
        }

        if (candidateLots.length === 0) {
            return NextResponse.json({ error: 'Nenhum lote ativo encontrado para resgate nesta instituição.' }, { status: 404 });
        }

        let remainingToWithdraw = requestedAmount;
        const auditRecords = [];

        for (const lot of candidateLots) {
            if (remainingToWithdraw <= 0) break;

            const version = (versions || []).find(v => v.id === lot.product_rule_version_id);
            lot.rule_version = version;

            // Evaluate current financial state of this lot
            const state = ruleEngine.evaluateLot(lot, targetDateStr, 14.15);
            const lotNetBalance = state.netBalance;

            if (lotNetBalance <= 0) continue;

            const withdrawFromThisLot = Math.min(remainingToWithdraw, lotNetBalance);
            const proportion = withdrawFromThisLot / lotNetBalance;

            const principalWithdrawn = state.lot.initial_principal * proportion;
            const grossYieldRealized = state.totalGrossYield * proportion;
            const iofPaid = state.iofAmount * proportion;
            const irPaid = state.irAmount * proportion;
            const netReceived = withdrawFromThisLot;

            // Record withdrawal audit
            const { data: withdrawalRecord, error: wErr } = await supabaseAdmin
                .from('withdrawals')
                .insert({
                    lot_id: lot.id,
                    withdrawal_date: wDate,
                    amount_requested: withdrawFromThisLot,
                    principal_withdrawn: principalWithdrawn,
                    gross_yield_realized: grossYieldRealized,
                    iof_paid: iofPaid,
                    ir_paid: irPaid,
                    net_received: netReceived
                })
                .select()
                .single();

            if (wErr) throw wErr;
            auditRecords.push(withdrawalRecord);

            // Update lot balance and status
            const newBalance = Math.max(0, lot.current_balance - principalWithdrawn);
            const newStatus = newBalance <= 0.01 ? 'CLOSED' : 'PARTIAL_WITHDRAWN';

            const { error: uErr } = await supabaseAdmin
                .from('investment_lots')
                .update({
                    current_balance: newBalance,
                    status: newStatus
                })
                .eq('id', lot.id);

            if (uErr) throw uErr;

            remainingToWithdraw -= withdrawFromThisLot;
        }

        return NextResponse.json({
            success: true,
            amount_requested: requestedAmount,
            amount_fulfilled: requestedAmount - remainingToWithdraw,
            audit: auditRecords
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
