"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Property } from "@/types";

export default function NewPaymentPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const router = useRouter();
    const { properties, addRentPayment } = useApp();
    const [property, setProperty] = useState<Property | null>(null);

    const [formData, setFormData] = useState({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        status: "paid",
    });

    useEffect(() => {
        if (properties.length > 0) {
            const found = properties.find((p) => p.id === id);
            if (found) {
                setProperty(found);
                setFormData(prev => ({ ...prev, amount: found.rentAmount.toString() }));
            }
        }
    }, [id, properties]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount) return;

        addRentPayment({
            id: crypto.randomUUID(),
            propertyId: id,
            tenantId: property?.tenantId || "unknown", // Fallback if no tenant linked yet
            date: formData.date,
            dueDate: formData.date, // Simplifying for MVP
            amount: parseFloat(formData.amount.replace(',', '.')),
            status: formData.status as 'paid' | 'late' | 'partial',
        });

        router.push(`/properties/${id}`);
    };

    if (!property) return <div className="container">Carregando...</div>;

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href={`/properties/${id}`} style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>Registrar Pagamento</h1>
            </header>

            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontWeight: '600' }}>{property.name}</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Vencimento dia {property.paymentDay}</div>
            </div>

            <form onSubmit={handleSubmit} className="card">
                <div className="form-group">
                    <label className="label">Valor Pago (R$)</label>
                    <input
                        type="number"
                        className="input"
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        step="0.01"
                    />
                </div>

                <div className="form-group">
                    <label className="label">Data do Pagamento</label>
                    <input
                        type="date"
                        className="input"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="label">Status</label>
                    <select
                        className="input"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                        <option value="paid">Pago</option>
                        <option value="late">Atrasado</option>
                        <option value="partial">Parcial</option>
                    </select>
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    Confirmar Pagamento
                </button>
            </form>
        </div>
    );
}
