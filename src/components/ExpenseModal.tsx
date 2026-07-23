"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, DollarSign, FileText, X } from "lucide-react";

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (descricao: string, valor: number) => Promise<void>;
    monthLabel: string;
}

export default function ExpenseModal({
    isOpen,
    onClose,
    onSave,
    monthLabel
}: ExpenseModalProps) {
    const [mounted, setMounted] = useState(false);
    const [descricao, setDescricao] = useState("");
    const [valor, setValor] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descricao || !valor) return;

        const numValor = parseFloat(valor.replace(',', '.'));
        if (isNaN(numValor) || numValor <= 0) return;

        setLoading(true);
        try {
            await onSave(descricao, numValor);
            setDescricao("");
            setValor("");
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            width: '100vw', height: '100dvh',
            background: 'rgba(0, 0, 0, 0.8)', zIndex: 999999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            overflow: 'hidden'
        }}>
            <div className="modal-content" style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '400px',
                padding: 'var(--space-lg)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border)',
                animation: 'modalSlideIn 0.3s ease-out'
            }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)' }}>
                        <DollarSign size={24} />
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Adicionar Gasto</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </header>

                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                    Referente ao mês de <strong>{monthLabel}</strong>
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '500' }}>Descrição</label>
                        <div style={{ position: 'relative' }}>
                            <FileText size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input
                                type="text"
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                placeholder="Ex: Manutenção, Pintura..."
                                required
                                style={{
                                    width: '100%', padding: '10px 10px 10px 36px',
                                    borderRadius: '6px', border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface-1)', color: 'var(--color-text-primary)'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '500' }}>Valor (R$)</label>
                        <div style={{ position: 'relative' }}>
                            <DollarSign size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={valor}
                                onChange={e => setValor(e.target.value)}
                                placeholder="0,00"
                                required
                                style={{
                                    width: '100%', padding: '10px 10px 10px 36px',
                                    borderRadius: '6px', border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface-1)', color: 'var(--color-text-primary)'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                            disabled={loading}
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn"
                            disabled={loading}
                            style={{
                                background: 'var(--color-danger)',
                                color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {loading ? 'Salvando...' : 'Salvar Gasto'}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                @keyframes modalSlideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
}
