"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Save, User, DollarSign, Percent, Calendar, Phone } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Emprestimo } from "@/types";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { calcularVencimentoCartao, calcularFinanceiroCartao } from "@/utils/loanHelpers";

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const router = useRouter();
    const { emprestimos, atualizarEmprestimo, deletarEmprestimo } = useApp();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const loan = emprestimos.find((l) => l.id === id) || null;

    if (!loan) {
        return (
            <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p>Carregando empréstimo...</p>
                <Link href="/loans" className="btn" style={{ marginTop: '16px' }}>Voltar</Link>
            </div>
        );
    }

    if (loan.status === 'pago') {
        return (
            <div className="container">
                <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                    <Link href={`/loans/${id}`} style={{ padding: '8px', marginLeft: '-8px' }}>
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 style={{ marginTop: '-4px' }}>Empréstimo Encerrado</h1>
                </header>
                <div className="card shadow-sm" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        Este empréstimo já foi marcado como PAGO e não pode ser editado.
                    </p>
                    <Link href={`/loans/${id}`} className="btn btn-full">Visualizar Detalhes</Link>
                </div>
            </div>
        );
    }

    return (
        <main style={{ minHeight: '100vh', background: 'var(--color-background)', padding: 'var(--space-md) 0' }}>
            <div className="container" style={{ maxWidth: '800px' }}>
                <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-xl)', gap: 'var(--space-sm)' }}>
                    <Link href={`/loans/${id}`} style={{
                        padding: '10px',
                        marginLeft: '-10px',
                        color: 'var(--color-text-secondary)',
                        transition: 'color 0.2s'
                    }} className="hover-primary">
                        <ChevronLeft size={24} />
                    </Link>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Editar Empréstimo</h1>
                </header>

                <LoanEditForm
                    loan={loan}
                    onSubmit={atualizarEmprestimo}
                    onDeleteRequest={() => setIsDeleteModalOpen(true)}
                    onSuccess={() => router.push(`/loans/${id}`)}
                />

                <DeleteConfirmModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={async () => {
                        await deletarEmprestimo(loan.id);
                        router.push("/loans");
                    }}
                    itemName={loan.cliente_nome}
                    itemType="Empréstimo"
                />
            </div>
        </main>
    );
}

function LoanEditForm({
    loan,
    onSubmit,
    onSuccess,
    onDeleteRequest
}: {
    loan: Emprestimo,
    onSubmit: (id: string, updates: Partial<Emprestimo>) => Promise<void>,
    onSuccess: () => void,
    onDeleteRequest: () => void
}) {
    const { nisCalendar } = useApp();
    const isCartao = loan.tipo === 'cartao';

    const [formData, setFormData] = useState({
        borrowerName: loan.cliente_nome,
        principal: loan.valor_emprestado.toString().replace('.', ','),
        interestRate: loan.juros_mensal.toString().replace('.', ','),
        phone: loan.telefone || "",
        startDate: loan.data_inicio,
        dueDate: loan.data_fim,
        checkNumber: loan.numero_cheque || "",
        notes: loan.observacoes || ""
    });

    const [cartaoData, setCartaoData] = useState({
        senha: loan.cartao_senha || "",
        valorRetirada: loan.cartao_valor_retirada ? loan.cartao_valor_retirada.toString().replace('.', ',') : "",
        quantidadeMeses: loan.cartao_quantidade_meses ? loan.cartao_quantidade_meses.toString() : "",
        finalNis: loan.cartao_final_nis !== undefined && loan.cartao_final_nis !== null ? loan.cartao_final_nis.toString() : ""
    });

    // Auto-calculate dueDate for Card Loans when NIS, Months or StartDate changes
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const parsedPrincipal = parseFloat(formData.principal.replace(/\./g, '').replace(',', '.')) || 0;

        const updates: Partial<Emprestimo> = {
            cliente_nome: formData.borrowerName,
            valor_emprestado: parsedPrincipal,
            telefone: formData.phone,
            data_inicio: formData.startDate,
            data_fim: formData.dueDate,
            numero_cheque: !isCartao && formData.checkNumber ? formData.checkNumber.trim() : null,
            observacoes: formData.notes ? formData.notes.trim() : null
        };

        if (isCartao) {
            const months = parseInt(cartaoData.quantidadeMeses, 10) || 1;
            const parsedRetirada = parseFloat(cartaoData.valorRetirada.replace(/\./g, '').replace(',', '.')) || 0;
            const calc = calcularFinanceiroCartao(parsedPrincipal, parsedRetirada, months);

            updates.juros_mensal = isNaN(calc.rate) ? 0 : calc.rate;
            updates.juros_total_contratado = isNaN(calc.interest) ? 0 : calc.interest;
            updates.cartao_senha = cartaoData.senha;
            updates.cartao_valor_retirada = parsedRetirada;
            updates.cartao_final_nis = isNaN(parseInt(cartaoData.finalNis, 10)) ? undefined : parseInt(cartaoData.finalNis, 10);
            updates.cartao_quantidade_meses = isNaN(parseInt(cartaoData.quantidadeMeses, 10)) ? undefined : parseInt(cartaoData.quantidadeMeses, 10);
        } else {
            const rate = parseFloat(formData.interestRate.replace(',', '.')) || 0;
            updates.juros_mensal = isNaN(rate) ? 0 : rate;
        }

        await onSubmit(loan.id, updates);
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

            {/* Seção 1: Dados do Tomador */}
            <section className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                    <User size={18} color="var(--color-primary)" />
                    <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-primary)' }}>Dados do Tomador</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
                    <div className="form-group">
                        <label className="label">Nome Completo</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.borrowerName}
                            onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                            placeholder="Nome do cliente"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="label">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} /> Telefone
                            </div>
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>
            </section>

            {/* Seção 1.5: Dados do Cartão (Condicional) */}
            {isCartao && (
                <section className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                        <User size={18} color="var(--color-primary)" />
                        <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-primary)' }}>Configurações do Cartão</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                        <div className="form-group">
                            <label className="label">Senha do Cartão</label>
                            <input
                                type="text"
                                className="input"
                                value={cartaoData.senha}
                                onChange={(e) => setCartaoData({ ...cartaoData, senha: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Final do NIS</label>
                            <select
                                className="input"
                                value={cartaoData.finalNis}
                                onChange={(e) => setCartaoData({ ...cartaoData, finalNis: e.target.value })}
                                required
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
                                        NIS {nis} (Pagamento dia {nisCalendar[nis]})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="label">Valor Retirada por Mês (R$)</label>
                            <input
                                type="text"
                                className="input"
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
                                    if (decimalPart !== null) formatted += ',' + decimalPart;
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
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Quantidade de Meses</label>
                            <input
                                type="number"
                                min="1"
                                className="input"
                                value={cartaoData.quantidadeMeses}
                                onChange={(e) => setCartaoData({ ...cartaoData, quantidadeMeses: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* Seção 2: Detalhes do Empréstimo */}
            <section className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                    <DollarSign size={18} color="var(--color-primary)" />
                    <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-primary)' }}>Condições Financeiras</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-lg)' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                        <div className="form-group">
                            <label className="label">Valor Emprestado</label>
                            <input
                                type="text"
                                className="input"
                                style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}
                                value={formData.principal}
                                onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                                placeholder="0,00"
                                required
                            />
                        </div>
                        {!isCartao && (
                            <div className="form-group">
                                <label className="label">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Percent size={12} /> Taxa Mensal
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.interestRate}
                                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                        <div className="form-group">
                            <label className="label">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} /> Data de Início
                                </div>
                            </label>
                            <input
                                type="date"
                                className="input"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} /> Data de Vencimento
                                </div>
                            </label>
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

                    {!isCartao && (
                        <div className="form-group">
                            <label className="label">Número do Cheque (Opcional)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ex: 850082"
                                value={formData.checkNumber}
                                onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="label">Observações / Notas (Opcional)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Ex: Entregue via motoboy / Cartão de terceiros"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </div>
            </section>

            {/* Ações */}
            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <button type="submit" className="btn btn-success" style={{ height: '56px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                    <Save size={20} style={{ marginRight: '10px' }} />
                    <span style={{ fontWeight: 700 }}>Salvar Alterações</span>
                </button>

                <button
                    type="button"
                    onClick={onDeleteRequest}
                    className="btn btn-danger-outline"
                    style={{ height: '52px', borderRadius: '12px', marginTop: '12px' }}
                >
                    <Trash2 size={18} style={{ marginRight: '8px' }} /> Apagar Registro
                </button>
            </div>
        </form>
    );
}
