"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function NewPropertyPage() {
    const router = useRouter();
    const { addProperty } = useApp();

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        rentAmount: "",
        paymentDay: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.rentAmount) return;

        addProperty({
            id: crypto.randomUUID(),
            name: formData.name,
            address: formData.address,
            rentAmount: parseFloat(formData.rentAmount.replace(',', '.')), // Handle PT-BR decimal
            paymentDay: parseInt(formData.paymentDay) || 10,
            isActive: true,
        });

        router.push("/properties");
    };

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/properties" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>Novo Imóvel</h1>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div className="form-group">
                    <label className="label">Nome / Identificação</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ex: Apto 103"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                </div>

                <div className="form-group">
                    <label className="label">Endereço</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Rua das Flores, 123"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="label">Valor do Aluguel (R$)</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="0,00"
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
                            placeholder="Dia"
                            value={formData.paymentDay}
                            onChange={(e) => setFormData({ ...formData, paymentDay: e.target.value })}
                            min="1"
                            max="31"
                        />
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    Salvar Imóvel
                </button>
            </form>
        </div>
    );
}
