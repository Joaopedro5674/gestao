"use client";

import { useState, use } from "react";
import { ChevronLeft, AlertTriangle, UserX, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

export default function LoanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const { emprestimos, deletarEmprestimo, emprestimosMeses, pagarParcelaJuros } = useApp();
    const router = useRouter();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const emprestimo = emprestimos.find((l) => l.id === id) || null;

    if (!emprestimo) return <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Carregando...</div>;

    const isPaid = emprestimo.status === 'pago';

    // Stats
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

    const startDateStr = new Date(emprestimo.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR');
    const dueDateStr = new Date(emprestimo.data_fim + 'T12:00:00').toLocaleDateString('pt-BR');
    const paymentDateStr = emprestimo.data_pagamento ? new Date(emprestimo.data_pagamento).toLocaleDateString('pt-BR') : '-';

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/loans" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <div>
                    <h1 style={{ marginTop: '-4px' }}>Detalhes do Empréstimo</h1>
                </div>
            </header>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                            {emprestimo.cliente_nome}
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Criado em {startDateStr}</p>
                    </div>
                    <div>
                        {isPaid ? (
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.8rem', background: 'var(--color-success)', color: 'white', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                    <CheckCircle size={12} /> ENCERRADO
                                </span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '4px' }}>
                                    Em {paymentDateStr}
                                </div>
                            </div>
                        ) : stats.isOverdue ? (
                            <span style={{ fontSize: '0.8rem', background: 'var(--color-danger)', color: 'white', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={14} /> VENCIDO
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.8rem', background: 'var(--color-primary)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>ATIVO</span>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div style={{ margin: 'var(--space-lg) 0', padding: '10px 0', borderTop: '1px dashed var(--color-border)', borderBottom: '1px dashed var(--color-border)' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Linha do Tempo</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', fontSize: '0.8rem' }}>
                        {/* Line */}
                        <div style={{ position: 'absolute', top: '12px', left: '10px', right: '10px', height: '2px', background: 'var(--color-border)', zIndex: 0 }}></div>

                        {/* Start Node */}
                        <div style={{ zIndex: 1, textAlign: 'center', background: 'var(--color-bg)', padding: '0 5px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-surface-2)', border: '2px solid var(--color-text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                                <Clock size={12} color="var(--color-text-tertiary)" />
                            </div>
                            <span style={{ fontWeight: 600 }}>Início</span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-active)' }}>{startDateStr}</div>
                        </div>

                        {/* Middle/End Node - Dynamic */}
                        {isPaid ? (
                            <div style={{ zIndex: 1, textAlign: 'center', background: 'var(--color-bg)', padding: '0 5px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-success)', border: '2px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                                    <CheckCircle size={14} color="white" />
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Pago</span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-active)' }}>{paymentDateStr}</div>
                            </div>
                        ) : stats.isOverdue ? (
                            <div style={{ zIndex: 1, textAlign: 'center', background: 'var(--color-bg)', padding: '0 5px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-danger)', border: '2px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                                    <AlertTriangle size={14} color="white" />
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>Vencido</span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-active)' }}>{dueDateStr}</div>
                            </div>
                        ) : (
                            <div style={{ zIndex: 1, textAlign: 'center', background: 'var(--color-bg)', padding: '0 5px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-surface-2)', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                                    <Clock size={12} color="var(--color-primary)" />
                                </div>
                                <span style={{ fontWeight: 600 }}>Previsto</span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-active)' }}>{dueDateStr}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Valor Emprestado</label>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emprestimo.valor_emprestado)}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Juros Mensal</label>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                            {emprestimo.juros_mensal}% a.m.
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Duração Contratada</label>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                            {stats.displayDuration}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Lucro Garantido</label>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-success)' }}>
                            + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.interestOnly)}
                        </div>
                    </div>
                </div>

                <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: '8px', marginTop: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600' }}>Total {isPaid ? 'Pago' : 'a Receber'}</span>
                        <span style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalReceivable)}
                        </span>
                    </div>
                </div>
            </div>

            {/* MODELO 2: MONTHLY INTEREST SECTION */}
            {emprestimo.cobranca_mensal && !isPaid && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                        <Clock size={18} color="var(--color-text-secondary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Juros Mensais</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {emprestimosMeses
                            .filter(m => m.emprestimo_id === emprestimo.id && !m.pago)
                            .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia))
                            .map((mes) => {
                                const now = new Date();
                                const currentYear = now.getFullYear();
                                const currentMonthIdx = now.getMonth() + 1;
                                const currentMonthStr = `${currentYear}-${String(currentMonthIdx).padStart(2, '0')}`;

                                const isPast = mes.mes_referencia < currentMonthStr;
                                const isCurrent = mes.mes_referencia === currentMonthStr;
                                const isFuture = mes.mes_referencia > currentMonthStr;
                                const isReleased = isPast || isCurrent;

                                // Format Month YYYY-MM -> Month Name
                                const [mYear, mMonth] = mes.mes_referencia.split('-');
                                const dateObj = new Date(parseInt(mYear), parseInt(mMonth) - 1, 1);
                                const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                                const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

                                return (
                                    <div key={mes.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: isPast ? '4px solid var(--color-danger)' : (isCurrent ? '4px solid var(--color-success)' : '4px solid var(--color-border)') }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{capitalizedMonth}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mes.valor_juros)}
                                            </div>

                                            <div style={{ marginTop: '6px' }}>
                                                {isPast && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <AlertTriangle size={12} /> Atrasado
                                                    </span>
                                                )}
                                                {isCurrent && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle size={12} /> Mês atual
                                                    </span>
                                                )}
                                                {isFuture && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> Aguardando mês
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isReleased ? (
                                            <button
                                                className="btn btn-primary"
                                                style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                                                onClick={() => pagarParcelaJuros(mes.id)}
                                            >
                                                Pagar juros
                                            </button>
                                        ) : (
                                            <div style={{ opacity: 0.5 }}>
                                                {/* No button for future */}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        {emprestimosMeses.filter(m => m.emprestimo_id === emprestimo.id && !m.pago).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                Todos os juros mensais estão em dia!
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Admin Actions: Always available */}
            <div style={{ marginTop: 'var(--space-xl)' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>Ações de Controle</h3>
                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="btn btn-full"
                    style={{ background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', justifyContent: 'center' }}
                >
                    <UserX size={18} style={{ marginRight: '8px' }} /> Apagar Empréstimo
                </button>
            </div>

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={async () => {
                    await deletarEmprestimo(emprestimo.id);
                    router.push("/loans");
                }}
                itemName={emprestimo.cliente_nome}
                itemType="Empréstimo"
            />
        </div>
    );
}
