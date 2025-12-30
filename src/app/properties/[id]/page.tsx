"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle, Edit2, Phone, MapPin, User, History, BarChart3 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Imovel, ImovelPagamento } from "@/types";
import { useToast } from "@/components/ToastProvider";

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { imoveis, imoveisPagamentos, imoveisGastos, receberPagamento } = useApp();
    const { showToast } = useToast();

    const imovel = imoveis.find((p) => p.id === id) || null;
    const history = imoveisPagamentos
        .filter((p) => p.imovel_id === id)
        .sort((a, b) => new Date(b.mes_ref).getTime() - new Date(a.mes_ref).getTime());

    // Current Month Status Logic
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentMesRef = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const isPaidThisMonth = history.some(p => p.mes_ref === currentMesRef && p.status === 'pago');
    const currentMonthName = now.toLocaleString('pt-BR', { month: 'long' });

    const handlePayment = async () => {
        if (!imovel) return;
        const confirmMsg = `CONFIRMAÇÃO DE RECEBIMENTO\n\nImóvel: ${imovel.nome}\nMês de Referência: ${currentMonthName.toUpperCase()}/${currentYear}\n\nDeseja confirmar o pagamento?`;

        if (confirm(confirmMsg)) {
            try {
                await receberPagamento(imovel.id, new Date());
                showToast("Pagamento registrado com sucesso", "success");
            } catch (error) {
                console.error(error);
                showToast("Erro ao registrar pagamento", "error");
            }
        }
    };

    if (!imovel) {
        return (
            <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p>Carregando ou não encontrado...</p>
                <Link href="/properties" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>Voltar</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/properties" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1 style={{ fontSize: '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {imovel.nome}
                </h1>
                <Link href={`/properties/${imovel.id}/edit`} className="btn" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <Edit2 size={14} /> Editar Cliente
                </Link>
            </header>

            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                    <div>
                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> Cliente</span>
                        <div style={{ fontWeight: '600' }}>{imovel.cliente_nome || "Não informado"}</div>
                    </div>
                    <div>
                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> Contato</span>
                        <div style={{ fontWeight: '600' }}>{imovel.telefone || "Não informado"}</div>
                    </div>
                </div>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> Endereço</span>
                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                        {imovel.endereco || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Endereço não informado</span>}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
                    <span className="label">Valor Aluguel</span>
                    <div style={{ fontWeight: '800', fontSize: '1.4rem', color: 'var(--color-primary)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Pagamentos</h3>
                {/* Use Same Logic as Card */}
                {!isPaidThisMonth ? (
                    <button
                        onClick={handlePayment}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem', background: 'var(--color-success)', color: 'white' }}
                    >
                        Registrar {currentMonthName}
                    </button>
                ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> {currentMonthName} Pago
                    </span>
                )}
            </div>

            {history.length === 0 ? (
                <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    Nenhum pagamento registrado nos últimos 12 meses.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <div style={{ padding: '8px', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BarChart3 size={16} /> Relatório Financeiro (Resumido)
                    </div>
                    {history.map((payment) => {
                        const [y, m, d] = payment.mes_ref.split('-');
                        const dateObj = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0); // Noon to avoid timezone shift
                        const monthLabel = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

                        // Calculate Expenses for this month reference
                        const monthExpenses = imoveisGastos.filter(g =>
                            g.imovel_id === id && g.mes_ref === payment.mes_ref
                        );
                        const totalExpense = monthExpenses.reduce((acc, curr) => acc + curr.valor, 0);
                        const gross = payment.valor_pago || 0;
                        const net = gross - totalExpense;

                        return (
                            <div key={payment.id} className="card" style={{ padding: 'var(--space-sm) var(--space-md)', background: payment.status === 'pago' ? 'white' : 'var(--color-surface-1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: '700', textTransform: 'capitalize', fontSize: '1rem' }}>
                                            {monthLabel}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '8px' }}>
                                            <span style={{ color: payment.status === 'pendente' ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 'bold' }}>
                                                {payment.status === 'pago' ? 'PAGO' : 'PENDENTE'}
                                            </span>
                                            {payment.data_pagamento && (
                                                <span style={{ color: 'var(--color-text-tertiary)' }}>
                                                    em {new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Lucro Líquido</div>
                                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: net > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(net)}
                                        </div>
                                    </div>
                                </div>

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

                    <div style={{ padding: '8px', marginTop: 'var(--space-md)', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={16} /> Histórico de Atividades
                    </div>
                    <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {history.filter(p => p.status === 'pago').map(p => {
                            const [y, m, d] = p.mes_ref.split('-');
                            const refDate = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
                            return (
                                <div key={`hist-${p.id}`} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-2)', paddingBottom: '8px' }}>
                                    <span>Pagamento de <strong>{refDate.toLocaleString('pt-BR', { month: 'long' })}</strong> recebido</span>
                                    <span style={{ color: 'var(--color-text-tertiary)' }}>{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '-'}</span>
                                </div>
                            );
                        })}
                        {imoveisGastos.filter(g => g.imovel_id === id).sort((a, b) => new Date(b.mes_ref).getTime() - new Date(a.mes_ref).getTime()).map(g => (
                            <div key={`hist-g-${g.id}`} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-2)', paddingBottom: '8px' }}>
                                <span style={{ color: 'var(--color-danger)' }}>Gasto: {g.descricao}</span>
                                <span style={{ color: 'var(--color-text-tertiary)' }}>{new Date(g.mes_ref + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
