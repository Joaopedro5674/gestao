"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Emprestimo } from "@/types";

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const router = useRouter();
    // Updated: use 'emprestimos', 'atualizarEmprestimo', 'deletarEmprestimo'
    const { emprestimos, atualizarEmprestimo, deletarEmprestimo } = useApp();
    const [loan, setLoan] = useState<Emprestimo | null>(null);

    const [formData, setFormData] = useState({
        borrowerName: "",
        principal: "",
        interestRate: "",
        startDate: "",
        dueDate: ""
    });

    useEffect(() => {
        // Updated: use 'emprestimos'
        const found = emprestimos.find((l) => l.id === id);
        if (found) {
            setLoan(found);
            setFormData({
                borrowerName: found.cliente_nome,
                principal: found.valor_emprestado.toString().replace('.', ','),
                interestRate: found.juros_mensal.toString().replace('.', ','),
                startDate: found.data_inicio,
                dueDate: found.data_fim
            });
        } else {
            // Keep redirect logic if not found? Or wait?
            // If empty, it might be loading. Handled by loading state in Context mostly.
            // But if context loaded and not found, redirect.
            // For safety, let's just let it be handled by user action or distinct "not found" UI.
        }
    }, [id, emprestimos, router]);

    if (!loan) {
        return (
            <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p>Carregando...</p>
                <Link href="/loans" className="btn" style={{ marginTop: '16px' }}>Voltar</Link>
            </div>
        );
    }

    if (loan.status === 'pago') {
        return (
            <div className="container">
                <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                    <Link href="/loans" style={{ padding: '8px', marginLeft: '-8px' }}>
                        <ChevronLeft size={24} />
                    </Link>
                    <h1>Não Editável</h1>
                </header>
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)', border: '1px dashed var(--color-border)' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>
                        <span style={{ display: 'block', fontSize: '2rem', marginBottom: '8px' }}>🔒</span>
                        Empréstimo Finalizado
                    </h2>
                    <p style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-lg)', lineHeight: '1.5' }}>
                        Este empréstimo foi marcado como <strong>RECEBIDO</strong>.
                        <br />
                        Para garantir a integridade do histórico financeiro, os dados não podem mais ser alterados.
                    </p>
                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                        <Link href={`/loans/${id}`} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                            Ver Detalhes e Recibo
                        </Link>
                        <Link href="/loans" className="btn" style={{ justifyContent: 'center', background: 'transparent', border: '1px solid var(--color-border)' }}>
                            Voltar para Lista
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const principal = parseFloat(formData.principal.replace(',', '.')) || 0;
        const rate = parseFloat(formData.interestRate.replace(',', '.')) || 0;

        // Recalculate Contract? 
        // Logic failure warning: If we change dates/principal, we MUST recalculate interest/total.
        // User complained about "logic flaws". It's better to recalculate.

        let daysTotal = 0;
        let interestTotal = 0;

        if (formData.startDate && formData.dueDate) {
            const start = new Date(formData.startDate + 'T12:00:00');
            const end = new Date(formData.dueDate + 'T12:00:00');
            const diffTime = end.getTime() - start.getTime();
            daysTotal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysTotal < 1) daysTotal = 1;

            const dailyRate = rate / 30;
            interestTotal = principal * (dailyRate / 100) * daysTotal;
        }

        await atualizarEmprestimo(loan.id, {
            cliente_nome: formData.borrowerName,
            valor_emprestado: principal,
            juros_mensal: rate,
            data_inicio: formData.startDate,
            data_fim: formData.dueDate,
            dias_contratados: daysTotal,
            juros_total_contratado: interestTotal
            // Status remains active
        });

        router.push("/loans");
    };

    const handleDelete = async () => {
        if (confirm("Tem certeza que deseja apagar este empréstimo? Essa ação não pode ser desfeita.")) {
            await deletarEmprestimo(id);
            router.push("/loans");
        }
    };

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/loans" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>Editar Empréstimo</h1>
            </header>

            <form onSubmit={handleSubmit} className="card">
                <div className="form-group">
                    <label className="label">Nome do Devedor</label>
                    <input
                        type="text"
                        className="input"
                        value={formData.borrowerName}
                        onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="label">Valor Principal (R$)</label>
                    <input
                        type="number"
                        className="input"
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

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }}>
                    Salvar Alterações (Recalcular Contrato)
                </button>

                <button
                    type="button"
                    onClick={handleDelete}
                    className="btn btn-full"
                    style={{ marginTop: 'var(--space-md)', background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                >
                    <Trash2 size={18} style={{ marginRight: '8px' }} /> Apagar Empréstimo
                </button>
            </form>
        </div>
    );
}
