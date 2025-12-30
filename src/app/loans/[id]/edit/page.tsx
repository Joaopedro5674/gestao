"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Emprestimo } from "@/types";

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const router = useRouter();
    const { emprestimos, atualizarEmprestimo, deletarEmprestimo } = useApp();
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
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href={`/loans/${id}`} style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1 style={{ marginTop: '-4px' }}>Editar Empréstimo</h1>
            </header>

            <LoanEditForm
                loan={loan}
                onSubmit={atualizarEmprestimo}
                onDelete={deletarEmprestimo}
                onSuccess={() => router.push(`/loans/${id}`)}
            />
        </div>
    );
}

function LoanEditForm({
    loan,
    onSubmit,
    onDelete,
    onSuccess
}: {
    loan: Emprestimo,
    onSubmit: (id: string, updates: Partial<Emprestimo>) => Promise<void>,
    onDelete: (id: string) => Promise<void>,
    onSuccess: () => void
}) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        borrowerName: loan.cliente_nome,
        principal: loan.valor_emprestado.toString().replace('.', ','),
        interestRate: loan.juros_mensal.toString().replace('.', ','),
        phone: loan.telefone || "",
        startDate: loan.data_inicio,
        dueDate: loan.data_fim
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(loan.id, {
            cliente_nome: formData.borrowerName,
            valor_emprestado: parseFloat(formData.principal.replace(',', '.')),
            juros_mensal: parseFloat(formData.interestRate.replace(',', '.')),
            telefone: formData.phone,
            data_inicio: formData.startDate,
            data_fim: formData.dueDate
        });
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="card shadow-sm">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                    <label>Nome do Tomador</label>
                    <input
                        type="text"
                        value={formData.borrowerName}
                        onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Telefone</label>
                    <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label>Valor Emprestado (R$)</label>
                        <input
                            type="text"
                            value={formData.principal}
                            onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Juros Mensal (%)</label>
                        <input
                            type="text"
                            value={formData.interestRate}
                            onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label>Data de Início</label>
                        <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Data de Vencimento</label>
                        <input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            required
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <button type="submit" className="btn btn-full">
                    Salvar Alterações
                </button>

                <button
                    type="button"
                    onClick={() => {
                        if (confirm("ATENÇÃO: Deseja realmente apagar este empréstimo?")) {
                            onDelete(loan.id);
                            router.push("/loans");
                        }
                    }}
                    className="btn btn-full"
                    style={{ background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}
                >
                    <Trash2 size={18} style={{ marginRight: '8px' }} /> Apagar Registro
                </button>
            </div>
        </form>
    );
}
