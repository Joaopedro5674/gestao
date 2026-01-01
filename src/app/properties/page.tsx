"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Home as HomeIcon, CheckCircle, AlertCircle, Search, BarChart3, X, Trash2, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Imovel } from "@/types";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ConfirmationModal from "@/components/ConfirmationModal";

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
    const { imoveisPagamentos, receberPagamento, adicionarGasto, deletarImovel } = useApp();
    const [showGastoModal, setShowGastoModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [gastoDesc, setGastoDesc] = useState("");
    const [gastoValor, setGastoValor] = useState("");
    const [isSavingGasto, setIsSavingGasto] = useState(false);

    // STRICT TIME SOURCE
    // STRICT TIME SOURCE
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMesRef = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const currentMonthName = now.toLocaleString('pt-BR', { month: 'long' });

    // 1. Get all payments for this property
    const myPayments = imoveisPagamentos.filter(p => p.imovel_id === imovel.id);

    // 2. Timeline Data
    const months = Array.from({ length: 12 }, (_, i) => i);
    const timelineData = months.map(mIndex => {
        const d = new Date(currentYear, mIndex, 1);
        const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        const targetMesRef = `${currentYear}-${String(mIndex + 1).padStart(2, '0')}`;

        const payment = imoveisPagamentos.find(p => p.imovel_id === imovel.id && p.mes_referencia === targetMesRef);
        const isPaid = payment?.status === 'pago';

        return { label, isPaid, isCurrent: mIndex === currentMonth };
    });

    // OVERDUE LOGIC (Strict Text Comparison)
    const overduePayments = myPayments.filter(p =>
        (p.status === 'atrasado') ||
        (p.status === 'pendente' && p.mes_referencia < currentMesRef)
    );
    const overdueCount = overduePayments.length;

    // Current Month Status
    const currentMonthPayment = myPayments.find(p => p.mes_referencia === currentMesRef);
    const isCurrentPaid = currentMonthPayment?.status === 'pago';

    // LOGIC:
    // 1. If overdue > 0 -> RED "Atrasados"
    // 2. If no overdue, but current is not paid -> YELLOW "Pendente"
    // 3. If no overdue AND current paid -> GREEN "Em dia"

    let statusBadge;
    if (overdueCount > 0) {
        statusBadge = (
            <div style={{
                fontSize: '0.75rem', fontWeight: '800', padding: '4px 10px', borderRadius: '12px',
                background: 'var(--color-danger)', color: 'white', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                <AlertCircle size={12} fill="white" color="var(--color-danger)" />
                {overdueCount} {overdueCount === 1 ? 'Atrasado' : 'Atrasados'}
            </div>
        );
    } else if (!isCurrentPaid) {
        statusBadge = (
            <div style={{
                fontSize: '0.75rem', fontWeight: '800', padding: '4px 10px', borderRadius: '12px',
                background: 'var(--color-warning)', color: 'white', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                <AlertCircle size={12} fill="white" color="var(--color-warning)" />
                Pendente
            </div>
        );
    } else {
        statusBadge = (
            <div style={{
                fontSize: '0.75rem', fontWeight: '800', padding: '4px 10px', borderRadius: '12px',
                background: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
                <CheckCircle size={12} />
                Em dia
            </div>
        );
    }

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

    const handleDeleteImovel = async () => {
        try {
            await deletarImovel(imovel.id);
            setShowDeleteModal(false);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', borderLeft: overdueCount > 0 ? '4px solid var(--color-danger)' : undefined }}>
            <div style={{
                background: 'var(--color-surface-2)',
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

                {statusBadge}
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovel.valor_aluguel)}
                        </div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>{imovel.nome}</h3>
                        {imovel.cliente_nome && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }}></span>
                                {imovel.cliente_nome}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <Link href={`/properties/${imovel.id}/details`} className="btn" style={{ background: 'var(--color-surface-2)', fontSize: '0.8rem', border: '1px solid var(--color-border)', justifyContent: 'center' }}>
                        Ver Dados
                    </Link>
                    <Link href={`/properties/${imovel.id}/edit`} className="btn" style={{ background: 'var(--color-surface-2)', fontSize: '0.8rem', border: '1px solid var(--color-border)', justifyContent: 'center' }}>
                        Editar
                    </Link>
                    <Link href={`/properties/${imovel.id}`} className="btn" style={{ background: 'var(--color-primary)', color: 'white', fontSize: '0.8rem', border: 'none', justifyContent: 'center' }}>
                        Pagamentos
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

            {/* DELETE CONFIRMATION MODAL */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteImovel}
                itemName={imovel.nome}
                itemType="Imóvel"
            />
        </div>
    );
}
