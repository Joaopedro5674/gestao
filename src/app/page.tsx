"use client";

import Link from "next/link";
import { ArrowRight, Wallet, Building, RefreshCw, AlertTriangle, CheckCircle, Table, Download, LogOut, ShieldCheck, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { exportToCSV } from "@/utils/exportUtils";
import { supabase } from "@/lib/supabaseClient";
import SystemHealthModal from "@/components/SystemHealthModal";
import SystemStatus from "@/components/SystemStatus";
import LogViewer from "@/components/LogViewer";


export default function Home() {
  // V1.0.1 - Force Deploy for Env Vars
  const { imoveis, emprestimos, imoveisPagamentos, emprestimosMeses, refreshData, loading } = useApp();
  const { showToast } = useToast();
  const { signOut } = useAuth(); // Auth Hook

  // --- STRICT DATA INTEGRITY & CALCULATION HOOK ---
  const { dashboard, spreadsheet } = useFinancialData();
  const {
    rentalRevenue,
    rentalNetProfit,
    totalLoanInterestReceived, // Legacy Field (Juros Recebidos Mês)
  } = dashboard;

  // Local state for time and formatting
  // Hydration fix: Start with null/undefined, set in useEffect
  const [now, setNow] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);

  // Health Check State
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthData, setHealthData] = useState<{
    supabase: boolean;
    lastHeartbeat: string | null;
    isHealthy: boolean;
    checkedAt: string;
  } | null>(null);

  useEffect(() => {
    setNow(new Date()); // Initial Client Set
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setNow(new Date());
      setIsRefreshing(false);
      showToast("Painel atualizado e recalculado", "success");
    }, 500);
  };

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    setIsHealthModalOpen(true);

    try {
      // 1. Test Supabase Connection (Read-only) & Check Cron Logs
      const { data, error } = await supabase
        .from('cron_logs')
        .select('executed_at')
        .eq('type', 'anti_hibernation') // Focus on anti-hibernation events
        .order('executed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const supabaseConnected = !error;
      const lastHeartbeat = data?.executed_at || null;

      // 2. Determine Health
      // Healthy if connected AND heartbeat is < 26 hours old (buffer over 24h)
      let isHealthy = supabaseConnected && !!lastHeartbeat;
      if (lastHeartbeat) {
        const diff = Date.now() - new Date(lastHeartbeat).getTime();
        if (diff > 26 * 60 * 60 * 1000) isHealthy = false;
      }

      setHealthData({
        supabase: supabaseConnected,
        lastHeartbeat,
        isHealthy,
        checkedAt: new Date().toISOString()
      });

    } catch (err) {
      console.error("Health check failed:", err);
      setHealthData({
        supabase: false,
        lastHeartbeat: null,
        isHealthy: false,
        checkedAt: new Date().toISOString()
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Fixed Month Ref for DB comparison (YYYY-MM-01)

  if (!now) return null; // Avoid hydration mismatch by waiting for client mount

  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // EXPORT HANDLER
  const handleExportDashboard = () => {
    const formattedDate = now.toISOString().split('T')[0].split('-').reverse().join('-');
    const formattedTime = now.toTimeString().split(' ')[0].replace(/:/g, '-').substring(0, 5);
    const filename = `financeiro_${formattedDate}_${formattedTime}.csv`;

    exportToCSV(spreadsheet.rentals, filename);
    showToast("Download da planilha iniciado", "success");
  };

  // --- ALERTS LOGIC (REFINED - STRICT SEPARATION) ---
  const alerts: { id: string; type: 'warning' | 'danger' | 'info'; title: string; subtitle: string; propertyId: string; sortScore: number }[] = [];
  let pendingRentalsCount = 0;

  // 1. Time References (Brazil UTC-3)
  const brOffset = -3;
  const nowBr = new Date(new Date().getTime() + (brOffset * 60 * 60 * 1000) + (new Date().getTimezoneOffset() * 60 * 1000));
  const todayDay = nowBr.getDate();
  const currentMonthNum = nowBr.getMonth();
  const currentYearNum = nowBr.getFullYear();

  // Format YYYY-MM for matching mes_referencia (Supabase Type)
  const currentYm = `${currentYearNum}-${String(currentMonthNum + 1).padStart(2, '0')}`;

  // 2. RENTAL ALERTS
  imoveis.filter(p => p.ativo).forEach(imovel => {
    const dueDay = imovel.dia_pagamento || 10;

    // A) PAST OVERDUE (Explicit records)
    const pastOverdue = imoveisPagamentos.filter(p => {
      return p.imovel_id === imovel.id &&
        p.status !== 'pago' &&
        p.mes_referencia < currentYm; // Correct property and comparison
    });

    pastOverdue.forEach(debt => {
      const [y, m] = debt.mes_referencia.split('-').map(Number);
      const debtDueDate = new Date(y, m - 1, dueDay);

      alerts.push({
        id: `overdue-${debt.id}`,
        type: 'danger',
        title: 'ATRASADO',
        subtitle: `${imovel.cliente_nome || imovel.nome} - Venceu em ${debtDueDate.toLocaleDateString('pt-BR')}`,
        propertyId: imovel.id,
        sortScore: 100
      });
    });

    // B) CURRENT MONTH (Status Check)
    const isPaidCurrent = imoveisPagamentos.some(p => p.imovel_id === imovel.id && p.mes_referencia === currentYm && p.status === 'pago');

    if (!isPaidCurrent) {
      pendingRentalsCount++;
      const currentDueDate = new Date(currentYearNum, currentMonthNum, dueDay, 12, 0, 0);
      const diffTime = currentDueDate.getTime() - nowBr.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue (Current Month)
        alerts.push({
          id: `prop-cur-overdue-${imovel.id}`,
          type: 'danger',
          title: 'ATRASADO',
          subtitle: `${imovel.cliente_nome || imovel.nome} - Venceu em ${currentDueDate.toLocaleDateString('pt-BR')}`,
          propertyId: imovel.id,
          sortScore: 99
        });
      } else if (diffDays <= 3) {
        // Near Due
        const daysLabel = diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`;
        alerts.push({
          id: `prop-cur-near-${imovel.id}`,
          type: 'warning',
          title: 'PRÓXIMO DO VENCIMENTO',
          subtitle: `${imovel.cliente_nome || imovel.nome} - Vence ${daysLabel} (${currentDueDate.toLocaleDateString('pt-BR')})`,
          propertyId: imovel.id,
          sortScore: 80
        });
      }
      // REMOVED: "PENDENTE" alert (User Request: Remove unnecessary attention items)
    } else {
      // Lookahead
      const nextMonthDate = new Date(currentYearNum, currentMonthNum + 1, 1);
      const nextDueDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), dueDay);
      const diffNext = Math.ceil((nextDueDate.getTime() - nowBr.getTime()) / (1000 * 60 * 60 * 24));

      if (diffNext >= 0 && diffNext <= 3) {
        alerts.push({
          id: `prop-next-near-${imovel.id}`,
          type: 'warning',
          title: 'PRÓXIMO DO VENCIMENTO',
          subtitle: `${imovel.cliente_nome || imovel.nome} - Vence em ${nextDueDate.toLocaleDateString('pt-BR')}`,
          propertyId: imovel.id,
          sortScore: 80
        });
      }
    }
  });

  // 3. LOAN ALERTS
  emprestimos.filter(l => l.status === 'ativo').forEach(loan => {
    // Main Loan Expiry
    if (loan.data_fim) {
      const due = new Date(loan.data_fim + 'T12:00:00');
      due.setHours(0, 0, 0, 0);
      const today = new Date(nowBr); today.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        alerts.push({
          id: `loan-over-${loan.id}`,
          type: 'danger',
          title: 'EMPRÉSTIMO ATRASADO',
          subtitle: `${loan.cliente_nome}`,
          propertyId: `/loans/${loan.id}`,
          sortScore: 95
        });
      } else if (diffDays <= 3) {
        alerts.push({
          id: `loan-warn-${loan.id}`,
          type: 'warning',
          title: 'EMPRÉSTIMO VENCENDO',
          subtitle: `${loan.cliente_nome} - Vence em ${due.toLocaleDateString('pt-BR')}`,
          propertyId: `/loans/${loan.id}`,
          sortScore: 85
        });
      }
    }

    // Monthly Interest (Model 2)
    if (loan.cobranca_mensal && emprestimosMeses) {
      const startDate = new Date(loan.data_inicio + 'T12:00:00');

      // Filter unpaid months for this loan and sort by reference to be safe
      const loanMonths = emprestimosMeses
        .filter(m => m.emprestimo_id === loan.id && !m.pago)
        .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));

      loanMonths.forEach(mes => {
        // 1. Determine Index (1-based)
        // Logic: Calculate difference in months from StartDate to mes.mes_referencia
        const [refYear, refMonth] = mes.mes_referencia.split('-').map(Number);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1; // 0-11 to 1-12

        // Example: Start 2026-01. Ref 2026-02. Index = 1.
        // Example: Start 2026-01. Ref 2026-01. Index = 0.
        // Rule: "Parcela 1 -> vence em 04/02". (Start + 30 days).
        // If RefYear/Month matches Start, it's typically "Month 0" or pro-rata, but assuming 
        // the standard flow generates the *following* months as installments.
        // However, if we simply calculate strict offset:
        const monthDiff = ((refYear - startYear) * 12) + (refMonth - startMonth);

        // If monthDiff is 0 (same month), usually it's not the first "30 day" installment unless it's immediate.
        // But usually first installment is monthDiff=1.
        // Let's assume the "Index" aligns with monthDiff. 
        // If generated list includes Start Month, treat it as Index 0? 
        // Prompt says: "Parcela 1 -> Vence...". Implicitly Parcela 1 is the first *payable* item.
        // If `monthDiff <= 0`, we treat it as Index 0 (Base) or 1?
        // Let's use `monthDiff` as the multiplier usually.
        // But if `monthDiff` is 0, +0 days = Start Date. 
        // If `monthDiff` is 1, +30 days.
        // Ref: "Jan 5 Start. Feb 4 Due." -> Feb is MonthDiff 1. (Start+30).
        // Ref: "Jan 5 Start. Mar 6 Due." -> Mar is MonthDiff 2. (Start+60).
        // Correct.

        // Exception: If the system generated a record for the *same* month (Jan), 
        // monthDiff=0. Due=Start. Overdue immediately? 
        // If user wants strict 30 days for everything, we use monthDiff.
        // If monthDiff < 1, maybe force at least 1? Or adhere to logic?
        // Adhere to logic: Index = monthDiff. (If monthDiff < 0 loops shouldn't happen).
        const multiplier = Math.max(0, monthDiff + 1);

        // 2. Calculate Strict Due Date
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (30 * multiplier));

        // Just for display logic
        const dateObj = new Date(refYear, refMonth - 1, 1);
        const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        // 3. Compare with Today (nowBr)
        // Reset hours for fair date comparison
        const dueCheck = new Date(dueDate); dueCheck.setHours(0, 0, 0, 0);
        const todayCheck = new Date(nowBr); todayCheck.setHours(0, 0, 0, 0);

        const diffTime = dueCheck.getTime() - todayCheck.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 4. Alert Logic
        // "Atenção Necessária apenas quando: data_atual >= data_vencimento_parcela - 3 dias"
        // i.e. diffDays <= 3.

        if (diffDays < 0) {
          // Overdue
          alerts.push({
            id: `loan-month-over-${mes.id}`,
            type: 'danger',
            title: 'JUROS ATRASADOS',
            subtitle: `${loan.cliente_nome} - ${capitalizedMonth} - Venceu ${dueCheck.toLocaleDateString('pt-BR')}`,
            propertyId: `/loans/${loan.id}`,
            sortScore: 90
          });
        } else if (diffDays <= 3) {
          // Warning (Near Due)
          const daysLabel = diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`;
          alerts.push({
            id: `loan-month-near-${mes.id}`,
            type: 'warning',
            title: 'JUROS PRÓXIMOS',
            subtitle: `${loan.cliente_nome} - ${capitalizedMonth} - Vence ${daysLabel} (${dueCheck.toLocaleDateString('pt-BR')})`,
            propertyId: `/loans/${loan.id}`,
            sortScore: 88
          });
        }
        // Else: > 3 days. Do not show alert. (Matches "Parcela dentro do prazo -> sem alerta")
      });
    }
  });

  // Sort: Danger > Warning > Info
  alerts.sort((a, b) => b.sortScore - a.sortScore);

  // LEGACY CALC: Total Net Profit = Rental Net + Loan Interest Received
  const totalNetProfit = (rentalNetProfit || 0) + (totalLoanInterestReceived || 0);

  return (
    <div className="container" key={refreshKey} style={{ maxWidth: '800px', margin: '0 auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>Carregando...</div>
      ) : (
        <>
          {/* HEADER: Context & Verification */}
          {/* HEADER: STRICT VISUAL REORGANIZATION */}
          <header style={{ marginBottom: 'var(--space-xl)' }}>

            {/* BLOCK 1: IDENTITY */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 'bold',
                color: 'var(--color-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(var(--color-primary-rgb), 0.1)',
                padding: '4px 8px',
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                <CheckCircle size={10} /> App Financeiro Pessoal
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' }}>Dashboard</div>
            </div>

            {/* BLOCK 2: DATE & STATUS (Responsive Row) */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {monthName} • {timeStr}
              </span>
              <span style={{ opacity: 0.3 }}>|</span>
              <SystemStatus />
            </div>

            {/* BLOCK 3: SYSTEM STATE BADGE */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: isRefreshing ? 'var(--color-warning)' : 'var(--color-success)',
                background: isRefreshing ? 'rgba(var(--color-warning-rgb), 0.1)' : 'rgba(var(--color-success-rgb), 0.1)',
                padding: '6px 12px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {isRefreshing ? <RefreshCw size={12} className="spin-anim" /> : <CheckCircle size={12} />}
                {isRefreshing ? 'Atualizando...' : 'Dados Atualizados'}
              </span>
            </div>

            {/* BLOCK 4: ACTIONS (Responsive Grid: 2x2 Mobile, Row Desktop) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px'
            }}>
              <button onClick={handleCheckHealth} style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-primary)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500'
              }}>
                <ShieldCheck size={16} color="var(--color-primary)" /> Verificar Sistema
              </button>

              <button onClick={() => setIsLogViewerOpen(true)} style={{
                fontSize: '0.85rem',
                color: 'var(--color-text-primary)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500'
              }}>
                <Table size={16} /> Logs
              </button>

              <button onClick={handleRefresh} style={{
                fontSize: '0.85rem',
                color: 'var(--color-primary)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-primary)',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500'
              }}>
                <RefreshCw size={16} /> Forçar Atualização
              </button>

              <button onClick={signOut} style={{
                fontSize: '0.85rem',
                color: 'var(--color-danger)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500'
              }}>
                <LogOut size={16} /> Sair
              </button>
            </div>
          </header>

          {/* MAIN INDICATOR */}
          <div className="card" style={{ background: 'var(--color-primary)', color: 'white', marginBottom: 'var(--space-xl)', textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px', textTransform: 'uppercase' }}>Lucro Líquido Geral Estimado</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalNetProfit)}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px' }}>
              Considerando aluguéis e juros contratados
            </div>
          </div>


          {/* --- BLOCK 1: ALUGUÉIS --- */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                <Building size={20} color="var(--color-primary)" /> Imóveis
              </h2>
              <Link href="/properties" style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>Gerenciar</Link>
            </div>

            <Link href="/properties" className="card" style={{ display: 'block', borderLeft: '4px solid var(--color-primary)', textDecoration: 'none', transition: 'transform 0.1s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Lucro Líquido (Mês)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rentalNetProfit)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>Receita Bruta</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rentalRevenue)}
                  </div>
                </div>
              </div>

              {pendingRentalsCount > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)', color: 'var(--color-warning-dark)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} /> {pendingRentalsCount} aluguéis pendentes este mês
                </div>
              )}
            </Link>
          </section>

          {/* --- BLOCK 2: EMPRÉSTIMOS --- */}
          <section style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                <Wallet size={20} color="var(--color-success)" /> Empréstimos
              </h2>
              <Link href="/loans" style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>Gerenciar</Link>
            </div>

            <Link href="/loans" className="card" style={{ display: 'block', borderLeft: '4px solid var(--color-success)', textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Juros Recebidos (Mês)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLoanInterestReceived || 0)}
                  </div>
                </div>
                {/* Legacy: Pending not shown on main dash in simpler version */}
              </div>
            </Link>
          </section>

          {/* --- QUICK ACTIONS & ALERTS (VISUAL UPDATE: STACKED & NEUTRAL) --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>

            {/* ALERTS SECTION (Conditional) */}
            {alerts.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} /> Atenção Necessária
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alerts.map(alert => (
                    <Link href={alert.propertyId.startsWith('/') ? alert.propertyId : `/properties/${alert.propertyId}`} key={alert.id} className="card" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: '1px solid var(--color-border)',
                      // NEUTRAL/LIGHT BORDER - No heavy red/orange
                      borderLeft: `4px solid ${alert.type === 'danger' ? 'var(--color-danger)' : alert.type === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)'}`,
                      background: 'var(--color-surface-1)',
                      padding: '16px 20px',
                      textDecoration: 'none',
                      boxShadow: 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Icon Container - Provides the color signal without overwhelming */}
                        <div style={{
                          color: alert.type === 'danger' ? 'var(--color-danger)' : alert.type === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)',
                          background: alert.type === 'danger' ? 'rgba(var(--color-danger-rgb), 0.1)' : alert.type === 'warning' ? 'rgba(var(--color-warning-rgb), 0.1)' : 'rgba(var(--color-primary-rgb), 0.1)',
                          padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center'
                        }}>
                          {alert.type === 'info' ? <Info size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>{alert.title}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{alert.subtitle}</div>
                        </div>
                      </div>
                      <ArrowRight size={18} color="var(--color-text-tertiary)" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* QUICK ACTIONS (ALWAYS LARGE, FIXED LAYOUT) */}
            <section>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>Ações Rápidas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Link href="/spreadsheet" className="btn" style={{
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-primary)',
                  flexDirection: 'column',
                  padding: '24px',
                  gap: '12px',
                  height: '100%',
                  justifyContent: 'center',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  minHeight: '120px' // Ensure large fixed target
                }}>
                  <Table size={32} strokeWidth={1.5} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Planilha Geral</span>
                </Link>

                <button onClick={handleExportDashboard} className="btn" style={{
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-primary)',
                  flexDirection: 'column',
                  padding: '24px',
                  gap: '12px',
                  height: '100%',
                  justifyContent: 'center',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  minHeight: '120px' // Ensure large fixed target
                }}>
                  <Download size={32} strokeWidth={1.5} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Exportar CSV</span>
                </button>
              </div>
            </section>
          </div>

        </>
      )}

      <SystemHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        isLoading={isCheckingHealth}
        healthData={healthData}
      />

      {isLogViewerOpen && <LogViewer onClose={() => setIsLogViewerOpen(false)} />}
    </div>
  );
}
