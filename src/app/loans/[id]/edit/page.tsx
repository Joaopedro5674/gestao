"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Save, User, DollarSign, Percent, Calendar, Phone } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Emprestimo } from "@/types";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

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
                            />
                        </div>
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
