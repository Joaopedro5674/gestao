"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, FileText, TrendingUp, TrendingDown, DollarSign, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Property, RentPayment } from "@/types";
import { useToast } from "@/components/ToastProvider";

export default function PropertyViewPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;

    const { properties, rentPayments, expenses, addExpense, deleteExpense } = useApp();
    const { showToast } = useToast();
    const [property, setProperty] = useState<Property | null>(null);
    const [totalProfit, setTotalProfit] = useState(0);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'manutencao' as 'manutencao' | 'imposto' | 'outros' });

    useEffect(() => {
        if (properties.length > 0) {
            const found = properties.find((p) => p.id === id);
            if (found) setProperty(found);
        }
    }, [id, properties]);

    // Profit Calculation Logic
    useEffect(() => {
        if (id && property) {
            // How to calculate total income explicitly? 
            // In DB, rent_payments don't store amount. We must assume Property.rentAmount for each paid month.
            // This is a limitation of the current migration plan if rent changed over time.
            // For now, we use current property.rentAmount * number of paid months.

            const paidMonthsCount = rentPayments
                .filter(p => p.propertyId === id && p.status === 'paid')
                .length;

            const income = paidMonthsCount * property.rentAmount;

            const cost = expenses
                .filter(e => e.propertyId === id)
                .reduce((acc, curr) => acc + curr.amount, 0);

            setTotalProfit(income - cost);
        }
    }, [id, property, rentPayments, expenses]);

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!property) return;

        const now = new Date();
        // Safe ID generator
        const generateId = () => Math.random().toString(36).substring(2, 9);

        // Convert amount from string "1.200,50" -> 1200.50
        const parsedAmount = parseFloat(expenseForm.amount.replace(',', '.'));

        addExpense({
            // id: generateId(), // Removed ID, let Supabase generate or AppContext omit? AppContext expects Omit<Expense, "id">.
            propertyId: property.id,
            description: expenseForm.description,
            amount: isNaN(parsedAmount) ? 0 : parsedAmount,
            category: expenseForm.category,
            // Explicitly pass 1-based month
            month: now.getMonth() + 1,
            year: now.getFullYear()
        });

        setShowExpenseModal(false);
        setExpenseForm({ description: '', amount: '', category: 'manutencao' });
        showToast("Gasto adicionado com sucesso", "success");
    };

    if (!property) {
        return (
            <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p>Carregando...</p>
            </div>
        );
    }

    // Current Month Context
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const currentDbMonth = currentMonth + 1; // 1-12
    const currentMonthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    // Filter expenses for current month
    const currentMonthExpenses = expenses.filter(e => {
        if (e.propertyId !== property.id) return false;
        // Direct field match
        return e.year === currentYear && e.month === currentDbMonth;
    });

    const isMonthPaid = rentPayments.some(p => {
        if (p.propertyId !== property.id || p.status !== 'paid') return false;
        return p.year === currentYear && p.month === currentDbMonth;
    });

    return (
        <div className="container">
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-sm)' }}>
                <Link href="/properties" style={{ padding: '8px', marginLeft: '-8px' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1>Detalhes do Imóvel</h1>
            </header>

            {/* EXPANDED STATS SUMMARY (READ ONLY) */}
            <div className="card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem' }}>{property.name}</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Dia {property.paymentDay} (Vencimento)</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    {/* Net Profit */}
                    <div style={{ background: 'var(--color-surface-2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <TrendingUp size={16} color={totalProfit >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
                            <span className="label" style={{ marginBottom: 0 }}>Lucro Acumulado</span>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem', color: totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProfit)}
                        </div>
                    </div>

                    {/* Rent Base */}
                    <div style={{ background: 'var(--color-surface-2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <DollarSign size={16} color="var(--color-primary)" />
                            <span className="label" style={{ marginBottom: 0 }}>Aluguel Base</span>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.rentAmount)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Month Expense Context */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ textTransform: 'capitalize' }}>{currentMonthName}</h3>
                    <span style={{
                        fontSize: '0.75rem',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: isMonthPaid ? 'var(--color-success)' : 'var(--color-warning)',
                        color: isMonthPaid ? 'white' : 'black',
                        fontWeight: '600'
                    }}>
                        {isMonthPaid ? 'MÊS PAGO' : 'AGUARDANDO'}
                    </span>
                </div>

                {/* Expenses List */}
                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="label">Gastos do Mês</span>
                        <span className="label" style={{ color: 'var(--color-danger)' }}>
                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0)
                            )}
                        </span>
                    </div>

                    {currentMonthExpenses.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                            <p style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>Nenhum gasto registrado neste mês.</p>
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {currentMonthExpenses.map(exp => (
                                <li key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-1)', borderRadius: '4px', marginBottom: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{exp.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginTop: '2px', display: 'inline-block', padding: '2px 6px', background: 'var(--color-surface-2)', borderRadius: '4px' }}>
                                            {exp.category}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'var(--color-danger)', fontWeight: '700' }}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}
                                        </span>
                                        <button
                                            onClick={() => {
                                                if (confirm('Excluir este gasto?')) {
                                                    deleteExpense(exp.id);
                                                    showToast("Gasto removido", "info");
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', display: 'flex' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button onClick={() => setShowExpenseModal(true)} className="btn" style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', justifyContent: 'center' }}>
                    + Registrar Gasto
                </button>
            </div>

            <Link href={`/properties/${id}/reports`} className="btn btn-primary btn-full">
                <FileText size={20} style={{ marginRight: '8px' }} /> Ver Histórico Completo
            </Link>

            {/* Modal */}
            {showExpenseModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    backdropFilter: 'blur(3px)'
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '400px', animation: 'scaleUp 0.2s' }}>
                        <h3 style={{ marginBottom: '4px' }}>Novo Gasto ({now.toLocaleString('pt-BR', { month: 'long' })})</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)', marginBottom: '20px' }}>Será descontado do lucro deste mês.</p>

                        <form onSubmit={handleAddExpense}>
                            <div className="form-group">
                                <label className="label">Descrição</label>
                                <input
                                    className="input"
                                    required
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    placeholder="Ex: Conserto Torneira"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Valor (R$)</label>
                                <input
                                    className="input"
                                    type="number"
                                    step="0.01"
                                    required
                                    value={expenseForm.amount}
                                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Categoria</label>
                                <select
                                    className="input"
                                    value={expenseForm.category}
                                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                                >
                                    <option value="manutencao">Manutenção</option>
                                    <option value="imposto">Imposto</option>
                                    <option value="emergencia">Emergência</option>
                                    <option value="outros">Outros</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn" style={{ flex: 1, background: 'var(--color-surface-2)' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
