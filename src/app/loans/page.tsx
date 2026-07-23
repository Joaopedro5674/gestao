"use client";

import Link from "next/link";
import { Plus, TrendingUp, Eye, EyeOff, Edit2, CheckCircle, AlertTriangle, Lock, Calculator, Phone, Calendar, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";
import { Emprestimo } from "@/types";
import { useState, useMemo } from "react";
import LoanCalculatorModal from "@/components/LoanCalculatorModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import NisCalendarModal from "@/components/NisCalendarModal";

type FilterType = 'todos' | 'ativos' | 'pagos' | 'cartao';

export default function LoansPage() {
    const { emprestimos, emprestimosMeses, loading } = useApp();
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isNisCalendarOpen, setIsNisCalendarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('todos');

    const counts = useMemo(() => {
        const ativos = emprestimos.filter(e => e.status === 'ativo').length;
        const pagos = emprestimos.filter(e => e.status === 'pago').length;
        const cartao = emprestimos.filter(e => e.tipo === 'cartao').length;
        return { ativos, pagos, cartao, total: emprestimos.length };
    }, [emprestimos]);

    const filteredLoans = useMemo(() => {
        let list = [...emprestimos];
        // Filter
        if (activeFilter === 'ativos') list = list.filter(e => e.status === 'ativo');
        else if (activeFilter === 'pagos') list = list.filter(e => e.status === 'pago');
        else if (activeFilter === 'cartao') list = list.filter(e => e.tipo === 'cartao');
        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(e => e.cliente_nome.toLowerCase().includes(q));
        }
        // Sort: active first, then by due date
        list.sort((a, b) => {
            const statusA = a.status === 'pago' ? 1 : 0;
            const statusB = b.status === 'pago' ? 1 : 0;
            if (statusA !== statusB) return statusA - statusB;
            return a.data_fim.localeCompare(b.data_fim);
        });
        return list;
    }, [emprestimos, activeFilter, searchQuery]);

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Carregando...</div>;
    }

    return (
        <div className="container animate-fade-in">
            <header style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ marginBottom: '2px', fontSize: '1.5rem', fontWeight: 800 }}>Meus Empréstimos</h1>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {counts.ativos} ativo{counts.ativos !== 1 ? 's' : ''} · {counts.pagos} pago{counts.pagos !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '100%' }}>
                        <button
                            onClick={() => setIsNisCalendarOpen(true)}
                            className="btn"
                            style={{
                                padding: '0.5rem 0.6rem',
                                background: 'var(--color-surface-2)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                justifyContent: 'center'
                            }}
                        >
                            <Calendar size={15} style={{ color: 'var(--color-primary)' }} /> NIS
                        </button>
                        <button
                            onClick={() => setIsCalculatorOpen(true)}
                            className="btn"
                            style={{
                                padding: '0.5rem 0.6rem',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: 'var(--color-primary)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                justifyContent: 'center'
                            }}
                        >
                            <Calculator size={15} /> Juros
                        </button>
                        <Link
                            href="/loans/new?type=cartao"
                            className="btn"
                            style={{
                                padding: '0.5rem 0.6rem',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                                border: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                justifyContent: 'center'
                            }}
                        >
                            <Plus size={15} /> Cartão
                        </Link>
                        <Link href="/loans/new" className="btn btn-primary" style={{ padding: '0.5rem 0.6rem', fontSize: '0.8rem', fontWeight: 700, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Plus size={15} /> Comum
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nome do cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* Filter Pills */}
                <div className="filter-pills">
                    {[
                        { key: 'todos' as FilterType, label: `Todos (${counts.total})` },
                        { key: 'ativos' as FilterType, label: `Ativos (${counts.ativos})` },
                        { key: 'pagos' as FilterType, label: `Pagos (${counts.pagos})` },
                        { key: 'cartao' as FilterType, label: `Cartão (${counts.cartao})` },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`filter-pill ${activeFilter === f.key ? 'filter-pill-active' : ''}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </header>

            {emprestimos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)', background: 'var(--color-surface-1)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
                    <TrendingUp size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                    <h3 style={{ marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Nenhum empréstimo ativo</h3>
                    <p style={{ marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>Registre empréstimos para calcular juros e prazos automaticamente.</p>
                    <Link href="/loans/new" className="btn btn-primary">
                        Criar Primeiro Empréstimo
                    </Link>
                </div>
            ) : filteredLoans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)', color: 'var(--color-text-secondary)' }}>
                    <Search size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>Nenhum empréstimo encontrado para &quot;{searchQuery}&quot;</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {filteredLoans.map((emprestimo) => (
                        <LoanCard key={emprestimo.id} emprestimo={emprestimo} />
                    ))}
                </div>
            )}

            <LoanCalculatorModal
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />

            <NisCalendarModal
                isOpen={isNisCalendarOpen}
                onClose={() => setIsNisCalendarOpen(false)}
            />
        </div>
    );
}


function LoanCard({ emprestimo }: { emprestimo: Emprestimo }) {
    const { marcarEmprestimoPago, emprestimosMeses } = useApp();
    const { showToast } = useToast();
    const [showPaidModal, setShowPaidModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPaid = emprestimo.status === 'pago';

    // Stats are now direct from DB (Immutable Contract)
    const stats = {
        daysTotal: emprestimo.dias_contratados,
        displayDuration: `${emprestimo.dias_contratados} dias`,
        totalReceivable: emprestimo.valor_emprestado + emprestimo.juros_total_contratado,
        interestOnly: emprestimo.juros_total_contratado,
        // Overdue check
        isOverdue: false
    };

    if (!isPaid) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(emprestimo.data_fim + 'T12:00:00');
        due.setHours(0, 0, 0, 0);
        stats.isOverdue = today > due;
    }

    // Dates
    const startDateStr = new Date(emprestimo.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR');
    const dueDateStr = new Date(emprestimo.data_fim + 'T12:00:00').toLocaleDateString('pt-BR');

    const handleMarkAsPaid = async () => {
        await marcarEmprestimoPago(emprestimo.id);
        showToast("Empréstimo encerrado com sucesso", "success");
    };

    return (
        <div className="card card-hover" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', opacity: isPaid ? 0.55 : 1, position: 'relative' }}>
            {isPaid && (
                <div style={{ position: 'absolute', top: '12px', right: '-28px', background: 'var(--color-success)', color: 'white', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 32px', transform: 'rotate(45deg)', zIndex: 1 }}>
                    Finalizado
                </div>
            )}
            {/* Header / Status */}
            <div style={{
                background: isPaid ? 'rgba(var(--color-success-rgb), 0.1)' : stats.isOverdue ? 'rgba(var(--color-danger-rgb), 0.1)' : 'var(--color-surface-2)',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', rowGap: '6px' }}>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: isPaid ? 'var(--color-success)' : stats.isOverdue ? 'var(--color-danger)' : 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase',
                        whiteSpace: 'nowrap', maxWidth: '100%'
                    }}>
                        {isPaid ? <CheckCircle size={14} /> : stats.isOverdue ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                        {isPaid ? 'Pago' : stats.isOverdue ? 'Vencido' : 'Em Andamento'}
                    </div>

                    {!isPaid && (
                        <div style={{
                            fontSize: '0.6rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px',
                            whiteSpace: 'nowrap', maxWidth: '100%'
                        }} title="O valor dos juros é fixo conforme o contrato">
                            <CheckCircle size={8} /> Juros Garantidos
                        </div>
                    )}

                    {emprestimo.cobranca_mensal && (
                        <div style={{
                            fontSize: '0.6rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px',
                            whiteSpace: 'nowrap', maxWidth: '100%'
                        }} title="Cobrança mensal de juros ativa">
                            <CheckCircle size={8} /> Juros Mensais
                        </div>
                    )}

                    {emprestimo.tipo === 'cartao' && (
                        <div style={{
                            fontSize: '0.6rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px',
                            whiteSpace: 'nowrap', maxWidth: '100%'
                        }} title="Empréstimo tipo Cartão">
                            <CheckCircle size={8} /> Cartão
                        </div>
                    )}
                </div>

                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 'normal', fontSize: '0.8rem' }}>
                    {Number(emprestimo.juros_mensal).toFixed(2)}% a.m
                </span>
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Valor Emprestado</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emprestimo.valor_emprestado)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ textTransform: 'capitalize', margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>{emprestimo.cliente_nome}</h3>
                            {emprestimo.telefone && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={12} /> {emprestimo.telefone}
                                </span>
                            )}
                        </div>
                        {emprestimo.numero_cheque && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '600', marginTop: '2px' }}>
                                📝 Cheque Nº {emprestimo.numero_cheque}
                            </div>
                        )}
                        {emprestimo.observacoes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                💬 {emprestimo.observacoes}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Lucro Líquido</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-success)' }}>
                            +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.interestOnly)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                            {stats.displayDuration}
                        </div>
                    </div>
                </div>

                {emprestimo.tipo === 'cartao' && (
                    <div style={{
                        background: 'var(--color-surface-2)',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.85rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                    }}>
                        <div>
                            <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>Senha do Cartão</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {showPassword ? emprestimo.cartao_senha : '••••'}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowPassword(!showPassword);
                                    }}
                                    style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>Final do NIS</span>
                            <strong>NIS Final {emprestimo.cartao_final_nis}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '0.75rem' }}>Retirada Mensal</span>
                            <strong>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emprestimo.cartao_valor_retirada || 0)} / mês ({emprestimo.cartao_quantidade_meses} meses)
                            </strong>
                        </div>
                    </div>
                )}

                {/* Progress Bar for Monthly Installments */}
                {emprestimo.cobranca_mensal && (() => {
                    const loanMonths = emprestimosMeses.filter(m => m.emprestimo_id === emprestimo.id);
                    const total = loanMonths.length;
                    const paid = loanMonths.filter(m => m.pago).length;
                    const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                    if (total === 0) return null;
                    return (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                <span>{paid} de {total} parcelas pagas</span>
                                <span style={{ fontWeight: '700', color: pct === 100 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>{pct}%</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--color-surface-1)', padding: '8px 12px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'block', textTransform: 'uppercase' }}>Início</span>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{startDateStr}</span>
                    </div>
                    <div style={{ background: 'var(--color-surface-1)', padding: '8px 12px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', display: 'block', textTransform: 'uppercase' }}>Vencimento</span>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{dueDateStr}</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {!isPaid && (
                        <button
                            onClick={() => setShowPaidModal(true)}
                            className="btn btn-primary"
                            style={{ gridColumn: 'span 2', background: 'var(--color-success)', color: 'white', boxShadow: 'var(--shadow-sm)', padding: '0.8rem' }}
                        >
                            <CheckCircle size={18} style={{ marginRight: '6px' }} /> Marcar como Recebido e Finalizar
                        </button>
                    )}

                    {isPaid && (
                        <div
                            style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-text-tertiary)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontWeight: '500', border: '1px dashed var(--color-border)', cursor: 'not-allowed', padding: '0.8rem' }}
                        >
                            <Lock size={16} /> Pago em {emprestimo.data_pagamento ? new Date(emprestimo.data_pagamento).toLocaleDateString('pt-BR') : '-'}
                        </div>
                    )}

                    <Link
                        href={`/loans/${emprestimo.id}/edit`}
                        className="btn"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <Edit2 size={16} /> Editar Cliente
                    </Link>

                    <Link
                        href={`/loans/${emprestimo.id}`}
                        className="btn"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        <Eye size={16} /> Ver Detalhes
                    </Link>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showPaidModal}
                onClose={() => setShowPaidModal(false)}
                onConfirm={handleMarkAsPaid}
                title="Finalizar Empréstimo"
                message={`Tem certeza que deseja marcar o empréstimo de ${emprestimo.cliente_nome} como recebido e finalizado?`}
                confirmText="Finalizar e Arquivar"
                variant="success"
            />
        </div>
    );
}
