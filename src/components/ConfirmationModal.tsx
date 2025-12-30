
"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle, X, HelpCircle } from "lucide-react";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'success' | 'warning' | 'danger' | 'info';
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = 'success'
}: ConfirmationModalProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Erro na confirmação:", error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = () => {
        switch (variant) {
            case 'success': return <CheckCircle size={24} />;
            case 'warning': return <AlertCircle size={24} />;
            case 'danger': return <AlertCircle size={24} />;
            default: return <HelpCircle size={24} />;
        }
    };

    const getColor = () => {
        switch (variant) {
            case 'success': return 'var(--color-success)';
            case 'warning': return 'var(--color-warning)';
            case 'danger': return 'var(--color-danger)';
            case 'info': return 'var(--color-primary)';
            default: return 'var(--color-primary)';
        }
    };

    const color = getColor();

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: color }}>
                        {getIcon()}
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </header>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                        {message}
                    </p>
                </div>

                <footer style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        className="btn"
                        onClick={onClose}
                        disabled={loading}
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        className="btn"
                        onClick={handleConfirm}
                        disabled={loading}
                        style={{
                            background: color,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {loading ? 'Processando...' : confirmText}
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
