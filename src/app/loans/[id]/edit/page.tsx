"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Loan } from "@/types";

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const router = useRouter();
    const { loans, updateLoan, deleteLoan } = useApp();
    const [loan, setLoan] = useState<Loan | null>(null);

    const [formData, setFormData] = useState({
        borrowerName: "",
        principal: "",
        interestRate: "",
        startDate: "",
        dueDate: ""
    });

    useEffect(() => {
        const found = loans.find((l) => l.id === id);
        if (found) {
            setLoan(found);
            setFormData({
                borrowerName: found.borrowerName,
                principal: found.principal.toString().replace('.', ','),
                interestRate: found.interestRate.toString().replace('.', ','),
                startDate: found.startDate,
                dueDate: found.dueDate
            });
        } else {
            router.push("/loans");
        }
    }, [id, loans, router]);

    if (!loan) return <div className="container">Carregando...</div>;

    if (loan.status === 'paid') {
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
                        <Link href={`/loans/${id}/view`} className="btn btn-primary" style={{ justifyContent: 'center' }}>
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const principal = parseFloat(formData.principal.replace(',', '.')) || 0;
        const rate = parseFloat(formData.interestRate.replace(',', '.')) || 0;

        updateLoan({
            ...loan,
            borrowerName: formData.borrowerName,
            principal: principal,
            interestRate: rate,
            startDate: formData.startDate,
            dueDate: formData.dueDate
        });

        router.push("/loans");
    };

    const handleDelete = () => {
        if (confirm("Tem certeza que deseja apagar este empréstimo? Essa ação não pode ser desfeita.")) {
            deleteLoan(id);
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
                    Salvar Alterações
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
