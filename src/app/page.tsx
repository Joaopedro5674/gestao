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
    loanRevenue,
    totalLoanInterestContracted,
  } = dashboard;

  // Local state for time and formatting
  const [now, setNow] = useState(new Date());
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
      // 1. Test Supabase Connection (Read-only)
      const { data, error } = await supabase
        .from('system_health')
        .select('last_ping_at')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      const supabaseConnected = !error;
      const lastHeartbeat = data?.last_ping_at || null;

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
      } else {
        // Pending (Not near due)
        alerts.push({
          id: `prop-cur-pending-${imovel.id}`,
          type: 'info',
          title: 'PENDENTE',
          subtitle: `${imovel.cliente_nome || imovel.nome} - Vence em ${currentDueDate.toLocaleDateString('pt-BR')}`,
          propertyId: imovel.id,
          sortScore: 50
        });
      }
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
      // A) Overdue Interest (Past Months Unpaid)
      emprestimosMeses.forEach(mes => {
        if (mes.emprestimo_id === loan.id && !mes.pago && mes.mes_referencia < currentYm) {
          const [mYear, mMonth] = mes.mes_referencia.split('-');
          const dateObj = new Date(parseInt(mYear), parseInt(mMonth) - 1, 1);
          const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

          alerts.push({
            id: `loan-month-over-${mes.id}`,
            type: 'danger',
            title: 'JUROS ATRASADOS (MENSAL)',
            subtitle: `${loan.cliente_nome} - ${capitalizedMonth}`,
            propertyId: `/loans/${loan.id}`,
            sortScore: 90
          });
        }
      });

      // B) Near Due Interest (Current/Next Month)
      const startDay = new Date(loan.data_inicio + 'T12:00:00').getDate();
      const monthlyDueDate = new Date(currentYearNum, currentMonthNum, startDay, 12, 0, 0);

      const isMonthPaid = emprestimosMeses.some(m =>
        m.emprestimo_id === loan.id &&
        m.mes_referencia === currentYm &&
        m.pago
      );

      if (!isMonthPaid) {
        const diffMonthly = Math.ceil((monthlyDueDate.getTime() - nowBr.getTime()) / (1000 * 60 * 60 * 24));

        if (diffMonthly >= 0 && diffMonthly <= 3) {
          const daysLabel = diffMonthly === 0 ? 'hoje' : diffMonthly === 1 ? 'amanhã' : `em ${diffMonthly} dias`;
          alerts.push({
            id: `loan-month-near-${loan.id}`,
            type: 'warning',
            title: 'JUROS PRÓXIMOS DO VENCIMENTO',
            subtitle: `${loan.cliente_nome} - Vence ${daysLabel} (${monthlyDueDate.toLocaleDateString('pt-BR')})`,
            propertyId: `/loans/${loan.id}`,
            sortScore: 88
          });
        }
      }
    }
  });

  // Sort: Danger > Warning > Info
  alerts.sort((a, b) => b.sortScore - a.sortScore);

  const totalNetProfit = rentalNetProfit + totalLoanInterestContracted;

  return (
    <div className="container" key={refreshKey} style={{ maxWidth: '800px', margin: '0 auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>Carregando...</div>
      ) : (
        <>
          {/* HEADER: Context & Verification */}
          <header style={{
            marginBottom: 'var(--space-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(var(--color-primary-rgb), 0.1)', padding: '4px 8px', borderRadius: '4px', width: 'fit-content', marginBottom: '8px' }}>
                <CheckCircle size={10} /> App Financeiro Pessoal
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Dashboard</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{monthName} • {timeStr}</div>
              <div style={{ marginTop: '8px' }}>
                <SystemStatus />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isRefreshing ? 'var(--color-warning)' : 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isRefreshing ? <RefreshCw size={10} className="spin-anim" /> : <CheckCircle size={10} />}
                  {isRefreshing ? 'Atualizando...' : 'Dados Atualizados'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button onClick={handleCheckHealth} style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} color="var(--color-primary)" /> Verificar Sistema
                  </button>
                  <button onClick={() => setIsLogViewerOpen(true)} style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Table size={12} /> Logs
                  </button>
                  <button onClick={handleRefresh} style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Forçar Atualização
                  </button>
                </div>
                <button onClick={signOut} style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--color-border)', paddingLeft: '12px' }}>
                  <LogOut size={14} /> Sair
                </button>
              </div>
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Lucro Juros (Total Contratado)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLoanInterestContracted)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>Valor a Receber</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loanRevenue)}
                  </div>
                </div>
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
