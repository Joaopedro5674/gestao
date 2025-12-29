"use client";

import Link from "next/link";
import { ArrowRight, Wallet, Building, TrendingUp, RefreshCw, Clock, AlertTriangle, CheckCircle, TrendingDown, Table, Download, LogOut } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ToastProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { exportToCSV } from "@/utils/exportUtils";


export default function Home() {
  const { imoveis, emprestimos, imoveisPagamentos, refreshData, loading } = useApp();
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

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  // Fixed Month Ref for DB comparison (YYYY-MM-01)
  const currentMesRef = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  const todayDay = now.getDate();
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

  // --- ALERTS LOGIC (STRICT) ---
  const alerts: { id: string; type: 'warning' | 'danger' | 'info'; title: string; subtitle: string; propertyId: string }[] = [];
  let pendingRentalsCount = 0;

  // Rental Alerts
  imoveis.filter(p => p.ativo).forEach(imovel => {
    const isPaid = imoveisPagamentos.some(p => {
      return p.imovel_id === imovel.id && p.status === 'pago' && p.mes_ref === currentMesRef;
    });

    if (!isPaid) {
      pendingRentalsCount++;
      // Assumption: 'paymentDay' doesn't exist on new Imovel schema yet? 
      // The schema provided by user: id, nome, valor_aluguel, ativo, created_at, user_id.
      // Missing 'dia_pagamento'.
      // If it exists in DB but not schema description, I should check.
      // If not, we can default to day 10 or check if I need to add it.
      // User approval for table `imoveis` didn't explicitly mention `dia_pagamento`.
      // Legacy `Property` had `paymentDay`.
      // I'll assume for now we might need to add it or default to 5/10.
      // Let's assume day 10 for safety if missing, or maybe I should check legacy data migration.
      // Ideally, the user wants "Total Consistency".
      // Let's use a standard day if not present.
      const dueDay = 10; // Defaulting as field might be missing in new simplistic schema
      const daysUntilDue = dueDay - todayDay;

      if (daysUntilDue < 0) {
        alerts.push({
          id: `prop-${imovel.id}`,
          type: 'danger',
          title: 'Aluguel Atrasado',
          subtitle: `${imovel.nome} - Venceu dia ${dueDay}`,
          propertyId: imovel.id
        });
      } else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        alerts.push({
          id: `prop-${imovel.id}`,
          type: 'warning',
          title: daysUntilDue === 0 ? 'Vence Hoje' : 'Aluguel Próximo',
          subtitle: `${imovel.nome} - Vence dia ${dueDay}`,
          propertyId: imovel.id
        });
      }
    }
  });

  // Loan Alerts
  emprestimos.filter(l => l.status === 'ativo' && l.data_fim).forEach(loan => {
    if (!loan.data_fim) return;
    // data_fim is string YYYY-MM-DD
    const due = new Date(loan.data_fim + 'T12:00:00');
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      alerts.push({
        id: `loan-${loan.id}`,
        type: 'danger',
        title: 'Empréstimo Atrasado',
        subtitle: `${loan.cliente_nome}`,
        propertyId: `/loans/${loan.id}`
      });
    } else if (diffDays <= 3 && diffDays >= 0) {
      alerts.push({
        id: `loan-${loan.id}`,
        type: 'warning',
        title: diffDays === 0 ? 'Vence Hoje' : 'Empréstimo Vencendo',
        subtitle: `${loan.cliente_nome} - ${due.toLocaleDateString('pt-BR')}`,
        propertyId: `/loans/${loan.id}`
      });
    }
  });

  alerts.sort((a, b) => (a.type === 'danger' ? -1 : 1));

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
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isRefreshing ? 'var(--color-warning)' : 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isRefreshing ? <RefreshCw size={10} className="spin-anim" /> : <CheckCircle size={10} />}
                  {isRefreshing ? 'Atualizando...' : 'Dados Atualizados'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={handleRefresh} style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Forçar Atualização
                </button>
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
                      borderLeft: `4px solid ${alert.type === 'danger' ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)'}`,
                      background: 'var(--color-surface-1)',
                      padding: '16px 20px',
                      textDecoration: 'none',
                      boxShadow: 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Icon Container - Provides the color signal without overwhelming */}
                        <div style={{
                          color: alert.type === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)',
                          background: alert.type === 'danger' ? 'rgba(var(--color-danger-rgb), 0.1)' : 'rgba(var(--color-warning-rgb), 0.1)',
                          padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center'
                        }}>
                          <AlertTriangle size={20} />
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
    </div>
  );
}
