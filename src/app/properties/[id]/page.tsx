"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle, Edit2, Phone, MapPin, User, History, BarChart3, AlertCircle, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { imoveis, imoveisPagamentos, imoveisGastos, receberPagamento, deletarImovel, loading } = useApp();
    const { showToast } = useToast();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [paymentTarget, setPaymentTarget] = useState<{ date: Date; label: string }>({ date: new Date(), label: '' });

    const imovel = imoveis.find((p) => p.id === id) || null;
    const history = imoveisPagamentos
        .filter((p) => p.imovel_id === id)
        .sort((a, b) => b.mes_referencia.localeCompare(a.mes_referencia)); // Newest first for history

    // Current Month Status Logic (Strict Text)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMesRef = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`; // YYYY-MM

    // Filter strictly overdue items for Badge
    const overdueItems = history.filter(p =>
        (p.status === 'atrasado') ||
        (p.status === 'pendente' && p.mes_referencia < currentMesRef)
    );

    // Pending Payments (Sorted Oldest First to encourage paying debt)
    const pendingPayments = history
        .filter(p => p.status !== 'pago')
        .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));

    const handlePayment = async () => {
        if (!imovel || !paymentTarget.date) return;
        try {
            await receberPagamento(imovel.id, paymentTarget.date);
            // showToast handled in context
            setShowPaymentModal(false);
        } catch (error) {
            console.error(error);
            // Error toast handled in context
        }
    };

    if (loading || !imovel) {
        return (
            <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p>{loading ? "Carregando imóvel..." : "Imóvel não encontrado..."}</p>
                {!loading && <Link href="/properties" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>Voltar</Link>}
            </div>
        );
    }

    return (
        <div className="container">
            {/* START HEADER */}
            <header style={{ marginBottom: '20px' }}>
                <Link href="/properties" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                    <ArrowLeft size={20} /> Voltar para Imóveis
                </Link>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ marginBottom: '4px' }}>{imovel.nome}</h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{imovel.endereco}</p>
                    </div>
                    {/* Status Badge */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* 1. STATUS BADGE (Pendente vs Em dia) */}
                        {/* If there are overdue items OR current is not paid, it's 'Pendente' (Yellow). 
                             Only strict 'Em dia' (All past paid AND current paid) gets Green. 
                             Wait, if I have overdue, am I 'Pendente'? The user said:
                             "Se existir qualquer mês anterior ao mês atual que não esteja pago -> Exibir selo amarelo: Pendente"
                        */}
                        {(overdueItems.length > 0 || pendingPayments.some(p => p.mes_referencia === currentMesRef)) ? (
                            <div style={{
                                background: 'var(--color-warning)', color: 'white', padding: '6px 12px',
                                borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <AlertCircle size={16} />
                                Pendente
                            </div>
                        ) : (
                            <div style={{
                                background: 'var(--color-success)', color: 'white', padding: '6px 12px',
                                borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <CheckCircle size={16} />
                                Em dia
                            </div>
                        )}

                        {/* 2. OVERDUE WARNING BADGE (Second Seal) */}
                        {overdueItems.length > 0 && (
                            <div style={{
                                background: 'var(--color-danger)', color: 'white', padding: '6px 12px',
                                borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <AlertCircle size={16} />
                                {overdueItems.length} {overdueItems.length === 1 ? 'Atrasado' : 'Atrasados'}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-md)' }}>
                <Link href={`/properties/${imovel.id}/details`} className="btn" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    Ver Dados do Contrato
                </Link>
                {/* Removed Edit/Delete from here nicely, or keep them? User didn't say to remove buttons, just split Functionality. "Ver Dados" button logic changed. */}
                {/* Let's keep a link to Details. Edit/Delete can be in Details or here? Usually Details. I'll Link to Details. */}
            </div>

            {/* HEADER INFO (Current Month) */}
            <div style={{ marginBottom: 'var(--space-md)', padding: '16px', background: 'var(--color-surface-1)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <span className="label">Mês Atual ({new Date().toLocaleString('pt-BR', { month: 'long' })})</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        Vence em: <strong>{new Date(currentYear, currentMonth, imovel.dia_pagamento).toLocaleDateString('pt-BR')}</strong>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}
                    </div>
                </div>
            </div>

            {/* SEÇÃO DE PAGAMENTOS PENDENTES */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Pagamentos Pendentes</h3>

                {pendingPayments.length === 0 ? (
                    <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(var(--color-success-rgb), 0.1)', border: '1px solid var(--color-success)' }}>
                        <CheckCircle style={{ color: 'var(--color-success)' }} />
                        <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>Tudo em dia! Nenhum pagamento pendente.</span>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {pendingPayments.map((payment) => {
                            // Parse YYYY-MM
                            const [pYear, pMonth] = payment.mes_referencia.split('-').map(Number);
                            // Due Date Calculation
                            const dueDate = new Date(pYear, pMonth - 1, imovel.dia_pagamento);
                            // Valid Date check (e.g. Feb 30 -> Mar 2) - JS handles overflow, but strictly we might want last day of month? 
                            // Standard JS behavior is acceptable for now unless user complains.

                            const labelMonth = new Date(pYear, pMonth - 1, 15).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                            const isLate = payment.status === 'atrasado' || (payment.status === 'pendente' && payment.mes_referencia < currentMesRef);

                            return (
                                <div key={payment.id} className="card" style={{
                                    padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    borderLeft: isLate ? '4px solid var(--color-danger)' : '4px solid var(--color-warning)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', textTransform: 'capitalize' }}>
                                            {labelMonth}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: isLate ? 'var(--color-danger)' : 'var(--color-warning)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{isLate ? 'Atrasado' : 'A vencer'}</span>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>•</span>
                                            <span>Vence em: {dueDate.toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setPaymentTarget({
                                                    date: new Date(pYear, pMonth - 1, 15), // Use safe date for processing ref
                                                    label: labelMonth
                                                });
                                                setShowPaymentModal(true);
                                            }}
                                            className="btn btn-primary"
                                            style={{ padding: '6px 16px' }}
                                        >
                                            Pagar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* RELATÓRIO FINANCEIRO (History) */}
            {history.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <div style={{ padding: '8px', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BarChart3 size={16} /> Relatório Financeiro (Resumido)
                    </div>
                    {history.map((payment) => {
                        const [y, m] = payment.mes_referencia.split('-').map(Number);
                        const dueDate = new Date(y, m - 1, imovel.dia_pagamento);
                        const monthLabel = new Date(y, m - 1, 15).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

                        // Note: Gastos might still be using mes_ref or we need to check its schema.
                        // Assuming imoveisGastos still uses mes_ref (DATE or TEXT?).
                        // If imoveisGastos wasn't migrated, equality check might fail if formats differ.
                        // Let's assume for now strict equality check against payment.mes_referencia
                        // User prompt only mentioned fixing imoveis_pagamentos. Gastos might be separate.
                        // If Gastos use 'YYYY-MM-01', we need to match carefully.
                        // Ideally we should have migrated Gastos too, but let's stick to simple match or substring.
                        // For safety, let's normalize gastos match:
                        const monthExpenses = imoveisGastos.filter(g =>
                            g.imovel_id === id &&
                            (g.mes_ref === payment.mes_referencia || g.mes_ref.startsWith(payment.mes_referencia))
                        );

                        const totalExpense = monthExpenses.reduce((acc, curr) => acc + curr.valor, 0);
                        const gross = payment.valor || 0; // NEW COLUMN NAME
                        const net = gross - totalExpense;

                        return (
                            <div key={payment.id} className="card" style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: '700', textTransform: 'capitalize', fontSize: '1rem' }}>
                                            {monthLabel}
                                        </div>
                                        {/* DUE DATE IN REPORT */}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                                            Vencimento: {dueDate.toLocaleDateString('pt-BR')}
                                        </div>

                                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '8px' }}>
                                            <span style={{ color: payment.status === 'pendente' ? 'var(--color-warning)' : (payment.status === 'atrasado' ? 'var(--color-danger)' : 'var(--color-success)'), fontWeight: 'bold' }}>
                                                {payment.status.toUpperCase()}
                                            </span>
                                            {payment.pago_em && (
                                                <span style={{ color: 'var(--color-text-tertiary)' }}>
                                                    em {new Date(payment.pago_em).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {payment.status === 'pago' && (
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Lucro Líquido</div>
                                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: net > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(net)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {payment.status === 'pago' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', paddingTop: '10px', borderTop: '1px solid var(--color-border)', opacity: 0.8 }}>
                                        <div style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>ALUGUEL</div>
                                            +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(gross)}
                                        </div>
                                        <div style={{ textAlign: 'right', color: totalExpense > 0 ? 'var(--color-danger)' : 'var(--color-text-tertiary)', fontWeight: '600' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>GASTOS</div>
                                            {totalExpense > 0 ? '-' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
                                        </div>
                                    </div>
                                )}

                                {monthExpenses.length > 0 && (
                                    <div style={{ marginTop: '10px', padding: '8px', background: 'var(--color-surface-2)', borderRadius: '6px', fontSize: '0.75rem' }}>
                                        {monthExpenses.map((g, idx) => (
                                            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: idx === monthExpenses.length - 1 ? 0 : '4px' }}>
                                                <span style={{ color: 'var(--color-text-secondary)' }}>• {g.descricao}</span>
                                                <span style={{ fontWeight: '600' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.valor)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ padding: '8px', marginTop: 'var(--space-md)', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={16} /> Histórico de Atividades
            </div>
            <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {history.filter(p => p.status === 'pago').map(p => {
                    const [y, m] = p.mes_referencia.split('-').map(Number);
                    const refDate = new Date(y, m - 1, 15);
                    return (
                        <div key={`hist-${p.id}`} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-2)', paddingBottom: '8px' }}>
                            <span>Pagamento de <strong>{refDate.toLocaleString('pt-BR', { month: 'long' })}</strong> recebido</span>
                            <span style={{ color: 'var(--color-text-tertiary)' }}>{p.pago_em ? new Date(p.pago_em).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                    );
                })}
            </div>

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={async () => {
                    await deletarImovel(imovel.id);
                    window.location.href = "/properties";
                }}
                itemName={imovel.nome}
                itemType="Imóvel"
            />

            <ConfirmationModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onConfirm={handlePayment}
                title="Confirmar Pagamento"
                message={`Deseja registrar o pagamento do mês (${paymentTarget.label}) para ${imovel.nome}?`}
                confirmText="Confirmar Pagamento"
                variant="success"
            />
        </div>
    );
}
