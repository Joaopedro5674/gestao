"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, User, Phone, MapPin, Calendar, CreditCard, FileText } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function PropertyDetailsInfoPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const { imoveis, loading } = useApp();

    const imovel = imoveis.find((p) => p.id === id) || null;

    if (loading || !imovel) {
        return <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Carregando...</div>;
    }

    return (
        <div className="container">
            <header style={{ marginBottom: '20px' }}>
                <Link href="/properties" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                    <ArrowLeft size={20} /> Voltar para Imóveis
                </Link>
                <h1>Dados do Contrato</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Informações cadastrais de {imovel.nome}</p>
            </header>

            <div className="card" style={{ padding: 'var(--space-lg)', display: 'grid', gap: 'var(--space-lg)' }}>
                {/* STATUS HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
                    <div>
                        <span className="label">Status do Contrato</span>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '20px',
                            background: imovel.ativo ? 'rgba(var(--color-success-rgb), 0.1)' : 'var(--color-surface-2)',
                            color: imovel.ativo ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                            fontWeight: 'bold', fontSize: '0.9rem'
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }}></div>
                            {imovel.ativo ? 'Ativo' : 'Inativo'}
                        </div>
                    </div>
                </div>

                {/* CLIENT INFO */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                    <div>
                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Locatário (Cliente)</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{imovel.cliente_nome || "Não informado"}</div>
                    </div>
                    <div>
                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> Telefone</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{imovel.telefone || "Não informado"}</div>
                    </div>
                </div>

                {/* ADDRESS */}
                <div>
                    <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> Endereço do Imóvel</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{imovel.endereco || "Não informado"}</div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', margin: '10px 0' }}></div>

                {/* FINANCIAL INFO */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                    <div>
                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={14} /> Valor do Aluguel</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}
                        </div>
                    </div>
                    <div>
                        <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Dia do Vencimento</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                            Dia {imovel.dia_pagamento}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>de todo mês</div>
                    </div>
                </div>

                {/* DATA INICIO (Checking if exists in type, otherwise omit or show generic) */}
                {/* Imovel type has created_at, but prompt asks for "Data de início do contrato". 
                    If not in DB, I will show 'Não informado' or created_at if appropriate. 
                    Checking Type: Imovel has created_at. I'll use that as 'Data de Cadastro' for now. */}
                <div>
                    <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> Início do Contrato</span>
                    <div style={{ fontSize: '1rem' }}>
                        {imovel.created_at ? new Date(imovel.created_at).toLocaleDateString('pt-BR') : 'Não informado'}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
                <Link href={`/properties/${imovel.id}/edit`} className="btn" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    Editar Dados
                </Link>
            </div>
        </div>
    );
}
