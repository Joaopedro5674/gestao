"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Plus, Eye, EyeOff, TrendingUp, Landmark, ShieldCheck, Clock, RefreshCw, Layers, Scale, History, Settings, Check, AlertTriangle, ArrowUpRight, DollarSign } from "lucide-react";
import Link from "next/link";

interface BankSummary {
    bank_id: string;
    bank_name: string;
    bank_code: string;
    brand_color: string;
    net_balance: number;
    gross_balance: number;
    daily_yield_net: number;
    lot_count: number;
}

interface LotEvaluatedState {
    lot: {
        id: string;
        deposit_date: string;
        initial_principal: number;
        current_balance: number;
        status: string;
        notes?: string;
        rule_version?: {
            indexer_percentage: number;
            tier_cap_limit?: number;
            product?: {
                name: string;
                bank?: {
                    name: string;
                    brand_color: string;
                };
            };
        };
    };
    calendarDays: number;
    businessDays: number;
    grossBalance: number;
    totalGrossYield: number;
    iofAmount: number;
    iofRatePercent: number;
    irAmount: number;
    irRatePercent: number;
    netBalance: number;
    totalNetYield: number;
    dailyYieldGross: number;
    dailyYieldNet: number;
}

export default function CapitalPage() {
    const [loading, setLoading] = useState(true);
    const [showValues, setShowValues] = useState(true);
    const [activeTab, setActiveTab] = useState<'lotes' | 'conciliacao' | 'timemachine' | 'regras'>('lotes');

    const [cdiRate, setCdiRate] = useState(14.15);
    const [cdiSyncDate, setCdiSyncDate] = useState('');
    const [cdiSource, setCdiSource] = useState('Banco Central do Brasil (SGS 12)');
    const [summary, setSummary] = useState({
        total_net_balance: 0,
        total_gross_balance: 0,
        total_daily_yield_net: 0,
        total_monthly_yield_net: 0,
        total_iof_accumulated: 0,
        total_ir_accumulated: 0,
        active_lots_count: 0
    });

    const [banks, setBanks] = useState<BankSummary[]>([]);
    const [lots, setLots] = useState<LotEvaluatedState[]>([]);
    const [allProductsList, setAllProductsList] = useState<any[]>([]);

    // Modal Aporte
    const [isAporteModalOpen, setIsAporteModalOpen] = useState(false);
    const [aporteForm, setAporteForm] = useState({
        bankId: '',
        productId: '',
        productRuleVersionId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Form Novo Banco
    const [newBankForm, setNewBankForm] = useState({
        name: '',
        code: '',
        brand_color: '#820ad1'
    });

    // Form Novo Produto
    const [newProductForm, setNewProductForm] = useState({
        bank_id: '',
        name: '',
        indexer_percentage: '120',
        tier_cap_limit: '10000',
        tier_secondary_percentage: '100',
        tax_type: 'STANDARD'
    });

    // Conciliação State
    const [selectedConciliateBank, setSelectedConciliateBank] = useState<BankSummary | null>(null);
    const [userAppBalanceInput, setUserAppBalanceInput] = useState('');
    const [conciliateResult, setConciliateResult] = useState<any>(null);

    // Time Machine State
    const [replayDate, setReplayDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/capital/summary');
            if (res.ok) {
                const data = await res.json();
                setCdiRate(data.cdi_annual_rate);
                setSummary(data.summary);
                setBanks(data.banks);
                setLots(data.lots);
            }

            const rulesRes = await fetch('/api/capital/rules');
            if (rulesRes.ok) {
                const rulesData = await rulesRes.json();
                const combined = (rulesData.products || []).map((p: any) => {
                    const v = (rulesData.versions || []).find((ver: any) => ver.product_id === p.id);
                    return { ...p, version: v };
                });
                setAllProductsList(combined);
            }

            const conciliateRes = await fetch('/api/capital/conciliate');
            if (conciliateRes.ok) {
                const concData = await conciliateRes.json();
                setConciliationHistory(concData.metrics || []);
            }
        } catch (err) {
            console.error("Erro ao carregar dados do Módulo CAPITAL:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const [editingBank, setEditingBank] = useState<{ bank_id: string; bank_name: string; brand_color: string } | null>(null);

    const handleCreateBankSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBankForm.name) return;

        try {
            const res = await fetch('/api/capital/banks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newBankForm.name,
                    brand_color: newBankForm.brand_color
                })
            });

            if (res.ok) {
                setNewBankForm({ name: '', code: '', brand_color: '#820ad1' });
                fetchData();
            } else {
                const errData = await res.json();
                alert(`Erro ao cadastrar banco: ${errData.error}`);
            }
        } catch (err) {
            console.error("Erro ao criar banco:", err);
        }
    };

    const handleEditBankSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBank) return;

        try {
            const res = await fetch('/api/capital/banks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingBank.bank_id,
                    name: editingBank.bank_name,
                    brand_color: editingBank.brand_color
                })
            });

            if (res.ok) {
                setEditingBank(null);
                fetchData();
            } else {
                const errData = await res.json();
                alert(`Erro ao editar banco: ${errData.error}`);
            }
        } catch (err) {
            console.error("Erro ao editar banco:", err);
        }
    };

    const handleDeleteBank = async (bankId: string, bankName: string) => {
        if (!confirm(`Tem certeza que deseja excluir o banco "${bankName}"?`)) return;

        try {
            const res = await fetch(`/api/capital/banks?id=${bankId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchData();
            } else {
                const errData = await res.json();
                alert(`Erro ao excluir banco: ${errData.error}`);
            }
        } catch (err) {
            console.error("Erro ao excluir banco:", err);
        }
    };

    const handleDeleteLot = async (lotId: string) => {
        if (!confirm('Tem certeza que deseja excluir este lote de investimento?')) return;
        try {
            const res = await fetch(`/api/capital/lots?id=${lotId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            } else {
                const errData = await res.json();
                alert(`Erro ao excluir lote: ${errData.error}`);
            }
        } catch (err) {
            console.error("Erro ao excluir lote:", err);
        }
    };

    const handleCreateProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProductForm.bank_id || !newProductForm.name) {
            alert('Por favor, selecione uma instituição e preencha o nome do produto.');
            return;
        }

        try {
            const res = await fetch('/api/capital/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProductForm)
            });

            if (res.ok) {
                setNewProductForm({ bank_id: '', name: '', indexer_percentage: '120', tier_cap_limit: '10000', tier_secondary_percentage: '100', tax_type: 'STANDARD' });
                fetchData();
                alert('✅ Produto de investimento cadastrado com sucesso!');
            } else {
                const errData = await res.json();
                alert(`Erro ao cadastrar produto: ${errData.error}`);
            }
        } catch (err) {
            console.error("Erro ao criar produto:", err);
            alert(`Erro ao criar produto: ${err}`);
        }
    };

    const formatBRL = (val: number) => {
        if (!showValues) return '••••••••';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const [conciliationHistory, setConciliationHistory] = useState<any[]>([]);

    const parseCurrencyInput = (valStr: string): number => {
        if (!valStr) return 0;
        let clean = valStr.trim();
        if (clean.includes(',')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        }
        return parseFloat(clean) || 0;
    };

    const handleCreateAporte = async (e: React.FormEvent) => {
        e.preventDefault();
        const principal = parseCurrencyInput(aporteForm.amount);
        if (isNaN(principal) || principal <= 0) return;

        // Default rule version IDs
        const versionId = aporteForm.productRuleVersionId || (
            aporteForm.productId === 'MERCADOPAGO_CONTA_105CDI' 
                ? '66666666-6666-6666-6666-666666666666' 
                : '55555555-5555-5555-5555-555555555555'
        );

        try {
            const res = await fetch('/api/capital/lots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_rule_version_id: versionId,
                    deposit_date: aporteForm.date,
                    initial_principal: principal,
                    notes: aporteForm.notes
                })
            });

            if (res.ok) {
                setIsAporteModalOpen(false);
                setAporteForm({ bankId: '', productId: '', productRuleVersionId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
                fetchData();
            }
        } catch (err) {
            console.error("Erro ao criar aporte:", err);
        }
    };

    const handleConciliateCheck = async () => {
        if (!selectedConciliateBank || !userAppBalanceInput) return;
        const userVal = parseCurrencyInput(userAppBalanceInput);

        try {
            const res = await fetch('/api/capital/conciliate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bank_id: selectedConciliateBank.bank_id,
                    user_reported_balance: userVal,
                    engine_calculated_balance: selectedConciliateBank.net_balance,
                    adjustment_notes: `Conciliação manual efetuada em ${new Date().toLocaleDateString('pt-BR')}`
                })
            });

            if (res.ok) {
                const data = await res.json();
                setConciliateResult(data.audit);
                fetchData();
            }
        } catch (err) {
            console.error("Erro ao conciliar:", err);
        }
    };

    const handleAutoAdjustConciliation = async () => {
        if (!selectedConciliateBank || !userAppBalanceInput) return;
        const userVal = parseCurrencyInput(userAppBalanceInput);

        try {
            const res = await fetch('/api/capital/conciliate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bank_id: selectedConciliateBank.bank_id,
                    user_reported_balance: userVal,
                    engine_calculated_balance: selectedConciliateBank.net_balance,
                    auto_adjust: true
                })
            });

            if (res.ok) {
                const data = await res.json();
                setConciliateResult(data.audit);
                fetchData();
                alert(`✨ Ajuste de conciliação registrado com sucesso!`);
            }
        } catch (err) {
            console.error("Erro ao conciliar:", err);
        }
    };

    const [replayResult, setReplayResult] = useState<any>(null);
    const [replayLoading, setReplayLoading] = useState(false);

    const handleFetchReplay = async () => {
        if (!replayDate) return;
        setReplayLoading(true);
        try {
            const res = await fetch(`/api/capital/summary?date=${replayDate}`);
            if (res.ok) {
                const data = await res.json();
                setReplayResult(data);
            }
        } catch (err) {
            console.error("Erro no replay:", err);
        } finally {
            setReplayLoading(false);
        }
    };

    return (
        <main style={{ minHeight: '100vh', background: 'var(--color-background)', padding: 'var(--space-md) 0' }}>
            <div className="container" style={{ maxWidth: '1050px' }}>
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Link href="/" style={{ padding: '8px', marginLeft: '-8px', color: 'var(--color-text-secondary)' }}>
                            <ChevronLeft size={24} />
                        </Link>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Core Banking — Capital</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                    🟢 CDI Oficial Banco Central: {cdiRate.toFixed(2)}% a.a.
                                </span>
                                <button
                                    onClick={fetchData}
                                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}
                                    title="Sincronizar com a API oficial do Banco Central do Brasil"
                                >
                                    🔄 Sincronizar BCB
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowValues(!showValues)}
                            className="btn"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '10px' }}
                            title={showValues ? 'Ocultar Valores' : 'Mostrar Valores'}
                        >
                            {showValues ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                            onClick={() => setIsAporteModalOpen(true)}
                            className="btn btn-primary"
                            style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Plus size={18} /> Novo Aporte
                        </button>
                    </div>
                </header>

                {/* HERO CARD PATRIMÔNIO */}
                <section className="card shadow-sm" style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                    color: 'white', padding: '24px', borderRadius: '16px', marginBottom: 'var(--space-lg)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, fontWeight: 700 }}>
                        Patrimônio Total Consolidado
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, margin: '8px 0 16px 0', letterSpacing: '-0.02em' }}>
                        {formatBRL(summary.total_net_balance)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block' }}>Rendimento Hoje (Líquido)</span>
                            <strong style={{ fontSize: '1.1rem', color: '#4ade80' }}>+{formatBRL(summary.total_daily_yield_net)}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block' }}>Lucro Acumulado</span>
                            <strong style={{ fontSize: '1.1rem', color: '#60a5fa' }}>+{formatBRL(summary.total_monthly_yield_net)}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block' }}>IOF Retido</span>
                            <strong style={{ fontSize: '1rem', color: '#fca5a5' }}>{formatBRL(summary.total_iof_accumulated)}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block' }}>IR Provisório</span>
                            <strong style={{ fontSize: '1rem', color: '#fcd34d' }}>{formatBRL(summary.total_ir_accumulated)}</strong>
                        </div>
                    </div>
                </section>

                {/* CARDS DE INSTITUIÇÕES */}
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: 'var(--space-xl)' }}>
                    {banks.map((b) => (
                        <div key={b.bank_id} className="card hover-primary" style={{ padding: '20px', borderLeft: `5px solid ${b.brand_color}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{b.bank_name}</span>
                                <span style={{ fontSize: '0.7rem', background: 'var(--color-surface-2)', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                    {b.lot_count} lote(s)
                                </span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                                {formatBRL(b.net_balance)}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                <span>Hoje: <strong style={{ color: 'var(--color-success)' }}>+{formatBRL(b.daily_yield_net)}</strong></span>
                                <button
                                    onClick={() => {
                                        setSelectedConciliateBank(b);
                                        setActiveTab('conciliacao');
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                    Conciliar →
                                </button>
                            </div>
                        </div>
                    ))}
                </section>

                {/* ABAS NAVEGAÇÃO */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
                    <button
                        onClick={() => setActiveTab('lotes')}
                        style={{
                            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.9rem',
                            color: activeTab === 'lotes' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: activeTab === 'lotes' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Layers size={16} /> Extrato por Lotes ({lots.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('conciliacao')}
                        style={{
                            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.9rem',
                            color: activeTab === 'conciliacao' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: activeTab === 'conciliacao' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Scale size={16} /> Conciliação & Divergências
                    </button>
                    <button
                        onClick={() => setActiveTab('timemachine')}
                        style={{
                            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.9rem',
                            color: activeTab === 'timemachine' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: activeTab === 'timemachine' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <History size={16} /> Máquina do Tempo (Replay)
                    </button>
                    <button
                        onClick={() => setActiveTab('regras')}
                        style={{
                            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.9rem',
                            color: activeTab === 'regras' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderBottom: activeTab === 'regras' ? '2px solid var(--color-primary)' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Settings size={16} /> Regras & Produtos
                    </button>
                </div>

                {/* ABA 1: LOTES INDEPENDENTES */}
                {activeTab === 'lotes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {lots.map((s) => (
                            <div key={s.lot.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 800, fontSize: '1rem' }}>
                                            {s.lot.rule_version?.product?.bank?.name || 'Banco'} — {s.lot.rule_version?.product?.name || 'Produto'}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, color: 'var(--color-primary)' }}>
                                            {s.lot.rule_version?.indexer_percentage}% CDI
                                        </span>
                                        {s.lot.rule_version?.tier_cap_limit && (
                                            <span style={{ fontSize: '0.7rem', background: 'rgba(130, 10, 209, 0.15)', color: '#a855f7', border: '1px solid rgba(130, 10, 209, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                🔮 Faixa Limitada (até R$ {s.lot.rule_version.tier_cap_limit.toLocaleString('pt-BR')})
                                            </span>
                                        )}
                                        {s.iofRatePercent === 0 && (
                                            <span style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                🛡️ Isento de IOF
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                        Aporte: {new Date(s.lot.deposit_date).toLocaleDateString('pt-BR')} ({s.calendarDays} dias corridos / {s.businessDays} dias úteis)
                                    </div>
                                    {s.lot.notes && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                            💬 {s.lot.notes}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'block' }}>IOF / IR</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                            IOF: {s.iofRatePercent.toFixed(0)}% ({formatBRL(s.iofAmount)}) | IR: {s.irRatePercent.toFixed(1)}% ({formatBRL(s.irAmount)})
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'block' }}>Saldo Líquido</span>
                                        <strong style={{ fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                            {formatBRL(s.netBalance)}
                                        </strong>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteLot(s.lot.id)}
                                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                        title="Excluir Aporte"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ABA 2: CONCILIAÇÃO BANCÁRIA */}
                {activeTab === 'conciliacao' && (
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>Validador de Precisão & Divergência em Centavos</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                            Compare o saldo exibido no aplicativo do seu banco com o saldo calculado pelo nosso Core Banking Engine para identificar eventuais divergências em centavos.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label className="label">Selecione a Instituição</label>
                                <select
                                    className="input"
                                    value={selectedConciliateBank?.bank_id || ''}
                                    onChange={(e) => {
                                        const b = banks.find(x => x.bank_id === e.target.value) || null;
                                        setSelectedConciliateBank(b);
                                    }}
                                >
                                    <option value="">Selecione o banco</option>
                                    {banks.map(b => (
                                        <option key={b.bank_id} value={b.bank_id}>{b.bank_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Saldo no App do Banco (R$)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Ex: 100.012,50"
                                    value={userAppBalanceInput}
                                    onChange={(e) => setUserAppBalanceInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleConciliateCheck}
                            className="btn btn-primary"
                            disabled={!selectedConciliateBank || !userAppBalanceInput}
                            style={{ fontWeight: 700 }}
                        >
                            Auditar Divergência
                        </button>

                        {conciliateResult && (
                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {conciliateResult.status === 'MATCH' ? (
                                            <Check size={20} color="var(--color-success)" />
                                        ) : (
                                            <AlertTriangle size={20} color="var(--color-danger)" />
                                        )}
                                        <strong style={{ fontSize: '1rem' }}>{conciliateResult.message}</strong>
                                    </div>
                                    {conciliateResult.status !== 'MATCH' && (
                                        <button
                                            onClick={handleAutoAdjustConciliation}
                                            className="btn btn-primary"
                                            style={{ fontSize: '0.8rem', padding: '6px 12px', fontWeight: 700 }}
                                        >
                                            ✨ Registar Ajuste Automático
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                    Saldo Reportado: <strong>{formatBRL(conciliateResult.userReported)}</strong> | Saldo Motor: <strong>{formatBRL(conciliateResult.calculated)}</strong>
                                </div>
                            </div>
                        )}

                        {/* HISTÓRICO DE AUDITORIAS */}
                        {conciliationHistory.length > 0 && (
                            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>📋 Histórico de Conciliações & Auditorias</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {conciliationHistory.map((m: any) => (
                                        <div key={m.id} style={{
                                            padding: '12px 16px', background: 'var(--color-surface-1)', borderRadius: '8px',
                                            border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                                        }}>
                                            <div>
                                                <strong style={{ fontSize: '0.9rem' }}>{m.bank?.name || 'Banco'}</strong>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: '10px' }}>
                                                    {new Date(m.check_date).toLocaleString('pt-BR')}
                                                </span>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                    Reportado: {formatBRL(m.user_reported_balance)} | Motor: {formatBRL(m.engine_calculated_balance)}
                                                </div>
                                            </div>

                                            <div>
                                                <span style={{
                                                    fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 700,
                                                    background: m.status === 'MATCH' ? 'rgba(34, 197, 94, 0.15)' : m.status === 'ADJUSTED' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    color: m.status === 'MATCH' ? '#22c55e' : m.status === 'ADJUSTED' ? '#60a5fa' : '#ef4444'
                                                }}>
                                                    {m.status === 'MATCH' ? 'CONCILIADO (0 DIFF)' : m.status === 'ADJUSTED' ? 'AJUSTADO' : `DIFF: R$ ${m.divergence_cents.toFixed(2)}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ABA 3: MÁQUINA DO TEMPO (REPLAY) */}
                {activeTab === 'timemachine' && (
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>🕰️ Time Machine — Replay Financeiro</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                            Escolha qualquer data no passado para recuar o tempo e visualizar o patrimônio consolidado calculado com as regras vigentes naquele momento.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ maxWidth: '240px', margin: 0 }}>
                                <label className="label">Data de Consulta</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={replayDate}
                                    onChange={(e) => setReplayDate(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleFetchReplay}
                                className="btn btn-primary"
                                style={{ fontWeight: 700, padding: '10px 20px' }}
                                disabled={replayLoading}
                            >
                                {replayLoading ? 'Recalculando...' : '🔮 Recalcular Patrimônio na Data'}
                            </button>
                        </div>

                        {replayResult && (
                            <div style={{ paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                    <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Patrimônio Líquido na Data</span>
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--color-primary)' }}>
                                            {formatBRL(replayResult.summary.total_net_balance)}
                                        </h3>
                                    </div>
                                    <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Saldo Bruto na Data</span>
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '4px 0 0 0' }}>
                                            {formatBRL(replayResult.summary.total_gross_balance)}
                                        </h3>
                                    </div>
                                    <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Impostos Retidos (IOF + IR)</span>
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '4px 0 0 0', color: '#ef4444' }}>
                                            {formatBRL(replayResult.summary.total_iof_accumulated + replayResult.summary.total_ir_accumulated)}
                                        </h3>
                                    </div>
                                </div>

                                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>📦 Lotes de Investimento Ativos em {new Date(replayDate + 'T12:00:00').toLocaleDateString('pt-BR')}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {replayResult.lots.map((s: any) => (
                                        <div key={s.lot.id} style={{ padding: '14px 16px', background: 'var(--color-surface-1)', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                                <strong>{s.lot.rule_version?.product?.bank?.name || 'Banco'} — {s.lot.rule_version?.product?.name || 'Produto'}</strong>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                    Idade na data: {s.calendarDays} dias corridos ({s.businessDays} dias úteis)
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'block' }}>Saldo Líquido</span>
                                                <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{formatBRL(s.netBalance)}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ABA 4: GERENCIADOR DE REGRAS & PRODUTOS */}
                {activeTab === 'regras' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="card" style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>⚙️ Configuração do Rule Engine</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                                O Core Banking permite configurar regras de rendimento por faixas para produtos como a <strong>Caixinha Turbo do Nubank</strong> ou <strong>Mercado Pago 120% até R$ 10.000,00</strong>.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', color: '#820ad1' }}>🔮 Faixas de Rendimento (Tiered Rates)</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                                        Quando você tem um saldo (ex: R$ 55.000,00):<br/>
                                        • <strong>Até R$ 10.000,00:</strong> Rende 120% do CDI.<br/>
                                        • <strong>Excedente (R$ 45.000,00):</strong> Rende 100% do CDI.<br/>
                                        O motor calcula automaticamente essa divisão sem misturar lotes.
                                    </p>
                                </div>

                                <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', color: '#009ee3' }}>📈 Atualização Automática do CDI</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                                        A taxa do CDI é sincronizada diariamente via API oficial do <strong>Banco Central do Brasil (SGS 12)</strong>. Taxa vigente atual: <strong>{cdiRate.toFixed(2)}% a.a.</strong>
                                    </p>
                                </div>
                            </div>

                            {/* FORMS LADO A LADO */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                {/* FORM NOVO BANCO */}
                                <div style={{ padding: '16px', background: 'var(--color-surface-1)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>🏦 Cadastrar Novo Banco</h4>
                                    <form onSubmit={handleCreateBankSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div className="form-group">
                                            <label className="label">Nome do Banco</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Ex: Sofisa Direto"
                                                value={newBankForm.name}
                                                onChange={(e) => setNewBankForm({ ...newBankForm, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Cor da Marca (Hexadecimal)</label>
                                            <input
                                                type="color"
                                                className="input"
                                                style={{ height: '40px', padding: '2px' }}
                                                value={newBankForm.brand_color}
                                                onChange={(e) => setNewBankForm({ ...newBankForm, brand_color: e.target.value })}
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                                            Cadastrar Banco
                                        </button>
                                    </form>
                                </div>

                                {/* FORM NOVO PRODUTO COM FAIXAS */}
                                <div style={{ padding: '16px', background: 'var(--color-surface-1)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>📊 Cadastrar Produto / Faixa de Rendimento</h4>
                                    <form onSubmit={handleCreateProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div className="form-group">
                                            <label className="label">Instituição</label>
                                            <select
                                                className="input"
                                                value={newProductForm.bank_id}
                                                onChange={(e) => setNewProductForm({ ...newProductForm, bank_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Selecione o banco</option>
                                                {banks.map(b => (
                                                    <option key={b.bank_id} value={b.bank_id}>{b.bank_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Nome do Produto</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Ex: Caixinha Turbo 120% até 10k"
                                                value={newProductForm.name}
                                                onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div className="form-group">
                                                <label className="label">% CDI 1ª Faixa</label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    placeholder="120"
                                                    value={newProductForm.indexer_percentage}
                                                    onChange={(e) => setNewProductForm({ ...newProductForm, indexer_percentage: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="label">Teto 1ª Faixa (R$)</label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    placeholder="10000"
                                                    value={newProductForm.tier_cap_limit}
                                                    onChange={(e) => setNewProductForm({ ...newProductForm, tier_cap_limit: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="label">% CDI Excedente</label>
                                            <input
                                                type="number"
                                                className="input"
                                                placeholder="100"
                                                value={newProductForm.tier_secondary_percentage}
                                                onChange={(e) => setNewProductForm({ ...newProductForm, tier_secondary_percentage: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Regra de Tributação / IOF</label>
                                            <select
                                                className="input"
                                                value={newProductForm.tax_type}
                                                onChange={(e) => setNewProductForm({ ...newProductForm, tax_type: e.target.value })}
                                            >
                                                <option value="STANDARD">🔴 CDB Padrão (Cobram IOF + IR Regressivo) — Ex: Nubank</option>
                                                <option value="NO_IOF">🟡 Sem IOF (Apenas IR Regressivo) — Ex: Mercado Pago</option>
                                                <option value="EXEMPT">🟢 100% Isento (Sem IOF e Sem IR) — Ex: LCI / LCA</option>
                                            </select>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                                            Salvar Produto com Regras
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px' }}>🏦 Instituições Financeiras Cadastradas ({banks.length})</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {banks.map((b) => {
                                        const bankProducts = allProductsList.filter((p: any) => p.bank_id === b.bank_id);
                                        return (
                                            <div key={b.bank_id} style={{
                                                padding: '16px', background: 'var(--color-surface-2)', borderRadius: '12px',
                                                border: `1px solid ${b.brand_color}33`, borderLeft: `4px solid ${b.brand_color}`
                                            }}>
                                                {/* Cabeçalho do Banco */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: bankProducts.length > 0 ? '14px' : '0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: b.brand_color, display: 'inline-block', boxShadow: `0 0 8px ${b.brand_color}66` }} />
                                                        <strong style={{ fontSize: '1rem' }}>{b.bank_name}</strong>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', background: 'var(--color-surface-1)', padding: '2px 6px', borderRadius: '6px' }}>
                                                            {bankProducts.length} produto(s)
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            onClick={() => setEditingBank(b)}
                                                            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            ✏️ Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteBank(b.bank_id, b.bank_name)}
                                                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            🗑️ Excluir
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Lista de Produtos do Banco */}
                                                {bankProducts.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {bankProducts.map((p: any) => {
                                                            const v = p.version;
                                                            const hasTier = v?.tier_cap_limit && v.tier_cap_limit > 0;
                                                            return (
                                                                <div key={p.id} style={{
                                                                    padding: '10px 14px', background: 'var(--color-surface-1)', borderRadius: '8px',
                                                                    border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
                                                                }}>
                                                                    <div>
                                                                        <strong style={{ fontSize: '0.9rem' }}>{p.name}</strong>
                                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                            {v && (
                                                                                <>
                                                                                    <span style={{
                                                                                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
                                                                                        background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)'
                                                                                    }}>
                                                                                        {v.indexer_percentage}% CDI
                                                                                    </span>
                                                                                    {hasTier && (
                                                                                        <>
                                                                                            <span style={{
                                                                                                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
                                                                                                background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)'
                                                                                            }}>
                                                                                                Teto: R$ {Number(v.tier_cap_limit).toLocaleString('pt-BR')}
                                                                                            </span>
                                                                                            <span style={{
                                                                                                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
                                                                                                background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)'
                                                                                            }}>
                                                                                                Excedente: {v.tier_secondary_percentage || 100}% CDI
                                                                                            </span>
                                                                                        </>
                                                                                    )}
                                                                                    {v.tax_rules_config?.is_exempt ? (
                                                                                        <span style={{
                                                                                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
                                                                                            background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)'
                                                                                        }}>
                                                                                            🟢 100% Isento (LCI/LCA)
                                                                                        </span>
                                                                                    ) : v.tax_rules_config?.is_iof_exempt ? (
                                                                                        <span style={{
                                                                                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
                                                                                            background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)'
                                                                                        }}>
                                                                                            🟡 Sem IOF (Apenas IR)
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span style={{
                                                                                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700,
                                                                                            background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)'
                                                                                        }}>
                                                                                            🔴 IOF + IR Regressivo
                                                                                        </span>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm(`Excluir produto "${p.name}"?`)) return;
                                                                            try {
                                                                                const res = await fetch(`/api/capital/rules?id=${p.id}`, { method: 'DELETE' });
                                                                                if (res.ok) fetchData();
                                                                                else {
                                                                                    const d = await res.json();
                                                                                    alert(`Erro: ${d.error}`);
                                                                                }
                                                                            } catch (err) { console.error(err); }
                                                                        }}
                                                                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', margin: 0, fontStyle: 'italic' }}>
                                                        Nenhum produto cadastrado para este banco. Cadastre acima.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EDITAR BANCO */}
            {editingBank && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Editar Banco</h3>
                        <form onSubmit={handleEditBankSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div className="form-group">
                                <label className="label">Nome do Banco</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={editingBank.bank_name}
                                    onChange={(e) => setEditingBank({ ...editingBank, bank_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Cor da Marca</label>
                                <input
                                    type="color"
                                    className="input"
                                    style={{ height: '40px', padding: '2px' }}
                                    value={editingBank.brand_color}
                                    onChange={(e) => setEditingBank({ ...editingBank, brand_color: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary btn-full" style={{ fontWeight: 700 }}>
                                    Salvar Alterações
                                </button>
                                <button type="button" onClick={() => setEditingBank(null)} className="btn btn-full" style={{ background: 'var(--color-surface-2)' }}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL NOVO APORTE */}
            {isAporteModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: '95%', maxWidth: '560px', padding: '24px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Novo Aporte em Lote</h3>
                        <form onSubmit={handleCreateAporte} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div className="form-group">
                                <label className="label">Produto / Banco</label>
                                <select
                                    className="input"
                                    style={{ width: '100%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.85rem', paddingRight: '28px' }}
                                    value={aporteForm.productRuleVersionId}
                                    onChange={(e) => setAporteForm({ ...aporteForm, productRuleVersionId: e.target.value })}
                                    required
                                >
                                    {allProductsList.filter(p => p.version).length === 0 ? (
                                        <option value="">Nenhum produto cadastrado (Cadastre em Regras & Produtos)</option>
                                    ) : (
                                        <>
                                            <option value="">Selecione o produto / banco</option>
                                            {allProductsList.filter(p => p.version).map(p => (
                                                <option key={p.version.id} value={p.version.id}>
                                                    {p.bank?.name || 'Banco'} | {p.name} ({p.version?.indexer_percentage}% CDI)
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Valor Depositado (R$)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Ex: 50.000,00"
                                    value={aporteForm.amount}
                                    onChange={(e) => setAporteForm({ ...aporteForm, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Data do Depósito</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={aporteForm.date}
                                    onChange={(e) => setAporteForm({ ...aporteForm, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Observações (Opcional)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Ex: Reserva de Emergência"
                                    value={aporteForm.notes}
                                    onChange={(e) => setAporteForm({ ...aporteForm, notes: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary btn-full" style={{ fontWeight: 700 }}>
                                    Confirmar Aporte
                                </button>
                                <button type="button" onClick={() => setIsAporteModalOpen(false)} className="btn btn-full" style={{ background: 'var(--color-surface-2)' }}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
