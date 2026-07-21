"use client";
 
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabaseClient";
import { calcularVencimentoCartao, calcularFinanceiroCartao } from "@/utils/loanHelpers";

function NewLoanPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isCartao = searchParams.get('type') === 'cartao';
    const { adicionarEmprestimo } = useApp();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        borrowerName: "",
        phone: "",
        principal: "",
        interestRate: "",
        startDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        monthlyInterest: false
    });

    const [cartaoData, setCartaoData] = useState({
        senha: "",
        valorRetirada: "",
        quantidadeMeses: "",
        finalNis: ""
    });

    // NIS payment day mapping fetched from Supabase
    const [nisCalendar, setNisCalendar] = useState<Record<number, number>>({
        1: 18, 2: 19, 3: 20, 4: 21, 5: 22,
        6: 25, 7: 26, 8: 27, 9: 28, 0: 29 // Fallback values
    });

    useEffect(() => {
        const fetchNisCalendar = async () => {
            try {
                const { data, error } = await supabase
                    .from('calendario_nis')
                    .select('final_nis, dia_pagamento');
                if (data && !error) {
                    const map: Record<number, number> = {};
                    data.forEach((row: any) => {
                        map[row.final_nis] = row.dia_pagamento;
                    });
                    setNisCalendar(map);
                }
            } catch (err) {
                console.error("Erro ao carregar calendario_nis:", err);
            }
        };
        fetchNisCalendar();
    }, []);

    // Auto-calculate dueDate for Card Loans when NIS or Months or StartDate changes
    useEffect(() => {
        if (isCartao && cartaoData.finalNis !== "" && cartaoData.quantidadeMeses !== "" && formData.startDate) {
            const finalNisNum = parseInt(cartaoData.finalNis, 10);
            const monthsNum = parseInt(cartaoData.quantidadeMeses, 10) || 1;
            const formattedDueDate = calcularVencimentoCartao(formData.startDate, finalNisNum, monthsNum, nisCalendar);
            if (formattedDueDate) {
                setFormData(prev => ({ ...prev, dueDate: formattedDueDate }));
            }
        }
    }, [isCartao, cartaoData.finalNis, cartaoData.quantidadeMeses, formData.startDate, nisCalendar]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 11) v = v.substring(0, 11);
        
        let formatted = v;
        if (v.length > 10) {
            formatted = v.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, "($1) $2 $3-$4");
        } else if (v.length > 6) {
            formatted = v.replace(/^(\d{2})(\d{4})(\d{1,4})$/, "($1) $2-$3");
        } else if (v.length > 2) {
            formatted = v.replace(/^(\d{2})(\d{1,4})$/, "($1) $2");
        } else if (v.length > 0) {
            formatted = v.replace(/^(\d{1,2})$/, "($1");
        }
        
        setFormData({ ...formData, phone: formatted });
    };

    const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value;
        v = v.replace(/[^\d,]/g, "");
        const parts = v.split(',');
        let integerPart = parts[0];
        let decimalPart = parts.length > 1 ? parts.slice(1).join('').substring(0, 2) : null;
        
        if (integerPart) {
            integerPart = parseInt(integerPart, 10).toString();
            if (integerPart === 'NaN') integerPart = '0';
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
        
        let formatted = integerPart;
        if (decimalPart !== null) {
            formatted += ',' + decimalPart;
        }
        setFormData({ ...formData, principal: formatted });
    };

    const handlePrincipalBlur = () => {
        let v = formData.principal;
        if (!v) return;
        if (!v.includes(',')) {
            v += ',00';
        } else {
            const parts = v.split(',');
            if (parts[1].length === 0) v += '00';
            else if (parts[1].length === 1) v += '0';
        }
        setFormData({ ...formData, principal: v });
    };

    // Parsed numeric fields
    const principal = parseFloat(formData.principal.replace(/\./g, '').replace(',', '.')) || 0;
    const rate = parseFloat(formData.interestRate.replace(',', '.')) || 0;

    // Live Calculation
    let totalDays = 0;
    let interest = 0;
    let total = 0;
    let computedRate = 0;

    if (isCartao) {
        const months = parseInt(cartaoData.quantidadeMeses, 10) || 1;
        const vRetirada = parseFloat(cartaoData.valorRetirada.replace(/\./g, '').replace(',', '.')) || 0;
        const calc = calcularFinanceiroCartao(principal, vRetirada, months);
        total = calc.total;
        interest = calc.interest;
        computedRate = calc.rate;
        
        if (formData.startDate && formData.dueDate) {
            const start = new Date(formData.startDate + 'T12:00:00');
            const end = new Date(formData.dueDate + 'T12:00:00');
            const diffTime = end.getTime() - start.getTime();
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
    } else {
        if (formData.startDate && formData.dueDate) {
            const start = new Date(formData.startDate + 'T12:00:00');
            const end = new Date(formData.dueDate + 'T12:00:00');
            const diffTime = end.getTime() - start.getTime();
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (totalDays < 1) totalDays = 1;

            const dailyRate = rate / 30;
            interest = principal * (dailyRate / 100) * totalDays;
            total = principal + interest;
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.borrowerName || !principal || !formData.dueDate || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await adicionarEmprestimo({
                cliente_nome: formData.borrowerName,
                telefone: formData.phone,
                valor_emprestado: principal,
                juros_mensal: isCartao ? computedRate : rate,
                dias_contratados: totalDays,
                juros_total_contratado: isCartao ? interest : interest,
                data_inicio: formData.startDate,
                data_fim: formData.dueDate,
                status: 'ativo',
                cobranca_mensal: isCartao ? true : formData.monthlyInterest,
                tipo: isCartao ? 'cartao' : 'comum',
                cartao_senha: isCartao ? cartaoData.senha : undefined,
                cartao_valor_retirada: isCartao ? parseFloat(cartaoData.valorRetirada.replace(/\./g, '').replace(',', '.')) : undefined,
                cartao_final_nis: isCartao ? parseInt(cartaoData.finalNis, 10) : undefined,
                cartao_quantidade_meses: isCartao ? parseInt(cartaoData.quantidadeMeses, 10) : undefined
            });

            router.push("/loans");
        } catch (error) {
            console.error("Erro ao salvar empréstimo:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/loans" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>{isCartao ? 'Novo Empréstimo Cartão' : 'Novo Empréstimo'}</h1>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="label">Nome do Devedor</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Ex: João Silva"
                            value={formData.borrowerName}
                            onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Telefone</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="(00) 00000-0000"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="label">Valor Principal (R$)</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="0,00"
                        value={formData.principal}
                        onChange={handlePrincipalChange}
                        onBlur={handlePrincipalBlur}
                        required
                    />
                </div>

                {/* FIELDS FOR CARD LOAN */}
                {isCartao && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--space-md)',
                        background: 'var(--color-surface-2)',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: 'var(--space-md)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h3 style={{ gridColumn: 'span 2', fontSize: '0.9rem', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                            Dados do Cartão
                        </h3>
                        
                        <div className="form-group">
                            <label className="label">Senha do Cartão</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ex: 4321"
                                value={cartaoData.senha}
                                onChange={(e) => setCartaoData({ ...cartaoData, senha: e.target.value })}
                                required={isCartao}
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Final do NIS</label>
                            <select
                                className="input"
                                value={cartaoData.finalNis}
                                onChange={(e) => setCartaoData({ ...cartaoData, finalNis: e.target.value })}
                                required={isCartao}
                                style={{
                                    height: '42px',
                                    background: 'var(--color-surface-1)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '6px',
                                    width: '100%',
                                    padding: '0 8px'
                                }}
                            >
                                <option value="">Selecione o NIS</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((nis) => (
                                    <option key={nis} value={nis}>
                                        Dígito {nis} (Pagamento dia {nisCalendar[nis]})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="label">Valor Retirada por Mês (R$)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="0,00"
                                value={cartaoData.valorRetirada}
                                onChange={(e) => {
                                    let v = e.target.value.replace(/[^\d,]/g, "");
                                    const parts = v.split(',');
                                    let integerPart = parts[0];
                                    let decimalPart = parts.length > 1 ? parts.slice(1).join('').substring(0, 2) : null;
                                    if (integerPart) {
                                        integerPart = parseInt(integerPart, 10).toString();
                                        if (integerPart === 'NaN') integerPart = '0';
                                        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                    }
                                    let formatted = integerPart;
                                    if (decimalPart !== null) {
                                        formatted += ',' + decimalPart;
                                    }
                                    setCartaoData({ ...cartaoData, valorRetirada: formatted });
                                }}
                                onBlur={() => {
                                    let v = cartaoData.valorRetirada;
                                    if (!v) return;
                                    if (!v.includes(',')) v += ',00';
                                    else {
                                        const parts = v.split(',');
                                        if (parts[1].length === 0) v += '00';
                                        else if (parts[1].length === 1) v += '0';
                                    }
                                    setCartaoData({ ...cartaoData, valorRetirada: v });
                                }}
                                required={isCartao}
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Quantidade de Meses</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="Ex: 6"
                                min="1"
                                value={cartaoData.quantidadeMeses}
                                onChange={(e) => setCartaoData({ ...cartaoData, quantidadeMeses: e.target.value })}
                                required={isCartao}
                            />
                        </div>
                    </div>
                )}

                {/* FIELDS FOR STANDARD LOAN */}
                {!isCartao && (
                    <>
                        <div className="form-group">
                            <label className="label">Juros Mensais (% a.m.)</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="Ex: 5.0"
                                value={formData.interestRate}
                                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                                required
                                step="0.1"
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div
                                onClick={() => setFormData({ ...formData, monthlyInterest: !formData.monthlyInterest })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    background: 'var(--color-surface-2)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: formData.monthlyInterest ? '1px solid var(--color-primary)' : '1px solid transparent',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}>
                                <div
                                    style={{
                                        width: '44px',
                                        height: '26px',
                                        background: formData.monthlyInterest ? 'var(--color-primary)' : '#ccc',
                                        borderRadius: '24px',
                                        position: 'relative',
                                        transition: 'background 0.2s',
                                        flexShrink: 0
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        background: '#fff',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '3px',
                                        left: formData.monthlyInterest ? '21px' : '3px',
                                        transition: 'left 0.2s'
                                    }} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontWeight: 500 }}>Cobrança de juros mensal</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                        {formData.monthlyInterest ? 'O cliente deve pagar os juros mensalmente' : 'Juros acumulam para o final (Padrão)'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="label">Data Início</label>
                        <input
                            type="date"
                            className="input"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">Vencimento</label>
                        <input
                            type="date"
                            className="input"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            required
                            disabled={isCartao}
                            style={isCartao ? { opacity: 0.8, cursor: 'not-allowed', background: 'var(--color-surface-2)' } : {}}
                        />
                    </div>
                </div>

                {/* Live Preview */}
                {totalDays > 0 && !!principal && (
                    <div style={{
                        marginTop: 'var(--space-md)',
                        background: 'var(--color-surface-2)',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                    }}>
                        <h4 style={{ marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Resumo Previsto</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Duração:</span>
                            <strong>
                                {isCartao 
                                    ? `${cartaoData.quantidadeMeses} parcelas (mensal)` 
                                    : `${Math.floor(totalDays / 30) > 0 ? `${Math.floor(totalDays / 30)} mês(es) e ` : ''}${totalDays % 30} dias`}
                            </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Lucro Garantido (Juros):</span>
                            <span style={{ color: 'var(--color-success)' }}>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(interest)}</span>
                        </div>
                        {isCartao && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Retirada Mensal:</span>
                                <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(cartaoData.valorRetirada.replace(/\./g, '').replace(',', '.')) || 0)} / mês</strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                            <span style={{ fontWeight: '600' }}>Total a Receber:</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</strong>
                        </div>
                    </div>
                )}

                <button disabled={isSubmitting} type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    {isSubmitting ? 'Criando Empréstimo...' : 'Criar Empréstimo'}
                </button>
            </form>
        </div>
    );
}

export default function NewLoanPage() {
    return (
        <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Carregando formulário...</div>}>
            <NewLoanPageContent />
        </Suspense>
    );
}

