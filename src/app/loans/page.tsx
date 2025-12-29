"use client";

import Link from "next/link";
import { Plus, TrendingUp, Eye, Edit2, CheckCircle, AlertTriangle, Calendar, DollarSign } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";

export default function LoansPage() {
    const { loans } = useApp();

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1>Meus Empréstimos</h1>
                <Link href="/loans/new" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    <Plus size={20} /> <span style={{ marginLeft: '4px' }}>Novo</span>
                </Link>
            </header>

            {loans.length === 0 ? (
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
                    {loans.filter(l => l.startDate && l.dueDate).map((loan) => (
                        <LoanCard key={loan.id} loan={loan} />
                    ))}
                </div>
            )}
        </div>
    );
}


function LoanCard({ loan }: { loan: any }) {
    const { markLoanAsPaid } = useApp();
    const { showToast } = useToast();

    // Helper to calculate stats
    const calculateStats = () => {
        if (loan.status === 'paid') {
            const days = loan.finalTotalDays || 0;
            const months = Math.ceil(days / 30); // rounding up for display "X months" if roughly X

            return {
                daysTotal: days,
                displayDuration: `${days} dias`,
                totalReceivable: loan.finalTotalPaid || 0,
                interestOnly: loan.finalInterestAmount || 0,
                isOverdue: false,
                isContracted: true // Assuming paid has finalized match
            };
        }

        // Active: Calculate based on DUE DATE vs START (Contracted)
        // If we have stored contracted values, use them.
        if (loan.contractedInterest !== undefined && loan.contractedDays !== undefined) {
            const days = loan.contractedDays;

            // Overdue check
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(loan.dueDate + 'T12:00:00');
            due.setHours(0, 0, 0, 0);
            const isOverdue = today > due;

            return {
                daysTotal: days,
                displayDuration: `${days} dias`,
                totalReceivable: loan.principal + loan.contractedInterest,
                interestOnly: loan.contractedInterest,
                isOverdue,
                isContracted: true
            }
        }

        // Fallback for old loans (Calculated on the fly based on CONTRACT)
        const start = new Date(loan.startDate + 'T12:00:00');
        const end = new Date(loan.dueDate + 'T12:00:00'); // ALWAYS DUE DATE, not Today

        const diffTime = end.getTime() - start.getTime();
        let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (totalDays < 1) totalDays = 1;

        const dailyRate = loan.interestRate / 30;
        const interest = loan.principal * (dailyRate / 100) * totalDays;
        const total = loan.principal + interest;

        // Overdue check
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(loan.dueDate + 'T12:00:00');
        due.setHours(0, 0, 0, 0);
        const isOverdue = today > due;

        return {
            daysTotal: totalDays,
            displayDuration: `${totalDays} dias`,
            totalReceivable: total,
            interestOnly: interest,
            isOverdue,
            isContracted: false // It effectively is contracted logic, but legacy data structure
        };
    };

    const stats = calculateStats();
    const isPaid = loan.status === 'paid';

    // Safety check for display dates
    const startDateStr = loan.startDate ? new Date(loan.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    const dueDateStr = loan.dueDate ? new Date(loan.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

    const handleMarkAsPaid = () => {
        if (confirm(`Confirmar recebimento de ${loan.borrowerName}?\n\nValor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalReceivable)}\nLucro Garantido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.interestOnly)}`)) {
            markLoanAsPaid(loan.id);
            showToast("Empréstimo encerrado com sucesso", "success");
        }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: isPaid ? 'var(--color-success)' : stats.isOverdue ? 'var(--color-danger)' : 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase'
                    }}>
                        {isPaid ? <CheckCircle size={14} /> : stats.isOverdue ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                        {isPaid ? 'Pago' : stats.isOverdue ? 'Vencido' : 'Em Andamento'}
                    </div>

                    {!isPaid && (
                        <div style={{
                            fontSize: '0.6rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px'
                        }} title="O valor dos juros é fixo conforme o contrato">
                            <CheckCircle size={8} /> Juros Garantidos
                        </div>
                    )}
                </div>

                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 'normal', fontSize: '0.8rem' }}>
                    {loan.displayId || 'ID-Legacy'}
                </span>
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '2px' }}>Valor Emprestado</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.principal)}
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginTop: '4px', color: 'var(--color-text-secondary)' }}>{loan.borrowerName}</h3>
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

                <div style={{ display: 'flex', gap: '8px' }}>
                    {!isPaid ? (
                        <button
                            onClick={handleMarkAsPaid}
                            className="btn btn-primary"
                            style={{ flex: 2, background: 'var(--color-success)', color: 'white', boxShadow: 'var(--shadow-sm)' }}
                        >
                            <CheckCircle size={18} style={{ marginRight: '6px' }} /> Confirmar Pagamento
                        </button>
                    ) : (
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-text-tertiary)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontWeight: '500', border: '1px dashed var(--color-border)' }}>
                            <Calendar size={16} /> Pago em {loan.paymentDate ? new Date(loan.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </div>
                    )}

                    <Link href={`/loans/${loan.id}/view`} className="btn" style={{ flex: 1, background: 'var(--color-surface-2)', padding: '0 12px' }}>
                        <Eye size={20} />
                    </Link>
                    {!isPaid && (
                        <Link href={`/loans/${loan.id}/edit`} className="btn" style={{ flex: 1, background: 'var(--color-surface-2)', padding: '0 12px' }}>
                            <Edit2 size={20} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}


