"use client";

import React, { useState, useEffect } from "react";
import { X, Calculator, Info, Plus, Trash2, TrendingUp, Share2, Save, Check, CreditCard, DollarSign, Calendar, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";
import { calcularFinanceiroCartao, calcularVencimentoCartao, calcularVencimentoParcela } from "@/utils/loanHelpers";

export type ModalidadeSimulacao = 'comum' | 'cartao';

export interface ParcelaPrevista {
    numero: number;
    mesReferencia: string;
    dataVencimento: string;
    valor: number;
    tipo: string;
}

export interface Simulacao {
    id: number;
    tipo: ModalidadeSimulacao;
    nome: string;
    // Comum fields
    valorInicial: string;
    taxaMensal: string;
    dataInicio: string;
    dataFim: string;
    cobrancaMensal: boolean;
    // Cartão fields
    senha: string;
    valorRetirada: string;
    quantidadeMeses: string;
    finalNis: string;
    // Extras
    numeroCheque: string;
    observacoes: string;
    salvo: boolean;
    mostrarTabelaParcelas?: boolean;
}

export interface SimulacaoResult {
    dias: number;
    jurosProporcional: number;
    valorTotal: number;
    isValid: boolean;
    taxaEquivalente?: number;
    parcelas: ParcelaPrevista[];
}

interface LoanCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function calcularSimulacao(sim: Simulacao, nisCalendar: Record<number, number>): SimulacaoResult {
    if (sim.tipo === 'cartao') {
        const v = parseFloat(sim.valorInicial.replace(/\./g, '').replace(',', '.'));
        const r = parseFloat(sim.valorRetirada.replace(/\./g, '').replace(',', '.'));
        const m = parseInt(sim.quantidadeMeses, 10);
        const nis = parseInt(sim.finalNis, 10);

        if (isNaN(v) || isNaN(r) || isNaN(m) || isNaN(nis) || v <= 0 || r <= 0 || m <= 0) {
            return { dias: 0, jurosProporcional: 0, valorTotal: 0, isValid: false, parcelas: [] };
        }

        const calc = calcularFinanceiroCartao(v, r, m);
        const dataFimCalculada = calcularVencimentoCartao(sim.dataInicio, nis, m, nisCalendar);
        
        let dias = m * 30;
        if (sim.dataInicio && dataFimCalculada) {
            const start = new Date(sim.dataInicio + 'T12:00:00');
            const end = new Date(dataFimCalculada + 'T12:00:00');
            dias = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }

        // Tabela de Parcelas
        const parcelas: ParcelaPrevista[] = [];
        if (sim.dataInicio) {
            const start = new Date(sim.dataInicio + 'T12:00:00');
            const startYear = start.getFullYear();
            const startMonth = start.getMonth() + 1;
            const startDay = start.getDate();
            const payDay = nisCalendar[nis] || 25;
            const offsetMonth = startDay > payDay ? 1 : 0;

            for (let i = 1; i <= m; i++) {
                const targetYear = startYear + Math.floor((startMonth - 1 + i - 1 + offsetMonth) / 12);
                const targetMonthNum = ((startMonth - 1 + i - 1 + offsetMonth) % 12) + 1;
                const mesRef = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;
                
                const dueObj = calcularVencimentoParcela(sim.dataInicio, mesRef, true, nis, nisCalendar);
                const dueStr = dueObj.toLocaleDateString('pt-BR');

                parcelas.push({
                    numero: i,
                    mesReferencia: mesRef,
                    dataVencimento: dueStr,
                    valor: r,
                    tipo: 'Retirada Cartão'
                });
            }
        }

        return {
            dias,
            jurosProporcional: calc.interest,
            valorTotal: calc.total,
            taxaEquivalente: calc.rate,
            isValid: true,
            parcelas
        };
    } else {
        // Modalidade COMUM
        const start = sim.dataInicio && sim.dataFim ? new Date(sim.dataInicio + 'T12:00:00') : null;
        const end = sim.dataInicio && sim.dataFim ? new Date(sim.dataFim + 'T12:00:00') : null;
        const v = parseFloat(sim.valorInicial.replace(/\./g, '').replace(',', '.'));
        const t = parseFloat(sim.taxaMensal.replace(',', '.'));

        let dias = 0;
        let jurosProporcional = 0;
        let valorTotal = 0;
        let isValid = false;
        const parcelas: ParcelaPrevista[] = [];

        if (start && end && !isNaN(v) && !isNaN(t)) {
            const diffTime = end.getTime() - start.getTime();
            dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (dias >= 0 && v > 0 && t > 0) {
                const jMensal = v * (t / 100);
                jurosProporcional = jMensal * (dias / 30);
                valorTotal = v + jurosProporcional;
                isValid = true;

                // Tabela de parcelas se cobrancaMensal ativa
                if (sim.cobrancaMensal) {
                    const totalMonths = Math.max(1, Math.ceil(dias / 30));
                    const startYear = start.getFullYear();
                    const startMonth = start.getMonth() + 1;

                    for (let i = 1; i <= totalMonths; i++) {
                        const targetYear = startYear + Math.floor((startMonth - 1 + i - 1) / 12);
                        const targetMonthNum = ((startMonth - 1 + i - 1) % 12) + 1;
                        const mesRef = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;
                        
                        const dueObj = calcularVencimentoParcela(sim.dataInicio, mesRef, false, null, nisCalendar);
                        const dueStr = dueObj.toLocaleDateString('pt-BR');

                        parcelas.push({
                            numero: i,
                            mesReferencia: mesRef,
                            dataVencimento: dueStr,
                            valor: jMensal,
                            tipo: 'Juros Mensal'
                        });
                    }
                }
            }
        }

        return { dias, jurosProporcional, valorTotal, isValid, parcelas };
    }
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
};

let nextId = 1;

function criarSimulacao(tipo: ModalidadeSimulacao = 'comum'): Simulacao {
    return {
        id: nextId++,
        tipo,
        nome: "",
        valorInicial: "3.000,00",
        taxaMensal: "10",
        dataInicio: new Date().toISOString().split('T')[0],
        dataFim: "",
        cobrancaMensal: false,
        senha: "",
        valorRetirada: "450,00",
        quantidadeMeses: "6",
        finalNis: "0",
        numeroCheque: "",
        observacoes: "",
        salvo: false,
        mostrarTabelaParcelas: false,
    };
}

function gerarTextoWhatsApp(simulacoes: Simulacao[], nisCalendar: Record<number, number>): string {
    const validSims = simulacoes
        .map(s => ({ sim: s, result: calcularSimulacao(s, nisCalendar) }))
        .filter(r => r.result.isValid);

    if (validSims.length === 0) return '';

    let texto = '*Simulação de Empréstimos*\n\n';

    validSims.forEach((item, i) => {
        const { sim, result } = item;
        const nome = sim.nome.trim() || `Simulação ${i + 1}`;
        const valor = parseFloat(sim.valorInicial.replace(/\./g, '').replace(',', '.'));

        texto += `-------------------\n`;
        texto += `> *${nome}*\n`;
        texto += `Modalidade: ${sim.tipo === 'cartao' ? '💳 Cartão Retirada' : '💵 Empréstimo Comum'}\n`;
        
        if (sim.tipo === 'cartao') {
            const retirada = parseFloat(sim.valorRetirada.replace(/\./g, '').replace(',', '.'));
            texto += `Capital Repassado: ${formatBRL(valor)}\n`;
            texto += `Retirada Mensal: ${formatBRL(retirada)} x ${sim.quantidadeMeses} meses\n`;
            texto += `NIS Final: ${sim.finalNis}\n`;
            if (result.taxaEquivalente) texto += `Taxa Mensal Aprox: ${result.taxaEquivalente.toFixed(2)}% a.m.\n`;
            texto += `Lucro Estimado: ${formatBRL(result.jurosProporcional)}\n`;
            texto += `*Total Retirado: ${formatBRL(result.valorTotal)}*\n\n`;
        } else {
            texto += `Capital: ${formatBRL(valor)}\n`;
            texto += `Taxa: ${sim.taxaMensal}% a.m.\n`;
            texto += `Período: ${formatDateBR(sim.dataInicio)} a ${formatDateBR(sim.dataFim)}\n`;
            texto += `Dias: ${result.dias}\n`;
            if (sim.numeroCheque) texto += `Cheque: Nº ${sim.numeroCheque}\n`;
            texto += `Juros: ${formatBRL(result.jurosProporcional)}\n`;
            texto += `*Total a Receber: ${formatBRL(result.valorTotal)}*\n\n`;
        }
    });

    if (validSims.length >= 2) {
        const totalCapital = validSims.reduce((acc, r) => {
            const v = parseFloat(r.sim.valorInicial.replace(/\./g, '').replace(',', '.'));
            return acc + (isNaN(v) ? 0 : v);
        }, 0);
        const totalJuros = validSims.reduce((acc, r) => acc + r.result.jurosProporcional, 0);
        const totalGeral = validSims.reduce((acc, r) => acc + r.result.valorTotal, 0);

        texto += `-------------------\n`;
        texto += `*RESUMO TOTAL (${validSims.length} simulações)*\n`;
        texto += `Capital Total: ${formatBRL(totalCapital)}\n`;
        texto += `Lucro/Juros Total: ${formatBRL(totalJuros)}\n`;
        texto += `*Retorno Total: ${formatBRL(totalGeral)}*\n`;
    }

    return texto;
}

const STORAGE_KEY = 'simulador_juros_data_v2';

function loadFromStorage(): Simulacao[] {
    if (typeof window === 'undefined') return [criarSimulacao('comum')];
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
    return [criarSimulacao('comum')];
}

export default function LoanCalculatorModal({ isOpen, onClose }: LoanCalculatorModalProps) {
    const [simulacoes, setSimulacoes] = useState<Simulacao[]>(loadFromStorage);
    const [savingId, setSavingId] = useState<number | null>(null);
    const { adicionarEmprestimo, nisCalendar } = useApp();
    const { showToast } = useToast();

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

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(simulacoes));
        } catch { /* ignore */ }
    }, [simulacoes]);

    const addSimulacao = (tipo: ModalidadeSimulacao = 'comum') => {
        setSimulacoes(prev => [...prev, criarSimulacao(tipo)]);
    };

    const removeSimulacao = (id: number) => {
        setSimulacoes(prev => prev.filter(s => s.id !== id));
    };

    const updateSimulacao = (id: number, field: keyof Simulacao, value: any) => {
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
        const texto = gerarTextoWhatsApp(simulacoes, nisCalendar);
        if (!texto) return;
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    const salvarComoEmprestimo = async (sim: Simulacao) => {
        const result = calcularSimulacao(sim, nisCalendar);
        if (!result.isValid) return;

        const nome = sim.nome.trim();
        if (!nome) {
            showToast("Preencha o nome/identificação antes de salvar", "error");
            return;
        }

        const valor = parseFloat(sim.valorInicial.replace(/\./g, '').replace(',', '.'));

        setSavingId(sim.id);
        try {
            if (sim.tipo === 'cartao') {
                const retirada = parseFloat(sim.valorRetirada.replace(/\./g, '').replace(',', '.'));
                const meses = parseInt(sim.quantidadeMeses, 10) || 1;
                const nis = parseInt(sim.finalNis, 10);
                const dataFimCartao = calcularVencimentoCartao(sim.dataInicio, nis, meses, nisCalendar);

                await adicionarEmprestimo({
                    cliente_nome: nome,
                    telefone: '',
                    valor_emprestado: valor,
                    juros_mensal: result.taxaEquivalente || 0,
                    dias_contratados: result.dias,
                    juros_total_contratado: result.jurosProporcional,
                    data_inicio: sim.dataInicio,
                    data_fim: dataFimCartao,
                    status: 'ativo',
                    cobranca_mensal: true,
                    tipo: 'cartao',
                    cartao_senha: sim.senha,
                    cartao_valor_retirada: retirada,
                    cartao_final_nis: nis,
                    cartao_quantidade_meses: meses,
                    observacoes: sim.observacoes.trim() || undefined,
                });
            } else {
                const taxa = parseFloat(sim.taxaMensal.replace(',', '.'));

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
                    tipo: 'comum',
                    numero_cheque: sim.numeroCheque.trim() || undefined,
                    observacoes: sim.observacoes.trim() || undefined,
                });
            }

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
            const r = calcularSimulacao(s, nisCalendar);
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

    const results = simulacoes.map(s => ({ sim: s, result: calcularSimulacao(s, nisCalendar) }));
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
                width: '100%', maxWidth: '600px',
                background: 'var(--color-surface-1)',
                borderRadius: '16px',
                border: '1px solid var(--color-border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                maxHeight: 'calc(100dvh - 32px - env(safe-area-inset-bottom, 0px))',
                height: 'auto',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                padding: 0
            }}>
                {/* Sticky Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', background: 'var(--color-surface-1)',
                    borderBottom: '1px solid var(--color-border)', flexShrink: 0
                }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)', margin: 0 }}>
                        <Calculator size={22} style={{ color: 'var(--color-primary)' }} />Simulador de Juros & Cartões
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '4px' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', WebkitOverflowScrolling: 'touch' }}>
                    {/* Simulation Cards */}
                    {simulacoes.map((sim, index) => {
                        const result = calcularSimulacao(sim, nisCalendar);
                        const isSaving = savingId === sim.id;
                        const isCartao = sim.tipo === 'cartao';

                        return (
                            <div key={sim.id} style={{
                                padding: '18px', background: 'var(--color-surface-2)',
                                borderRadius: 'var(--radius-md)',
                                border: sim.salvo ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
                                position: 'relative',
                                opacity: sim.salvo ? 0.85 : 1,
                            }}>
                                {/* Sim Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase',
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
                                                color: 'var(--color-danger)', padding: '4px', display: 'flex', alignItems: 'center',
                                            }}
                                            title="Remover simulação"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Modalidade Switcher */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
                                    background: 'var(--color-surface-1)', padding: '4px', borderRadius: '8px',
                                    marginBottom: '14px', border: '1px solid var(--color-border)'
                                }}>
                                    <button
                                        type="button"
                                        disabled={sim.salvo}
                                        onClick={() => updateSimulacao(sim.id, 'tipo', 'comum')}
                                        style={{
                                            padding: '8px', borderRadius: '6px', border: 'none',
                                            background: !isCartao ? 'var(--color-primary)' : 'transparent',
                                            color: !isCartao ? 'white' : 'var(--color-text-secondary)',
                                            fontWeight: '700', fontSize: '0.8rem', cursor: sim.salvo ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <DollarSign size={14} /> Empréstimo Comum
                                    </button>
                                    <button
                                        type="button"
                                        disabled={sim.salvo}
                                        onClick={() => updateSimulacao(sim.id, 'tipo', 'cartao')}
                                        style={{
                                            padding: '8px', borderRadius: '6px', border: 'none',
                                            background: isCartao ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                                            color: isCartao ? 'white' : 'var(--color-text-secondary)',
                                            fontWeight: '700', fontSize: '0.8rem', cursor: sim.salvo ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <CreditCard size={14} /> Cartão (Retirada)
                                    </button>
                                </div>

                                {/* Name Field */}
                                <div className="form-group" style={{ margin: '0 0 12px 0' }}>
                                    <label className="label" style={{ fontSize: '0.75rem' }}>Nome / Identificação</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={sim.nome}
                                        onChange={(e) => updateSimulacao(sim.id, 'nome', e.target.value)}
                                        placeholder="Ex: Maria Silva"
                                        style={{ fontSize: '0.9rem' }}
                                        disabled={sim.salvo}
                                    />
                                </div>

                                {/* DYNAMIC INPUT FIELDS */}
                                {isCartao ? (
                                    /* CARTÃO FIELDS */
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Capital Repassado (R$)</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={sim.valorInicial}
                                                onChange={(e) => updateSimulacao(sim.id, 'valorInicial', formatValorInput(e.target.value))}
                                                onBlur={() => updateSimulacao(sim.id, 'valorInicial', formatValorBlur(sim.valorInicial))}
                                                placeholder="3.000,00"
                                                style={{ fontSize: '0.9rem' }}
                                                disabled={sim.salvo}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Retirada Mensal (R$)</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={sim.valorRetirada}
                                                onChange={(e) => updateSimulacao(sim.id, 'valorRetirada', formatValorInput(e.target.value))}
                                                onBlur={() => updateSimulacao(sim.id, 'valorRetirada', formatValorBlur(sim.valorRetirada))}
                                                placeholder="450,00"
                                                style={{ fontSize: '0.9rem' }}
                                                disabled={sim.salvo}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Final do NIS</label>
                                            <select
                                                className="input"
                                                value={sim.finalNis}
                                                onChange={(e) => updateSimulacao(sim.id, 'finalNis', e.target.value)}
                                                disabled={sim.salvo}
                                                style={{ fontSize: '0.85rem', padding: '0 8px', height: '42px' }}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(nis => (
                                                    <option key={nis} value={nis}>
                                                        NIS {nis} (Dia {nisCalendar[nis] || 25})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Quantidade de Meses</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="input"
                                                value={sim.quantidadeMeses}
                                                onChange={e => updateSimulacao(sim.id, 'quantidadeMeses', e.target.value)}
                                                placeholder="6"
                                                style={{ fontSize: '0.9rem' }}
                                                disabled={sim.salvo}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Data de Início</label>
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
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Senha do Cartão (Opcional)</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={sim.senha}
                                                onChange={e => updateSimulacao(sim.id, 'senha', e.target.value)}
                                                placeholder="Ex: 1234"
                                                style={{ fontSize: '0.85rem' }}
                                                disabled={sim.salvo}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    /* COMUM FIELDS */
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
                                        <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Número do Cheque (Opcional)</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={sim.numeroCheque}
                                                onChange={e => updateSimulacao(sim.id, 'numeroCheque', e.target.value)}
                                                placeholder="Ex: 850082"
                                                style={{ fontSize: '0.85rem' }}
                                                disabled={sim.salvo}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Observações livre */}
                                <div className="form-group" style={{ margin: '10px 0 0 0' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        value={sim.observacoes}
                                        onChange={e => updateSimulacao(sim.id, 'observacoes', e.target.value)}
                                        placeholder="Observações (Opcional)"
                                        style={{ fontSize: '0.8rem' }}
                                        disabled={sim.salvo}
                                    />
                                </div>

                                {/* Monthly Interest Toggle (only for Comum) */}
                                {!isCartao && (
                                    <div
                                        onClick={() => !sim.salvo && updateSimulacao(sim.id, 'cobrancaMensal', !sim.cobrancaMensal)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            background: 'var(--color-surface-1)', padding: '10px 12px',
                                            borderRadius: '8px', marginTop: '10px',
                                            border: sim.cobrancaMensal ? '1px solid var(--color-primary)' : '1px solid transparent',
                                            cursor: sim.salvo ? 'not-allowed' : 'pointer', userSelect: 'none',
                                            opacity: sim.salvo ? 0.6 : 1,
                                        }}
                                    >
                                        <div style={{
                                            width: '36px', height: '20px',
                                            background: sim.cobrancaMensal ? 'var(--color-primary)' : '#555',
                                            borderRadius: '20px', position: 'relative',
                                            transition: 'background 0.2s', flexShrink: 0,
                                        }}>
                                            <div style={{
                                                width: '16px', height: '16px', background: '#fff',
                                                borderRadius: '50%', position: 'absolute',
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
                                )}

                                {/* INDIVIDUAL RESULT DISPLAY */}
                                {result.isValid && (
                                    <div style={{
                                        marginTop: '14px', paddingTop: '12px',
                                        borderTop: '1px solid var(--color-border)',
                                    }}>
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: isCartao ? '1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '8px',
                                            marginBottom: '12px',
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                                                    {isCartao ? 'Prazo / NIS' : 'Dias'}
                                                </div>
                                                <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                                                    {isCartao ? `${sim.quantidadeMeses}m (Dia ${nisCalendar[parseInt(sim.finalNis)] || 25})` : `${result.dias} dias`}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                                                    {isCartao ? 'Lucro Estimado' : 'Juros'}
                                                </div>
                                                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--color-success)' }}>
                                                    {formatBRL(result.jurosProporcional)}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                                                    {isCartao ? 'Total Retirado' : 'Total'}
                                                </div>
                                                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                                                    {formatBRL(result.valorTotal)}
                                                </div>
                                            </div>
                                        </div>

                                        {isCartao && result.taxaEquivalente !== undefined && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textAlign: 'center', fontWeight: '600', marginBottom: '10px' }}>
                                                Taxa Mensal Equivalente: {result.taxaEquivalente.toFixed(2)}% a.m.
                                            </div>
                                        )}

                                        {/* TABELA DE PARCELAS PREVISTAS (EXPANDÁVEL) */}
                                        {result.parcelas.length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => updateSimulacao(sim.id, 'mostrarTabelaParcelas', !sim.mostrarTabelaParcelas)}
                                                    style={{
                                                        width: '100%', background: 'var(--color-surface-1)',
                                                        border: '1px solid var(--color-border)', borderRadius: '6px',
                                                        padding: '8px 12px', fontSize: '0.75rem', fontWeight: '700',
                                                        color: 'var(--color-text-primary)', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                    }}
                                                >
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <FileText size={14} color="var(--color-primary)" />
                                                        Tabela de Parcelas Previstas ({result.parcelas.length})
                                                    </span>
                                                    {sim.mostrarTabelaParcelas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>

                                                {sim.mostrarTabelaParcelas && (
                                                    <div style={{
                                                        marginTop: '8px', background: 'var(--color-surface-1)',
                                                        borderRadius: '6px', border: '1px solid var(--color-border)',
                                                        overflow: 'hidden', fontSize: '0.75rem'
                                                    }}>
                                                        <div style={{
                                                            display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr',
                                                            background: 'var(--color-surface-2)', padding: '6px 10px',
                                                            fontWeight: '700', color: 'var(--color-text-secondary)',
                                                            borderBottom: '1px solid var(--color-border)'
                                                        }}>
                                                            <span>#</span>
                                                            <span>Mês Ref.</span>
                                                            <span>Vencimento</span>
                                                            <span style={{ textAlign: 'right' }}>Valor</span>
                                                        </div>
                                                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                            {result.parcelas.map(p => (
                                                                <div key={p.numero} style={{
                                                                    display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr',
                                                                    padding: '6px 10px', borderBottom: '1px solid var(--color-border)',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>P{p.numero}</span>
                                                                    <span>{p.mesReferencia}</span>
                                                                    <span>{p.dataVencimento}</span>
                                                                    <span style={{ textAlign: 'right', fontWeight: '700' }}>{formatBRL(p.valor)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Save as Loan button */}
                                        {!sim.salvo && (
                                            <button
                                                onClick={() => salvarComoEmprestimo(sim)}
                                                disabled={isSaving || !sim.nome.trim()}
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: sim.nome.trim() ? (isCartao ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--color-primary)') : 'var(--color-surface-1)',
                                                    color: sim.nome.trim() ? 'white' : 'var(--color-text-tertiary)',
                                                    border: sim.nome.trim() ? 'none' : '1px solid var(--color-border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                    padding: '10px', fontSize: '0.8rem', fontWeight: '700',
                                                    cursor: sim.nome.trim() ? 'pointer' : 'not-allowed',
                                                    opacity: isSaving ? 0.7 : 1, borderRadius: '8px'
                                                }}
                                                title={!sim.nome.trim() ? "Preencha o nome para salvar" : ""}
                                            >
                                                <Save size={16} />
                                                {isSaving ? 'Salvando...' : !sim.nome.trim() ? 'Preencha o nome para salvar' : `Salvar como ${isCartao ? 'Cartão' : 'Empréstimo'}`}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {!result.isValid && (
                                    <div style={{
                                        marginTop: '10px', textAlign: 'center', color: 'var(--color-text-tertiary)',
                                        fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                                    }}>
                                        <Info size={12} /> {isCartao ? 'Preencha os valores e NIS para calcular' : 'Preencha a data fim para calcular'}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add simulation buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                            onClick={() => addSimulacao('comum')}
                            className="btn"
                            style={{
                                background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '10px', fontSize: '0.8rem', color: 'var(--color-primary)',
                                cursor: 'pointer', fontWeight: '700', borderRadius: '8px'
                            }}
                        >
                            <Plus size={16} /> + Simulação Comum
                        </button>
                        <button
                            onClick={() => addSimulacao('cartao')}
                            className="btn"
                            style={{
                                background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '10px', fontSize: '0.8rem', color: '#6366f1',
                                cursor: 'pointer', fontWeight: '700', borderRadius: '8px'
                            }}
                        >
                            <Plus size={16} /> + Simulação Cartão
                        </button>
                    </div>

                    {/* Combined Summary */}
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
                                <TrendingUp size={16} /> Resumo Geral Consolidado ({validResults.length} simulações)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Capital Total Investido:</span>
                                    <span style={{ fontWeight: '700' }}>{formatBRL(totalCapital)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Lucro Total Estimado:</span>
                                    <span style={{ fontWeight: '700', color: 'var(--color-success)' }}>{formatBRL(totalJuros)}</span>
                                </div>
                                <div style={{
                                    paddingTop: '8px', marginTop: '4px', borderTop: '1px solid var(--color-border)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Retorno Total Bruto:</span>
                                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                                        {formatBRL(totalGeral)}
                                    </span>
                                </div>
                            </div>

                            {unsavedValidCount >= 2 && (
                                <button
                                    onClick={salvarTodosValidos}
                                    className="btn"
                                    style={{
                                        width: '100%', marginTop: '12px',
                                        background: 'var(--color-primary)', color: 'white', border: 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        padding: '10px', fontSize: '0.85rem', fontWeight: '700', borderRadius: '8px'
                                    }}
                                >
                                    <Save size={16} /> Salvar Todas as Simulações ({unsavedValidCount})
                                </button>
                            )}
                        </div>
                    )}

                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textAlign: 'center', fontStyle: 'italic' }}>
                        * Cálculos de cartão utilizam a regra oficial de vencimento NIS do Supabase.
                    </div>
                </div>

                {/* Sticky Footer */}
                <div style={{
                    padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))',
                    background: 'var(--color-surface-1)',
                    borderTop: '1px solid var(--color-border)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: hasValidResults ? '1fr 1fr' : '1fr', gap: '8px' }}>
                        {hasValidResults && (
                            <button
                                onClick={compartilharWhatsApp}
                                className="btn"
                                style={{
                                    background: '#25D366', color: 'white', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '0.75rem', fontWeight: '700', fontSize: '0.85rem', borderRadius: '8px'
                                }}
                            >
                                <Share2 size={16} /> Compartilhar WhatsApp
                            </button>
                        )}
                        <button onClick={onClose} className="btn btn-full" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 700 }}>
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

