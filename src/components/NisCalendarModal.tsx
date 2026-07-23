"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";

interface NisCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess?: () => void;
}

export default function NisCalendarModal({ isOpen, onClose, onSaveSuccess }: NisCalendarModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nisMap, setNisMap] = useState<Record<number, number>>({
        1: 18, 2: 19, 3: 20, 4: 21, 5: 22,
        6: 25, 7: 26, 8: 27, 9: 28, 0: 29
    });

    useEffect(() => {
        if (isOpen) {
            const fetchNisDates = async () => {
                setLoading(true);
                try {
                    const { data, error } = await supabase
                        .from("calendario_nis")
                        .select("final_nis, dia_pagamento")
                        .order("final_nis");
                    
                    if (data && !error && data.length > 0) {
                        const map: Record<number, number> = {};
                        data.forEach((row: any) => {
                            map[row.final_nis] = row.dia_pagamento;
                        });
                        setNisMap(map);
                    }
                } catch (err) {
                    console.error("Erro ao carregar datas do NIS:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchNisDates();
        }
    }, [isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = Object.entries(nisMap).map(([nis, day]) => ({
                final_nis: parseInt(nis, 10),
                dia_pagamento: day
            }));

            const { error } = await supabase
                .from("calendario_nis")
                .upsert(payload);

            if (error) throw error;

            showToast("Calendário NIS atualizado com sucesso!", "success");
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (err: any) {
            console.error("Erro ao salvar calendário NIS:", err);
            showToast("Erro ao salvar datas: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDayChange = (nis: number, val: string) => {
        let parsed = parseInt(val, 10) || 1;
        if (parsed > 31) parsed = 31;
        if (parsed < 1) parsed = 1;
        setNisMap(prev => ({ ...prev, [nis]: parsed }));
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))',
            backdropFilter: 'blur(8px)',
            overflowY: 'auto'
        }}>
            <div className="card shadow-lg" style={{
                width: '100%',
                maxWidth: '480px',
                padding: 'var(--space-lg)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Calendar size={24} color="var(--color-primary)" />
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Calendário do NIS</h2>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Ajuste o dia de liberação dos fundos para cada final de NIS. Os cálculos de vencimento serão atualizados de acordo.
                </p>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-secondary)' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                        Carregando datas...
                    </div>
                ) : (
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            maxHeight: '320px',
                            overflowY: 'auto',
                            padding: '4px'
                        }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((nis) => (
                                <div key={nis} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--color-surface-2)',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Final NIS {nis}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Dia</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={nisMap[nis] || ""}
                                            onChange={(e) => handleDayChange(nis, e.target.value)}
                                            style={{
                                                width: '50px',
                                                height: '32px',
                                                textAlign: 'center',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '4px',
                                                background: 'var(--color-surface-1)',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem'
                                            }}
                                            required
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn"
                                style={{ flex: 1, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} /> Salvar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
