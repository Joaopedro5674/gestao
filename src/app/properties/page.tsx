"use client";

import Link from "next/link";
import { Plus, Home as HomeIcon, Eye, Edit2, CheckCircle, Calendar, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/ToastProvider";

export default function PropertiesPage() {
    const { properties } = useApp();

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1>Meus Imóveis</h1>
                <Link href="/properties/new" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    <Plus size={20} /> <span style={{ marginLeft: '4px' }}>Novo</span>
                </Link>
            </header>

            {properties.filter(p => p.isActive).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)', background: 'var(--color-surface-1)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
                    <HomeIcon size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-md)', opacity: 0.5 }} />
                    <h3 style={{ marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Nenhum imóvel cadastrado</h3>
                    <p style={{ marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>Adicione seus imóveis para acompanhar aluguéis e gastos.</p>
                    <Link href="/properties/new" className="btn btn-primary">
                        Cadastrar Primeiro Imóvel
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {properties.filter(p => p.isActive).map((property) => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>
            )}
        </div>
    );
}

function PropertyCard({ property }: { property: any }) {
    const { rentPayments, processMonthlyPayment } = useApp();
    const { showToast } = useToast();

    // STRICT TIME SOURCE
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // DB uses 1-12 for months. 
    const currentDbMonth = currentMonth + 1; // 1-12
    const currentMonthName = now.toLocaleString('pt-BR', { month: 'long' });

    // 1. CHECK IF CURRENT MONTH IS PAID
    const isPaidThisMonth = rentPayments.some(p => {
        if (p.propertyId !== property.id) return false;
        if (p.status !== 'paid') return false;
        // Direct Match (No string parsing)
        return p.year === currentYear && p.month === currentDbMonth;
    });

    // 2. TIMELINE GENERATION (Fixed Jan-Dec)
    const months = Array.from({ length: 12 }, (_, i) => i); // [0..11] representing Jan..Dec

    const timelineData = months.map(mIndex => {
        // Create date for label (e.g. "jan", "fev")
        const d = new Date(currentYear, mIndex, 1);
        const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

        const targetDbMonth = mIndex + 1; // 1-12

        // Check verification for this specific month index
        const isMonthPaid = rentPayments.some(p => {
            if (p.propertyId !== property.id) return false;
            if (p.status !== 'paid') return false;
            return p.year === currentYear && p.month === targetDbMonth;
        });

        return {
            label,
            isPaid: isMonthPaid,
            isCurrent: mIndex === currentMonth
        };
    });

    // 3. HANDLE PAYMENT ACTION
    const handlePayment = () => {
        if (isPaidThisMonth) return; // Prevention

        const confirmMsg = `CONFIRMAÇÃO DE RECEBIMENTO\n\nImóvel: ${property.name}\nMês de Referência: ${currentMonthName.toUpperCase()}/${currentYear}\n\nDeseja confirmar o pagamento?`;

        if (confirm(confirmMsg)) {
            // Updated Signature: propertyId, month (1-12), year
            processMonthlyPayment(property.id, currentDbMonth, currentYear);
            showToast("Pagamento registrado com sucesso", "success");
        }
    };

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', opacity: 1 }}>
            {/* COMPONENT HEADER: Timeline & Status */}
            <div style={{
                background: isPaidThisMonth ? 'rgba(var(--color-success-rgb), 0.1)' : 'var(--color-surface-2)',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                {/* 12-Month Timeline (Jan -> Dec) */}
                <div style={{
                    display: 'flex',
                    gap: '2px', // Tight spacing
                    alignItems: 'center',
                    overflowX: 'auto',
                    maxWidth: '100%',
                    paddingBottom: '2px' // Scrollbar clearance if needed
                }}>
                    {timelineData.map((t, idx) => (
                        <div key={idx}
                            title={`${t.label}: ${t.isPaid ? 'Pago' : 'Pendente'}`}
                            style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: t.isPaid ? 'var(--color-success)' : 'var(--color-border)', // Green or Gray
                                color: t.isPaid ? 'white' : 'var(--color-text-tertiary)',
                                fontSize: '0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                // Current month gets a border highlight
                                border: t.isCurrent ? '2px solid var(--color-text-primary)' : '1px solid rgba(0,0,0,0.05)',
                                transform: t.isCurrent ? 'scale(1.15)' : 'none',
                                zIndex: t.isCurrent ? 1 : 0,
                                opacity: t.isPaid || t.isCurrent ? 1 : 0.5
                            }}
                        >
                            {t.label[0]}
                        </div>
                    ))}
                </div>

                {/* Text Status Badge */}
                <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: isPaidThisMonth ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                    color: 'white',
                    display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    marginLeft: 'auto'
                }}>
                    {isPaidThisMonth ? <CheckCircle size={12} /> : null}
                    {isPaidThisMonth ? 'Pago' : 'Pendente'}
                </div>
            </div>

            {/* COMPONENT BODY */}
            <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.rentAmount)}
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '2px' }}>{property.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{property.address}</p>
                    </div>

                    {/* Due Date Indicator */}
                    <div style={{ textAlign: 'center', background: 'var(--color-surface-2)', padding: '6px 10px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Vencimento</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                            {property.paymentDay}<span style={{ fontSize: '0.8rem' }}>.{apiMonthToDisplay(currentDbMonth)}</span>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {!isPaidThisMonth ? (
                        // STATE: PENDING -> ACTIVE GREEN BUTTON
                        <button
                            onClick={handlePayment}
                            className="btn btn-primary"
                            style={{ flex: 2, background: 'var(--color-success)', color: 'white', boxShadow: 'var(--shadow-sm)' }}
                        >
                            <CheckCircle size={18} style={{ marginRight: '6px' }} /> Receber {currentMonthName}
                        </button>
                    ) : (
                        // STATE: PAID -> DISABLED GRAY BUTTON
                        <button
                            disabled
                            style={{
                                flex: 2,
                                background: 'var(--color-surface-2)',
                                color: 'var(--color-text-tertiary)',
                                border: '1px solid var(--color-border)',
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                borderRadius: 'var(--radius-md)',
                                opacity: 0.8
                            }}
                        >
                            <CheckCircle size={16} /> Pagamento recebido
                        </button>
                    )}

                    <Link href={`/properties/${property.id}/view`} className="btn" style={{ flex: 1, background: 'var(--color-surface-2)', padding: '0 12px' }}>
                        <Eye size={20} />
                    </Link>
                    <Link href={`/properties/${property.id}/edit`} className="btn" style={{ flex: 1, background: 'var(--color-surface-2)', padding: '0 12px' }}>
                        <Edit2 size={20} />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function apiMonthToDisplay(m: number) {
    return String(m).padStart(2, '0');
}
