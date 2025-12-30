"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Imovel } from "@/types";

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const router = useRouter();
    const { imoveis, atualizarImovel, deletarImovel } = useApp();
    const property = imoveis.find((p) => p.id === id) || null;

    if (!property) {
        return (
            <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p>Carregando imóvel...</p>
                <Link href="/properties" className="btn" style={{ marginTop: '16px' }}>Voltar</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href={`/properties/${id}`} style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1 style={{ marginTop: '-4px' }}>Editar Imóvel</h1>
            </header>

            <PropertyEditForm
                property={property}
                onSubmit={atualizarImovel}
                onDelete={deletarImovel}
                onSuccess={() => router.push("/properties")}
            />
        </div>
    );
}

function PropertyEditForm({
    property,
    onSubmit,
    onDelete,
    onSuccess
}: {
    property: Imovel,
    onSubmit: (id: string, updates: Partial<Imovel>) => Promise<void>,
    onDelete: (id: string) => Promise<void>,
    onSuccess: () => void
}) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: property.nome,
        clientName: property.cliente_nome || "",
        phone: property.telefone || "",
        address: property.endereco || "",
        rentAmount: property.valor_aluguel.toString().replace('.', ','),
        paymentDay: (property.dia_pagamento || 10).toString(),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(property.id, {
            nome: formData.name,
            cliente_nome: formData.clientName,
            telefone: formData.phone,
            endereco: formData.address,
            valor_aluguel: parseFloat(formData.rentAmount.replace(',', '.')),
            dia_pagamento: parseInt(formData.paymentDay) || 10,
            ativo: property.ativo
        });
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="card shadow-sm">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                    <label>Identificação do Imóvel</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Casa 01, Apto 202..."
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Nome do Cliente</label>
                    <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="Nome completo do inquilino"
                    />
                </div>

                <div className="form-group">
                    <label>Telefone</label>
                    <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <div className="form-group">
                    <label>Endereço</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua, número, bairro..."
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label>Valor do Aluguel</label>
                        <input
                            type="text"
                            value={formData.rentAmount}
                            onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                            placeholder="0,00"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Dia de Vencimento</label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={formData.paymentDay}
                            onChange={(e) => setFormData({ ...formData, paymentDay: e.target.value })}
                            placeholder="10"
                            required
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <button type="submit" className="btn btn-full">
                    <Save size={18} style={{ marginRight: '8px' }} /> Salvar Alterações
                </button>

                <button
                    type="button"
                    onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.")) {
                            onDelete(property.id);
                            router.push("/properties");
                        }
                    }}
                    className="btn btn-full"
                    style={{ background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                >
                    Excluir Imóvel
                </button>
            </div>
        </form>
    );
}
