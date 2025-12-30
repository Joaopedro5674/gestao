"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function NewPropertyPage() {
    const router = useRouter();
    const { adicionarImovel } = useApp();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "", // Identificação (Ex: Casa 01)
        clientName: "",
        phone: "",
        address: "",
        rentAmount: "",
        paymentDay: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.rentAmount || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await adicionarImovel({
                nome: formData.name,
                cliente_nome: formData.clientName,
                telefone: formData.phone,
                endereco: formData.address,
                valor_aluguel: parseFloat(formData.rentAmount.replace(',', '.')),
                ativo: true,
                dia_pagamento: parseInt(formData.paymentDay) || 10
            });

            router.push("/properties");
        } catch (error) {
            console.error("Erro ao salvar imóvel:", error);
            setIsSubmitting(false); // Enable back only on error
        }
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
                    <label className="label">Identificação do Imóvel</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="label">Nome do Cliente</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Nome Completo"
                            value={formData.clientName}
                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Telefone</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="(00) 00000-0000"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
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

                <button disabled={isSubmitting} type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Imóvel'}
                </button>
            </form>
        </div>
    );
}
