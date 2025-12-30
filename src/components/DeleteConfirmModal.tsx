"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    itemName: string;
    itemType: "Imóvel" | "Empréstimo" | "Gasto";
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    itemType
}: DeleteConfirmModalProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Erro na confirmação de exclusão:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)'
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
                        <AlertTriangle size={24} />
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Confirmar Exclusão</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </header>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                        Você está prestes a excluir permanentemente o seguinte {itemType.toLowerCase()}:
                    </p>
                    <div style={{
                        background: 'var(--color-surface-2)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '12px',
                        borderLeft: '4px solid var(--color-danger)'
                    }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 'bold' }}>{itemType}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{itemName}</div>
                    </div>
                    <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '12px', fontWeight: '500' }}>
                        Esta ação é irreversível e removerá todos os dados vinculados.
                    </p>
                </div>

                <footer style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        className="btn"
                        onClick={onClose}
                        disabled={loading}
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn"
                        onClick={handleConfirm}
                        disabled={loading}
                        style={{
                            background: 'var(--color-danger)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {loading ? 'Excluindo...' : <><Trash2 size={18} /> Apagar</>}
                    </button>
                </footer>
            </div>
            <style jsx>{`
                @keyframes modalSlideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
