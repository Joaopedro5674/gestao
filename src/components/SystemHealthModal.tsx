"use client";

import React from "react";
import { X, CheckCircle, AlertCircle, Database, Zap, Activity } from "lucide-react";

interface HealthStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    healthData: {
        supabase: boolean;
        lastHeartbeat: string | null;
        isHealthy: boolean;
        checkedAt: string;
    } | null;
    isLoading: boolean;
}

export default function SystemHealthModal({ isOpen, onClose, healthData, isLoading }: HealthStatusModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '400px', background: 'var(--color-surface-1)',
                padding: '24px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Status do Sistema</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                        <X size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <Activity size={32} className="spin-anim" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
                        <p style={{ color: 'var(--color-text-secondary)' }}>Diagnosticando sistema...</p>
                    </div>
                ) : healthData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* MAIN STATUS */}
                        <div style={{
                            padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                            background: healthData.isHealthy ? 'rgba(var(--color-success-rgb), 0.1)' : 'rgba(var(--color-error-rgb), 0.1)',
                            border: `1px solid ${healthData.isHealthy ? 'var(--color-success)' : 'var(--color-error)'}`,
                            marginBottom: '8px'
                        }}>
                            {healthData.isHealthy ? (
                                <>
                                    <CheckCircle size={32} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
                                    <h4 style={{ color: 'var(--color-success)', fontWeight: '700' }}>SISTEMA OK</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-success)', opacity: 0.9 }}>Conexão e mecanismos de anti-hibernação ativos.</p>
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: '8px' }} />
                                    <h4 style={{ color: 'var(--color-error)', fontWeight: '700' }}>ATENÇÃO NECESSÁRIA</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-error)', opacity: 0.9 }}>Detectada possível instabilidade ou atraso no heartbeat.</p>
                                </>
                            )}
                        </div>

                        {/* DETAILS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                                    <Database size={16} /> Supabase Connection
                                </span>
                                <span style={{ color: healthData.supabase ? 'var(--color-success)' : 'var(--color-error)', fontWeight: '600' }}>
                                    {healthData.supabase ? 'Online' : 'Erro'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                                    <Zap size={16} /> Último Heartbeat
                                </span>
                                <span style={{ color: healthData.lastHeartbeat ? 'var(--color-text-primary)' : 'var(--color-error)', fontWeight: '600' }}>
                                    {healthData.lastHeartbeat ? new Date(healthData.lastHeartbeat).toLocaleTimeString('pt-BR') : 'Sem dados'}
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                            Verificado em: {new Date(healthData.checkedAt).toLocaleString('pt-BR')}
                        </div>

                        <button onClick={onClose} className="btn btn-full" style={{ marginTop: '8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            Fechar
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
