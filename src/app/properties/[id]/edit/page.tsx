"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Property } from "@/types";

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const router = useRouter();
    const { properties, updateProperty, deleteProperty } = useApp();
    const [property, setProperty] = useState<Property | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        rentAmount: "",
        paymentDay: "",
    });

    useEffect(() => {
        if (properties.length > 0) {
            const found = properties.find((p) => p.id === id);
            if (found) {
                setProperty(found);
                setFormData({
                    name: found.name,
                    rentAmount: found.rentAmount.toString(),
                    paymentDay: found.paymentDay.toString(),
                });
            }
        }
    }, [id, properties]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!property) return;

        updateProperty(property.id, {
            name: formData.name,
            rentAmount: parseFloat(formData.rentAmount.replace(',', '.')),
            paymentDay: parseInt(formData.paymentDay) || 10,
            isActive: property.isActive
        });

        router.push("/properties");
    };

    if (!property) return <div className="container">Carregando...</div>;

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/properties" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>Editar Imóvel</h1>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem', color: 'var(--color-warning)' }}>
                    <p><strong>Atenção:</strong> Alterações de valor afetam apenas o futuro.</p>
                </div>

                <div className="form-group">
                    <label className="label">Nome / Identificação</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="label">Valor do Aluguel (R$)</label>
                    <input
                        type="number"
                        className="input"
                        value={formData.rentAmount}
                        onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                        required
                        step="0.01"
                    />
                </div>

                <div className="form-group">
                    <label className="label">Dia Vencimento</label>
                    <input
                        type="number"
                        className="input"
                        value={formData.paymentDay}
                        onChange={(e) => setFormData({ ...formData, paymentDay: e.target.value })}
                        min="1"
                        max="31"
                    />
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    <Save size={20} style={{ marginRight: '8px' }} /> Salvar Alterações
                </button>
            </form>

            <button
                type="button"
                onClick={() => {
                    if (window.confirm("CONFIRMAÇÃO NECESSÁRIA:\n\nDeseja realmente apagar este imóvel?\n\nEle será removido da lista ativa, mas o histórico financeiro será preservado para relatórios.")) {
                        deleteProperty(property.id);
                        router.push("/properties");
                    }
                }}
                className="btn"
                style={{
                    marginTop: 'var(--space-lg)',
                    width: '100%',
                    color: 'var(--color-danger)',
                    border: '1px solid var(--color-danger)',
                    background: 'transparent',
                    fontWeight: '600'
                }}
            >
                Apagar Imóvel
            </button>
        </div>
    );
}
