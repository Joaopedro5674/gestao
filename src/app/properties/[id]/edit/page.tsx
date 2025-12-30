"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, Trash2, User, Home, DollarSign, Calendar } from "lucide-react";
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
        <main style={{ minHeight: '100vh', background: 'var(--color-background)', padding: 'var(--space-md) 0' }}>
            <div className="container" style={{ maxWidth: '800px' }}>
                <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-xl)', gap: 'var(--space-sm)' }}>
                    <Link href={`/properties/${id}`} style={{
                        padding: '10px',
                        marginLeft: '-10px',
                        color: 'var(--color-text-secondary)',
                        transition: 'color 0.2s'
                    }} className="hover-primary">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Editar Imóvel</h1>
                </header>

                <PropertyEditForm
                    property={property}
                    onSubmit={atualizarImovel}
                    onDelete={deletarImovel}
                    onSuccess={() => router.push("/properties")}
                />
            </div>
        </main>
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

            {/* Seção 1: Dados do Cliente */}
            <section className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                    <User size={18} color="var(--color-primary)" />
                    <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-primary)' }}>Dados do Cliente</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
                    <div className="form-group">
                        <label className="label">Nome do Inquilino</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.clientName}
                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                            placeholder="Ex: João Silva"
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Telefone de Contato</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>
            </section>

            {/* Seção 2: Detalhes do Imóvel */}
            <section className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                    <Home size={18} color="var(--color-primary)" />
                    <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-primary)' }}>Informações do Imóvel</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-lg)' }}>
                    <div className="form-group">
                        <label className="label">Identificação / Apelido</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Apartamento 202 - Centro"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Endereço Completo</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Rua, número, bairro e cidade"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                        <div className="form-group">
                            <label className="label">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <DollarSign size={12} /> Valor Mensal
                                </div>
                            </label>
                            <input
                                type="text"
                                className="input"
                                style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}
                                value={formData.rentAmount}
                                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                                placeholder="0,00"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} /> Dia de Vencimento
                                </div>
                            </label>
                            <input
                                type="number"
                                className="input"
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
            </section>

            {/* Ações */}
            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <button type="submit" className="btn btn-success" style={{ height: '56px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                    <Save size={20} style={{ marginRight: '10px' }} />
                    <span style={{ fontWeight: 700 }}>Salvar Alterações</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.")) {
                            onDelete(property.id);
                            router.push("/properties");
                        }
                    }}
                    className="btn btn-danger-outline"
                    style={{ height: '52px', borderRadius: '12px', marginTop: '12px' }}
                >
                    <Trash2 size={18} style={{ marginRight: '8px' }} /> Excluir Imóvel
                </button>
            </div>
        </form>
    );
}
