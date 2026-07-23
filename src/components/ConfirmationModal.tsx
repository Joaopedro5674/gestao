
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
    const [mounted, setMounted] = useState(false);
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
            <div className="card shadow-lg animate-fade-in" style={{
                background: 'var(--color-surface-1)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '400px',
                padding: 'var(--space-lg)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                border: '1px solid var(--color-border)'
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
        </div>,
        document.body
    );
}
