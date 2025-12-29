"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Home as HomeIcon, Eye, Edit2, CheckCircle, Calendar, AlertCircle, Search, BarChart3, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";
import { Imovel } from "@/types";

export default function PropertiesPage() {
    const { imoveis, loading } = useApp();

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Carregando...</div>;
    }

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1>Meus Imóveis</h1>
                <Link href="/properties/new" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    <Plus size={20} /> <span style={{ marginLeft: '4px' }}>Novo</span>
                </Link>
            </header>

            {imoveis.filter(p => p.ativo).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)', background: 'var(--color-surface-1)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
                    <HomeIcon size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                    <h3 style={{ marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Nenhum imóvel cadastrado</h3>
                    <p style={{ marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>Adicione seus imóveis para acompanhar aluguéis e gastos.</p>
                    <Link href="/properties/new" className="btn btn-primary">
                        Cadastrar Primeiro Imóvel
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {imoveis.filter(p => p.ativo).map((imovel) => (
                        <PropertyCard key={imovel.id} imovel={imovel} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PropertyCard({ imovel }: { imovel: Imovel }) {
    const { imoveisPagamentos, receberPagamento, adicionarGasto } = useApp();
    const { showToast } = useToast();
    const [showGastoModal, setShowGastoModal] = useState(false);

    // Gasto Form State
    const [gastoDesc, setGastoDesc] = useState("");
    const [gastoValor, setGastoValor] = useState("");
    const [isSavingGasto, setIsSavingGasto] = useState(false);

    // STRICT TIME SOURCE
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMesRef = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const currentMonthName = now.toLocaleString('pt-BR', { month: 'long' });

    const isPaidThisMonth = imoveisPagamentos.some(p => {
        return p.imovel_id === imovel.id && p.status === 'pago' && p.mes_ref === currentMesRef;
    });

    const months = Array.from({ length: 12 }, (_, i) => i);
    const timelineData = months.map(mIndex => {
        const d = new Date(currentYear, mIndex, 1);
        const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        const targetMesRef = `${currentYear}-${String(mIndex + 1).padStart(2, '0')}-01`;

        const isMonthPaid = imoveisPagamentos.some(p => {
            return p.imovel_id === imovel.id && p.status === 'pago' && p.mes_ref === targetMesRef;
        });

        return { label, isPaid: isMonthPaid, isCurrent: mIndex === currentMonth };
    });

    const handlePayment = async () => {
        if (isPaidThisMonth) return;
        const confirmMsg = `CONFIRMAÇÃO DE RECEBIMENTO\n\nImóvel: ${imovel.nome}\nMês: ${currentMonthName.toUpperCase()}\n\nDeseja confirmar?`;
        if (confirm(confirmMsg)) {
            await receberPagamento(imovel.id, new Date());
        }
    };

    const handleSaveGasto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gastoDesc || !gastoValor) return;
        setIsSavingGasto(true);
        try {
            await adicionarGasto({
                imovel_id: imovel.id,
                mes_ref: currentMesRef,
                descricao: gastoDesc,
                valor: parseFloat(gastoValor.replace(',', '.'))
            });
            setShowGastoModal(false);
            setGastoDesc("");
            setGastoValor("");
        } finally {
            setIsSavingGasto(false);
        }
    };

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{
                background: isPaidThisMonth ? 'rgba(var(--color-success-rgb), 0.05)' : 'var(--color-surface-2)',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {timelineData.map((t, idx) => (
                        <div key={idx} style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: t.isPaid ? 'var(--color-success)' : 'var(--color-border)',
                            color: t.isPaid ? 'white' : 'var(--color-text-tertiary)',
                            fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', border: t.isCurrent ? '2px solid var(--color-text-primary)' : 'none',
                            opacity: t.isPaid || t.isCurrent ? 1 : 0.4
                        }}>
                            {t.label[0]}
                        </div>
                    ))}
                </div>
                <div style={{
                    fontSize: '0.65rem', fontWeight: '800', padding: '3px 8px', borderRadius: '10px',
                    background: isPaidThisMonth ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                    color: 'white', textTransform: 'uppercase'
                }}>
                    {isPaidThisMonth ? 'Pago' : 'Pendente'}
                </div>
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}
                        </div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>{imovel.nome}</h3>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    {!isPaidThisMonth ? (
                        <button onClick={handlePayment} className="btn" style={{ background: 'var(--color-success)', color: 'white', fontSize: '0.85rem' }}>
                            <CheckCircle size={16} /> Receber {currentMonthName.slice(0, 3)}
                        </button>
                    ) : (
                        <button disabled className="btn" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)', fontSize: '0.8rem', cursor: 'not-allowed', border: '1px solid var(--color-border)' }}>
                            <CheckCircle size={16} /> Pago
                        </button>
                    )}
                    <button onClick={() => setShowGastoModal(true)} className="btn" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                        <Plus size={16} /> Gasto
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <Link href={`/properties/${imovel.id}`} className="btn" style={{ background: 'var(--color-surface-2)', fontSize: '0.8rem', border: '1px solid var(--color-border)', flex: 1 }}>
                        <Search size={16} /> Histórico
                    </Link>
                    <Link href={`/properties/${imovel.id}`} className="btn" style={{ background: 'var(--color-surface-2)', fontSize: '0.8rem', border: '1px solid var(--color-border)', flex: 1 }}>
                        <BarChart3 size={16} /> Relatório
                    </Link>
                </div>
            </div>

            {/* QUICK GASTO MODAL */}
            {showGastoModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '350px', background: 'white', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Novo Gasto - {currentMonthName}</h3>
                            <button onClick={() => setShowGastoModal(false)} style={{ background: 'none', border: 'none' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveGasto}>
                            <div className="form-group">
                                <label className="label">Descrição</label>
                                <input type="text" className="input" value={gastoDesc} onChange={e => setGastoDesc(e.target.value)} required placeholder="Ex: Reforma cano" />
                            </div>
                            <div className="form-group">
                                <label className="label">Valor (R$)</label>
                                <input type="number" step="0.01" className="input" value={gastoValor} onChange={e => setGastoValor(e.target.value)} required placeholder="0,00" />
                            </div>
                            <button disabled={isSavingGasto} type="submit" className="btn btn-primary btn-full" style={{ marginTop: '10px' }}>
                                {isSavingGasto ? 'Salvando...' : 'Salvar Gasto'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
