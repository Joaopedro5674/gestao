"use client";

import Link from "next/link";
import { Plus, TrendingUp, Eye, Edit2, CheckCircle, AlertTriangle, Lock, Calculator, Phone } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";
import { Emprestimo } from "@/types";
import { useState } from "react";
import LoanCalculatorModal from "@/components/LoanCalculatorModal";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function LoansPage() {
    const { emprestimos, loading } = useApp();
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Carregando...</div>;
    }

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '12px' }}>
                <h1>Meus Empréstimos</h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => setIsCalculatorOpen(true)}
                        className="btn"
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Calculator size={18} /> Calcular Juros
                    </button>
                    <Link href="/loans/new" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                        <Plus size={20} /> <span style={{ marginLeft: '4px' }}>Novo</span>
                    </Link>
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
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {emprestimos.map((emprestimo) => (
                        <LoanCard key={emprestimo.id} emprestimo={emprestimo} />
                    ))}
                </div>
            )}

            <LoanCalculatorModal
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />
        </div>
    );
}


function LoanCard({ emprestimo }: { emprestimo: Emprestimo }) {
    const { marcarEmprestimoPago } = useApp();
    const { showToast } = useToast();
    const [showPaidModal, setShowPaidModal] = useState(false);

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
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', opacity: isPaid ? 0.9 : 1 }}>
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
                </div>

                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 'normal', fontSize: '0.8rem' }}>
                    {emprestimo.juros_mensal}% a.m
                </span>
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Valor Emprestado</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emprestimo.valor_emprestado)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ textTransform: 'capitalize', margin: 0 }}>{emprestimo.cliente_nome}</h3>
                            {emprestimo.telefone && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={12} /> {emprestimo.telefone}
                                </span>
                            )}
                        </div>
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
