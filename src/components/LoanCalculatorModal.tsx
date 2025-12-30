"use client";

import React, { useState, useEffect } from "react";
import { X, Calculator, Calendar, Info, Calculator as CalcIcon } from "lucide-react";

interface LoanCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoanCalculatorModal({ isOpen, onClose }: LoanCalculatorModalProps) {
    const [valorInicial, setValorInicial] = useState<string>("3000");
    const [taxaMensal, setTaxaMensal] = useState<string>("10");
    const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0]);
    const [dataFim, setDataFim] = useState<string>("");

    // Results
    const [dias, setDias] = useState<number>(0);
    const [jurosProporcional, setJurosProporcional] = useState<number>(0);
    const [valorTotal, setValorTotal] = useState<number>(0);
    const [isValid, setIsValid] = useState<boolean>(false);

    useEffect(() => {
        if (!dataInicio || !dataFim || !valorInicial || !taxaMensal) {
            setIsValid(false);
            return;
        }

        const start = new Date(dataInicio + 'T12:00:00');
        const end = new Date(dataFim + 'T12:00:00');

        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const v = parseFloat(valorInicial);
        const t = parseFloat(taxaMensal);

        if (diffDays >= 0 && v > 0 && t > 0) {
            setDias(diffDays);

            // Formula:
            // 1. jurosMensal = valorInicial * (taxaMensal / 100)
            // 2. jurosProporcional = jurosMensal * (dias / 30)
            // 3. valorTotal = valorInicial + jurosProporcional

            const jMensal = v * (t / 100);
            const jProp = jMensal * (diffDays / 30);

            setJurosProporcional(jProp);
            setValorTotal(v + jProp);
            setIsValid(true);
        } else {
            setIsValid(false);
        }
    }, [valorInicial, taxaMensal, dataInicio, dataFim]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '400px', background: 'var(--color-surface-1)',
                padding: '24px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calculator size={22} className="text-primary" />Simulador de Juros
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label className="label">Valor Inicial (R$)</label>
                        <input
                            type="number"
                            className="input"
                            value={valorInicial}
                            onChange={e => setValorInicial(e.target.value)}
                            placeholder="0,00"
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Taxa Mensal (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={taxaMensal}
                            onChange={e => setTaxaMensal(e.target.value)}
                            placeholder="0.0"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="label">Data Início</label>
                            <input
                                type="date"
                                className="input"
                                value={dataInicio}
                                onChange={e => setDataInicio(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Data Fim</label>
                            <input
                                type="date"
                                className="input"
                                value={dataFim}
                                onChange={e => setDataFim(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* RESULTS SECTION */}
                    <div style={{
                        marginTop: '8px', padding: '16px', background: 'var(--color-surface-2)',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)'
                    }}>
                        {!isValid ? (
                            <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Info size={14} /> Digite os valores para calcular
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Dias Contratados:</span>
                                    <span style={{ fontWeight: '700' }}>{dias} dias</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Juros Proporcional:</span>
                                    <span style={{ fontWeight: '700', color: 'var(--color-success)' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(jurosProporcional)}
                                    </span>
                                </div>
                                <div style={{
                                    paddingTop: '12px', marginTop: '4px', borderTop: '1px solid var(--color-border)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Valor Total:</span>
                                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textAlign: 'center', fontStyle: 'italic' }}>
                        * Cálculo baseado em mês comercial (30 dias).
                    </div>

                    <button onClick={onClose} className="btn btn-full" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
