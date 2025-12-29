"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function NewLoanPage() {
    const router = useRouter();
    const { adicionarEmprestimo } = useApp();

    const [formData, setFormData] = useState({
        borrowerName: "",
        principal: "",
        interestRate: "",
        startDate: new Date().toISOString().split('T')[0],
        dueDate: "",
    });

    // Validations
    const principal = parseFloat(formData.principal.replace(',', '.')) || 0;
    const rate = parseFloat(formData.interestRate.replace(',', '.')) || 0;

    // Live Calculation
    let totalDays = 0;
    let interest = 0;
    let total = 0;

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.borrowerName || !principal || !formData.dueDate) return;

        adicionarEmprestimo({
            cliente_nome: formData.borrowerName,
            valor_emprestado: principal,
            juros_mensal: rate,
            dias_contratados: totalDays,
            juros_total_contratado: interest,
            data_inicio: formData.startDate,
            data_fim: formData.dueDate,
            status: 'ativo'
        });

        router.push("/loans");
    };

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/loans" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>Novo Empréstimo</h1>
            </header>

            <form onSubmit={handleSubmit} className="card">
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
                    <label className="label">Valor Principal (R$)</label>
                    <input
                        type="number"
                        className="input"
                        placeholder="0,00"
                        value={formData.principal}
                        onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                        required
                        step="0.01"
                    />
                </div>

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
                                {Math.floor(totalDays / 30) > 0 ? `${Math.floor(totalDays / 30)} mês(es) e ` : ''}{totalDays % 30} dias
                            </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Juros Contratado:</span>
                            <span style={{ color: 'var(--color-success)' }}>+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(interest)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                            <span style={{ fontWeight: '600' }}>Total a Receber:</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</strong>
                        </div>
                    </div>
                )}

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    Criar Empréstimo
                </button>
            </form>
        </div>
    );
}
