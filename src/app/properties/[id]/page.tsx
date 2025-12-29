"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Imovel, ImovelPagamento } from "@/types";
import { useToast } from "@/components/ToastProvider";

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { imoveis, imoveisPagamentos, imoveisGastos, receberPagamento } = useApp();
    const { showToast } = useToast();

    const [imovel, setImovel] = useState<Imovel | null>(null);
    const [history, setHistory] = useState<ImovelPagamento[]>([]);

    useEffect(() => {
        if (imoveis.length > 0) {
            const found = imoveis.find((p) => p.id === id);
            if (found) setImovel(found);
        }
    }, [id, imoveis]);

    useEffect(() => {
        if (id) {
            const propertyPayments = imoveisPagamentos.filter((p) => p.imovel_id === id);
            // Sort by mes_ref desc (latest first)
            propertyPayments.sort((a, b) => {
                const dateA = new Date(a.mes_ref).getTime();
                const dateB = new Date(b.mes_ref).getTime();
                return dateB - dateA;
            });
            setHistory(propertyPayments);
        }
    }, [id, imoveisPagamentos]);

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
                <h1 style={{ fontSize: '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {imovel.nome}
                </h1>
            </header>

            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                    <span className="label">Endereço</span>
                    {/* Address removed from schema, just showing placeholder */}
                    <div style={{ fontSize: '1rem' }}>-</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                    <div>
                        <span className="label">Valor Aluguel</span>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}
                        </div>
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
                    <div style={{ padding: '8px', color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Relatório Mensal (Últimos 12 meses)
                    </div>
                    {history.map((payment) => {
                        const [y, m, d] = payment.mes_ref.split('-');
                        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
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
                </div>
            )}
        </div>
    );
}
