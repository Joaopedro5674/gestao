"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, DollarSign, Calendar, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Property, RentPayment } from "@/types";

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use() or await in async component, but this is client component so use use()
    // Next.js 15+ allows awaiting params in server components. In client components, params is a promise in 15?
    // Actually params is passed as prop. In Next 13/14 it was object. In 15 it's promise.
    // Assuming Next 15 since user said "latest".

    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { properties, rentPayments } = useApp();
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
            const propertyPayments = rentPayments.filter((p) => p.propertyId === id);
            // Sort by date desc
            // Sort by paidAt desc (or create date from month/year)
            propertyPayments.sort((a, b) => {
                const dateA = a.paidAt ? new Date(a.paidAt).getTime() : 0;
                const dateB = b.paidAt ? new Date(b.paidAt).getTime() : 0;
                return dateB - dateA;
            });
            setHistory(propertyPayments);
        }
    }, [id, rentPayments]);

    if (!property) {
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
                    {property.name}
                </h1>
            </header>

            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                    <span className="label">Endereço</span>
                    <div style={{ fontSize: '1rem' }}>-</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                    <div>
                        <span className="label">Valor Aluguel</span>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.rentAmount)}
                        </div>
                    </div>
                    <div>
                        <span className="label">Vencimento</span>
                        <div style={{ fontWeight: '600' }}>Dia {property.paymentDay}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Pagamentos</h3>
                <Link href={`/properties/${id}/payment`} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
                    Registrar
                </Link>
            </div>

            {history.length === 0 ? (
                <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                    Nenhum pagamento registrado.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {history.map((payment) => (
                        <div key={payment.id} className="card" style={{ padding: 'var(--space-sm) var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>
                                    {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('pt-BR') : `${payment.month + 1}/${payment.year}`}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: payment.status === 'pending' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                    {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                                </div>
                            </div>
                            <div style={{ fontWeight: '700' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.rentAmount)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
