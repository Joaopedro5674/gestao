"use client";

import React, { useState, useEffect } from "react";
import { X, Calculator, Info, Plus, Trash2, TrendingUp, Share2, Save, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";

interface Simulacao {
    id: number;
    nome: string;
    valorInicial: string;
    taxaMensal: string;
    dataInicio: string;
    dataFim: string;
    cobrancaMensal: boolean;
    salvo: boolean;
}

interface SimulacaoResult {
    dias: number;
    jurosProporcional: number;
    valorTotal: number;
    isValid: boolean;
}

interface LoanCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function calcularSimulacao(sim: Simulacao): SimulacaoResult {
    const start = sim.dataInicio && sim.dataFim ? new Date(sim.dataInicio + 'T12:00:00') : null;
    const end = sim.dataInicio && sim.dataFim ? new Date(sim.dataFim + 'T12:00:00') : null;
    const v = parseFloat(sim.valorInicial.replace(/\./g, '').replace(',', '.'));
    const t = parseFloat(sim.taxaMensal.replace(',', '.'));

    let dias = 0;
    let jurosProporcional = 0;
    let valorTotal = 0;
    let isValid = false;

    if (start && end && !isNaN(v) && !isNaN(t)) {
        const diffTime = end.getTime() - start.getTime();
        dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dias >= 0 && v > 0 && t > 0) {
            const jMensal = v * (t / 100);
            jurosProporcional = jMensal * (dias / 30);
            valorTotal = v + jurosProporcional;
            isValid = true;
        }
    }

    return { dias, jurosProporcional, valorTotal, isValid };
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
};

let nextId = 1;

function criarSimulacao(): Simulacao {
    return {
        id: nextId++,
        nome: "",
        valorInicial: "3.000,00",
        taxaMensal: "10",
        dataInicio: new Date().toISOString().split('T')[0],
        dataFim: "",
        cobrancaMensal: false,
        salvo: false,
    };
}

function gerarTextoWhatsApp(simulacoes: Simulacao[]): string {
    const validSims = simulacoes
        .map(s => ({ sim: s, result: calcularSimulacao(s) }))
        .filter(r => r.result.isValid);

    if (validSims.length === 0) return '';

    let texto = '*Simulacao de Juros*\n\n';

    validSims.forEach((item, i) => {
        const { sim, result } = item;
        const nome = sim.nome.trim() || `Simulacao ${i + 1}`;
        const valor = parseFloat(sim.valorInicial.replace(/\./g, '').replace(',', '.'));

        texto += `-------------------\n`;
        texto += `> *${nome}*\n`;
        texto += `Capital: ${formatBRL(valor)}\n`;
        texto += `Taxa: ${sim.taxaMensal}% a.m.\n`;
        texto += `Periodo: ${formatDateBR(sim.dataInicio)} a ${formatDateBR(sim.dataFim)}\n`;
        texto += `Dias: ${result.dias}\n`;
        texto += `Juros: ${formatBRL(result.jurosProporcional)}\n`;
        texto += `*Total a Receber: ${formatBRL(result.valorTotal)}*\n\n`;
    });

    if (validSims.length >= 2) {
        const totalCapital = validSims.reduce((acc, r) => {
            const v = parseFloat(r.sim.valorInicial.replace(/\./g, '').replace(',', '.'));
            return acc + (isNaN(v) ? 0 : v);
        }, 0);
        const totalJuros = validSims.reduce((acc, r) => acc + r.result.jurosProporcional, 0);
        const totalGeral = validSims.reduce((acc, r) => acc + r.result.valorTotal, 0);

        texto += `-------------------\n`;
        texto += `*RESUMO TOTAL (${validSims.length} simulacoes)*\n`;
        texto += `Capital: ${formatBRL(totalCapital)}\n`;
        texto += `Juros: ${formatBRL(totalJuros)}\n`;
        texto += `*Retorno: ${formatBRL(totalGeral)}*\n`;
    }

    texto += `\n_* Calculo baseado em mes comercial (30 dias)._`;

    return texto;
}

const STORAGE_KEY = 'simulador_juros_data';

function loadFromStorage(): Simulacao[] {
    if (typeof window === 'undefined') return [criarSimulacao()];
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as Simulacao[];
            if (Array.isArray(parsed) && parsed.length > 0) {
                nextId = Math.max(...parsed.map(s => s.id)) + 1;
                return parsed;
            }
        }
    } catch { /* ignore */ }
    return [criarSimulacao()];
}

export default function LoanCalculatorModal({ isOpen, onClose }: LoanCalculatorModalProps) {
    const [simulacoes, setSimulacoes] = useState<Simulacao[]>(loadFromStorage);
    const [savingId, setSavingId] = useState<number | null>(null);
    const { adicionarEmprestimo } = useApp();
    const { showToast } = useToast();

    // Persist simulations to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(simulacoes));
        } catch { /* ignore */ }
    }, [simulacoes]);

    const addSimulacao = () => {
        setSimulacoes(prev => [...prev, criarSimulacao()]);
    };

    const removeSimulacao = (id: number) => {
        setSimulacoes(prev => prev.filter(s => s.id !== id));
    };

    const updateSimulacao = (id: number, field: keyof Simulacao, value: string) => {
        setSimulacoes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const formatValorInput = (value: string): string => {
        let val = value.replace(/[^0-9,]/g, '');
        const parts = val.split(',');
        if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('');
        const p = val.split(',');
        p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        if (p.length > 1) {
            p[1] = p[1].substring(0, 2);
            val = p[0] + ',' + p[1];
        } else {
            val = p[0];
        }
        return val;
    };

    const formatValorBlur = (value: string): string => {
        if (!value) return value;
        let val = value;
        if (!val.includes(',')) {
            val = val + ',00';
        } else {
            const p = val.split(',');
            if (p[1].length === 0) val = val + '00';
            else if (p[1].length === 1) val = val + '0';
        }
        return val;
    };

    const compartilharWhatsApp = () => {
        const texto = gerarTextoWhatsApp(simulacoes);
        if (!texto) return;
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    const salvarComoEmprestimo = async (sim: Simulacao) => {
        const result = calcularSimulacao(sim);
        if (!result.isValid) return;

        const nome = sim.nome.trim();
        if (!nome) {
            showToast("Preencha o nome/identificação antes de salvar", "error");
            return;
        }

        const valor = parseFloat(sim.valorInicial.replace(/\./g, '').replace(',', '.'));
        const taxa = parseFloat(sim.taxaMensal.replace(',', '.'));

        setSavingId(sim.id);
        try {
            await adicionarEmprestimo({
                cliente_nome: nome,
                telefone: '',
                valor_emprestado: valor,
                juros_mensal: taxa,
                dias_contratados: result.dias,
                juros_total_contratado: result.jurosProporcional,
                data_inicio: sim.dataInicio,
                data_fim: sim.dataFim,
                status: 'ativo',
                cobranca_mensal: sim.cobrancaMensal,
            });

            setSimulacoes(prev => prev.map(s => s.id === sim.id ? { ...s, salvo: true } : s));
            showToast(`Empréstimo de ${nome} salvo com sucesso!`, "success");
        } catch (error) {
            console.error("Erro ao salvar empréstimo:", error);
            showToast("Erro ao salvar empréstimo", "error");
        } finally {
            setSavingId(null);
        }
    };

    const salvarTodosValidos = async () => {
        const naoSalvos = simulacoes.filter(s => {
            const r = calcularSimulacao(s);
            return r.isValid && !s.salvo && s.nome.trim();
        });

        if (naoSalvos.length === 0) {
            showToast("Nenhuma simulação válida para salvar. Preencha o nome de cada uma.", "error");
            return;
        }

        for (const sim of naoSalvos) {
            await salvarComoEmprestimo(sim);
        }
    };

    // Calculate results for all simulations
    const results = simulacoes.map(s => ({ sim: s, result: calcularSimulacao(s) }));
    const validResults = results.filter(r => r.result.isValid);
    const totalJuros = validResults.reduce((acc, r) => acc + r.result.jurosProporcional, 0);
    const totalCapital = validResults.reduce((acc, r) => {
        const v = parseFloat(r.sim.valorInicial.replace(/\./g, '').replace(',', '.'));
        return acc + (isNaN(v) ? 0 : v);
    }, 0);
    const totalGeral = validResults.reduce((acc, r) => acc + r.result.valorTotal, 0);

    const hasValidResults = validResults.length > 0;
    const unsavedValidCount = validResults.filter(r => !r.sim.salvo && r.sim.nome.trim()).length;

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '520px', background: 'var(--color-surface-1)',
                padding: '24px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calculator size={22} className="text-primary" />Simulador de Juros
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Simulation Cards */}
                    {simulacoes.map((sim, index) => {
                        const result = calcularSimulacao(sim);
                        const isSaving = savingId === sim.id;
                        return (
                            <div key={sim.id} style={{
                                padding: '16px', background: 'var(--color-surface-2)',
                                borderRadius: 'var(--radius-md)',
                                border: sim.salvo ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
                                position: 'relative',
                                opacity: sim.salvo ? 0.85 : 1,
                            }}>
                                {/* Sim header */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginBottom: '12px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
                                            color: sim.salvo ? 'var(--color-success)' : 'var(--color-primary)', letterSpacing: '0.5px',
                                        }}>
                                            {sim.salvo ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Check size={14} /> Salvo
                                                </span>
                                            ) : (
                                                `Simulação ${index + 1}`
                                            )}
                                        </span>
                                    </div>
                                    {simulacoes.length > 1 && !sim.salvo && (
                                        <button
                                            onClick={() => removeSimulacao(sim.id)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--color-danger)', padding: '4px',
                                                display: 'flex', alignItems: 'center',
                                            }}
                                            title="Remover simulação"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Name field */}
                                <div className="form-group" style={{ margin: '0 0 10px 0' }}>
                                    <label className="label" style={{ fontSize: '0.7rem' }}>Nome / Identificação</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={sim.nome}
                                        onChange={(e) => updateSimulacao(sim.id, 'nome', e.target.value)}
                                        placeholder={`Ex: João, Empréstimo Casa...`}
                                        style={{ fontSize: '0.9rem' }}
                                        disabled={sim.salvo}
                                    />
                                </div>

                                {/* Input fields */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label" style={{ fontSize: '0.7rem' }}>Valor (R$)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={sim.valorInicial}
                                            onChange={(e) => updateSimulacao(sim.id, 'valorInicial', formatValorInput(e.target.value))}
                                            onBlur={() => updateSimulacao(sim.id, 'valorInicial', formatValorBlur(sim.valorInicial))}
                                            placeholder="0,00"
                                            style={{ fontSize: '0.9rem' }}
                                            disabled={sim.salvo}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label" style={{ fontSize: '0.7rem' }}>Taxa Mensal (%)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={sim.taxaMensal}
                                            onChange={e => updateSimulacao(sim.id, 'taxaMensal', e.target.value)}
                                            placeholder="0.0"
                                            step="0.01"
                                            style={{ fontSize: '0.9rem' }}
                                            disabled={sim.salvo}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label" style={{ fontSize: '0.7rem' }}>Data Início</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={sim.dataInicio}
                                            onChange={e => updateSimulacao(sim.id, 'dataInicio', e.target.value)}
                                            style={{ fontSize: '0.85rem' }}
                                            disabled={sim.salvo}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label" style={{ fontSize: '0.7rem' }}>Data Fim</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={sim.dataFim}
                                            onChange={e => updateSimulacao(sim.id, 'dataFim', e.target.value)}
                                            style={{ fontSize: '0.85rem' }}
                                            disabled={sim.salvo}
                                        />
                                    </div>
                                </div>

                                {/* Monthly interest toggle */}
                                <div
                                    onClick={() => !sim.salvo && setSimulacoes(prev => prev.map(s => s.id === sim.id ? { ...s, cobrancaMensal: !s.cobrancaMensal } : s))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'var(--color-surface-1)', padding: '10px 12px',
                                        borderRadius: '8px', marginTop: '10px',
                                        border: sim.cobrancaMensal ? '1px solid var(--color-primary)' : '1px solid transparent',
                                        cursor: sim.salvo ? 'not-allowed' : 'pointer', userSelect: 'none' as const,
                                        opacity: sim.salvo ? 0.6 : 1,
                                    }}
                                >
                                    <div style={{
                                        width: '36px', height: '20px',
                                        background: sim.cobrancaMensal ? 'var(--color-primary)' : '#555',
                                        borderRadius: '20px', position: 'relative' as const,
                                        transition: 'background 0.2s', flexShrink: 0,
                                    }}>
                                        <div style={{
                                            width: '16px', height: '16px', background: '#fff',
                                            borderRadius: '50%', position: 'absolute' as const,
                                            top: '2px', left: sim.cobrancaMensal ? '18px' : '2px',
                                            transition: 'left 0.2s',
                                        }} />
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontWeight: 500, fontSize: '0.8rem' }}>Cobrança mensal</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                                            {sim.cobrancaMensal ? 'Juros cobrados mensalmente' : 'Juros acumulam para o final'}
                                        </span>
                                    </div>
                                </div>

                                {/* Individual Result */}
                                {result.isValid && (
                                    <div style={{
                                        marginTop: '12px', paddingTop: '12px',
                                        borderTop: '1px solid var(--color-border)',
                                    }}>
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
                                            marginBottom: !sim.salvo ? '12px' : '0',
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Dias</div>
                                                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{result.dias}</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Juros</div>
                                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-success)' }}>
                                                    {formatBRL(result.jurosProporcional)}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Total</div>
                                                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                                                    {formatBRL(result.valorTotal)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Save as loan button */}
                                        {!sim.salvo && (
                                            <button
                                                onClick={() => salvarComoEmprestimo(sim)}
                                                disabled={isSaving || !sim.nome.trim()}
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: sim.nome.trim() ? 'var(--color-primary)' : 'var(--color-surface-1)',
                                                    color: sim.nome.trim() ? 'white' : 'var(--color-text-tertiary)',
                                                    border: sim.nome.trim() ? 'none' : '1px solid var(--color-border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                    padding: '8px', fontSize: '0.8rem', fontWeight: '600',
                                                    cursor: sim.nome.trim() ? 'pointer' : 'not-allowed',
                                                    opacity: isSaving ? 0.7 : 1,
                                                }}
                                                title={!sim.nome.trim() ? "Preencha o nome para salvar" : ""}
                                            >
                                                <Save size={14} />
                                                {isSaving ? 'Salvando...' : !sim.nome.trim() ? 'Preencha o nome para salvar' : 'Salvar como Empréstimo'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {!result.isValid && sim.dataFim === "" && (
                                    <div style={{
                                        marginTop: '10px', textAlign: 'center', color: 'var(--color-text-tertiary)',
                                        fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                                    }}>
                                        <Info size={12} /> Preencha a data fim para calcular
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add simulation button */}
                    <button
                        onClick={addSimulacao}
                        className="btn"
                        style={{
                            background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '12px', fontSize: '0.85rem', color: 'var(--color-primary)',
                            cursor: 'pointer', width: '100%', fontWeight: '600',
                        }}
                    >
                        <Plus size={18} /> Adicionar Simulação
                    </button>

                    {/* Combined Summary (only when 2+ valid) */}
                    {validResults.length >= 2 && (
                        <div style={{
                            padding: '16px', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-primary)',
                            background: 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.08)',
                        }}>
                            <div style={{
                                fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
                                color: 'var(--color-primary)', marginBottom: '12px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                <TrendingUp size={16} /> Resumo Total ({validResults.length} simulações)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Capital Total:</span>
                                    <span style={{ fontWeight: '700' }}>{formatBRL(totalCapital)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Juros Total:</span>
                                    <span style={{ fontWeight: '700', color: 'var(--color-success)' }}>{formatBRL(totalJuros)}</span>
                                </div>
                                <div style={{
                                    paddingTop: '8px', marginTop: '4px', borderTop: '1px solid var(--color-border)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Retorno Total:</span>
                                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                        {formatBRL(totalGeral)}
                                    </span>
                                </div>
                            </div>

                            {/* Save all button */}
                            {unsavedValidCount >= 2 && (
                                <button
                                    onClick={salvarTodosValidos}
                                    className="btn"
                                    style={{
                                        width: '100%', marginTop: '12px',
                                        background: 'var(--color-primary)', color: 'white', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        padding: '10px', fontSize: '0.85rem', fontWeight: '600',
                                    }}
                                >
                                    <Save size={16} /> Salvar Todos como Empréstimos ({unsavedValidCount})
                                </button>
                            )}
                        </div>
                    )}

                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textAlign: 'center', fontStyle: 'italic' }}>
                        * Cálculo baseado em mês comercial (30 dias).
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: hasValidResults ? '1fr 1fr' : '1fr', gap: '8px' }}>
                        {hasValidResults && (
                            <button
                                onClick={compartilharWhatsApp}
                                className="btn"
                                style={{
                                    background: '#25D366', color: 'white', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '0.75rem', fontWeight: '600', fontSize: '0.85rem',
                                }}
                            >
                                <Share2 size={16} /> WhatsApp
                            </button>
                        )}
                        <button onClick={onClose} className="btn btn-full" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
