"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = 'success' | 'info' | 'error';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type, id: Date.now() });
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--color-surface-1)',
                    color: 'var(--color-text-primary)',
                    padding: '12px 20px',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: 'var(--shadow-premium)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 9999,
                    animation: 'slideUpFade 0.3s ease-out',
                    border: '1px solid var(--color-border)',
                    minWidth: '300px',
                    maxWidth: '90vw'
                }}>
                    {toast.type === 'success' && <CheckCircle size={20} color="var(--color-success)" fill="rgba(var(--color-success-rgb), 0.1)" />}
                    {toast.type === 'info' && <Info size={20} color="var(--color-primary)" />}
                    {toast.type === 'error' && <AlertTriangle size={20} color="var(--color-danger)" />}
                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{toast.message}</span>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
