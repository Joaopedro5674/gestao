import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { RuleEngine } from '@/engine/ruleEngine';
import { IndexerEngine } from '@/engine/indexerEngine';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { bank_id, mode } = body; // mode: 'adjustments_only' (default) or 'all'

        if (!bank_id) {
            return NextResponse.json({ error: 'bank_id é obrigatório para consolidação' }, { status: 400 });
        }

        const getTodayBRT = () => {
            const d = new Date();
            const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
            const brtDate = new Date(utcTime - (3 * 3600000));
            return brtDate.toISOString().split('T')[0];
        };
        const todayStr = getTodayBRT();

        // Fetch official CDI
        const bcbData = await IndexerEngine.fetchOfficialBcbRate(12);
        const cdiRate = bcbData ? bcbData.annualRate : 14.15;

        // Fetch rule versions, products, holidays
        const { data: products } = await supabaseAdmin.from('products').select('*').eq('bank_id', bank_id).eq('active', true);
        const { data: ruleVersions } = await supabaseAdmin.from('product_rule_versions').select('*, tax_rules_config(*)');
        const { data: holidays } = await supabaseAdmin.from('holidays').select('holiday_date');
        const defaultAnbimaHolidays = [
            '2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-21',
            '2026-05-01', '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02',
            '2026-11-15', '2026-11-20', '2026-12-25', '2026-12-31'
        ];
        const holidayDates = (holidays && holidays.length > 0)
            ? holidays.map(h => h.holiday_date)
            : defaultAnbimaHolidays;

        const ruleEngine = new RuleEngine(holidayDates);

        // Fetch active lots for this bank
        const { data: rawLots, error: lErr } = await supabaseAdmin
            .from('investment_lots')
            .select('*')
            .neq('status', 'CLOSED');

        if (lErr) throw lErr;

        // Associate versions & filter by bank_id
        const bankProductIds = (products || []).map(p => p.id);
        const allBankLots = (rawLots || []).filter(lot => {
            const version = (ruleVersions || []).find(v => v.id === lot.product_rule_version_id);
            if (!version) return false;
            lot.rule_version = version;
            return bankProductIds.includes(version.product_id);
        });

        if (allBankLots.length === 0) {
            return NextResponse.json({ error: 'Nenhum lote ativo encontrado para consolidar neste banco.' }, { status: 404 });
        }

        // Intelligently determine candidate lots to consolidate
        let candidateLots = allBankLots;
        const isAdjustmentsOnly = mode !== 'all';

        if (isAdjustmentsOnly) {
            const adjustmentLots = allBankLots.filter(l => l.notes && l.notes.toLowerCase().includes('ajuste'));
            if (adjustmentLots.length > 0) {
                candidateLots = adjustmentLots;
            }
        }

        // Evaluate state of candidate lots today and compute total net balance
        let totalNetBalance = 0;
        for (const lot of candidateLots) {
            const state = ruleEngine.evaluateLot(lot, todayStr, cdiRate);
            totalNetBalance += state.netBalance;
        }

        totalNetBalance = Math.round(totalNetBalance * 100) / 100;

        const nowIso = new Date().toISOString();
        const dateFormatted = new Date().toLocaleDateString('pt-BR');

        // Close old candidate lots
        const oldLotIds = candidateLots.map(l => l.id);
        const { error: closeErr } = await supabaseAdmin
            .from('investment_lots')
            .update({
                status: 'CLOSED',
                notes: `Consolidado em ${dateFormatted}`
            })
            .in('id', oldLotIds);

        if (closeErr) throw closeErr;

        // Find active rule version for the new consolidated lot
        let targetVersionId = candidateLots[0]?.product_rule_version_id;
        if (!targetVersionId) {
            targetVersionId = ruleVersions?.[0]?.id || '55555555-5555-5555-5555-555555555555';
        }

        const userId = '00000000-0000-0000-0000-000000000000';
        const isOnlyAdjust = candidateLots.every(l => l.notes && l.notes.toLowerCase().includes('ajuste'));
        const noteText = isOnlyAdjust 
            ? `Ajuste Consolidado em ${dateFormatted}`
            : `Lote Consolidado em ${dateFormatted} (${candidateLots.length} lotes unificados)`;

        // Insert new consolidated lot
        const { data: newLot, error: insErr } = await supabaseAdmin
            .from('investment_lots')
            .insert({
                user_id: userId,
                product_rule_version_id: targetVersionId,
                deposit_date: nowIso,
                initial_principal: totalNetBalance,
                current_balance: totalNetBalance,
                status: 'ACTIVE',
                notes: noteText
            })
            .select()
            .single();

        if (insErr) throw insErr;

        return NextResponse.json({
            success: true,
            consolidated_balance: totalNetBalance,
            closed_count: candidateLots.length,
            is_only_adjustments: isOnlyAdjust,
            new_lot: newLot
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
