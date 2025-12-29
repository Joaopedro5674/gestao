"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Property, RentPayment } from "@/types";

export default function PropertyReportsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { properties, rentPayments, expenses } = useApp();
    const [property, setProperty] = useState<Property | null>(null);
    const [history, setHistory] = useState<RentPayment[]>([]);

    useEffect(() => {
        if (properties.length > 0) {
            const found = properties.find((p) => p.id === id);
            if (found) setProperty(found);
        }
    }, [id, properties]);

    useEffect(() => {
        if (id) {
            // Filter payments for this property
            const propertyPayments = rentPayments.filter(p => p.propertyId === id);

            // Sort by date desc
            propertyPayments.sort((a, b) => {
                // Sort by dueDate usually for billing cycles
                return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
            });

            setHistory(propertyPayments.slice(0, 12));
        }
    }, [id, rentPayments]);

    if (!property) return <div className="container">Carregando...</div>;

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href={`/properties/${id}/view`} style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <div>
                    <h1 style={{ fontSize: '1.25rem' }}>Relatório 12 Meses</h1>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{property.name}</p>
                </div>
            </header>

            {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-secondary)' }}>
                    <p>Sem histórico recente.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {history.map((payment) => {
                        const date = new Date(payment.dueDate);
                        const monthYear = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        const pYear = date.getFullYear();
                        const pMonth = date.getMonth();

                        // Calculate real expenses for this month
                        const monthExpenses = expenses.filter(e => {
                            if (e.propertyId !== property.id) return false;
                            const eDate = new Date(e.date + 'T00:00:00');
                            return eDate.getFullYear() === pYear && eDate.getMonth() === pMonth;
                        });

                        const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
                        const profit = payment.amount - totalExpenses;

                        const isPaid = payment.status === 'paid';

                        return (
                            <div key={payment.id} className="card" style={{ padding: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                                    <div style={{ textTransform: 'capitalize', fontWeight: '600' }}>{monthYear}</div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        color: isPaid ? 'var(--color-success)' : 'var(--color-warning)',
                                        textTransform: 'uppercase'
                                    }}>
                                        {payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : payment.status === 'late' ? 'Atrasado' : 'Parcial'}
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '0.9rem', gap: '8px', textAlign: 'center' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Aluguel</p>
                                        <p style={{ fontWeight: '600' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Gastos</p>
                                        <p style={{ color: 'var(--color-danger)' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Lucro</p>
                                        <p style={{ fontWeight: '700', color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
