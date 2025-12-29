"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Property, Loan, RentPayment, Expense } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

interface AppContextType {
    properties: Property[];
    loans: Loan[];
    rentPayments: RentPayment[];
    expenses: Expense[];
    loading: boolean;

    // Property Actions
    addProperty: (property: Omit<Property, "id">) => Promise<void>;
    updateProperty: (id: string, updates: Partial<Property>) => Promise<void>;
    deleteProperty: (id: string) => Promise<void>;

    // Payment Actions
    processMonthlyPayment: (propertyId: string, month: number, year: number) => Promise<void>;
    addRentPayment: (payment: any) => Promise<void>; // Using any for quick fix, strict type later if needed

    // Expense Actions
    addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;

    // Loan Actions
    addLoan: (loan: Omit<Loan, "id">) => Promise<void>;
    updateLoan: (loan: Loan) => Promise<void>;
    markLoanAsPaid: (id: string) => Promise<void>;
    deleteLoan: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType>({
    properties: [],
    loans: [],
    rentPayments: [],
    expenses: [],
    loading: true,
    addProperty: async () => { },
    updateProperty: async () => { },
    deleteProperty: async () => { },
    processMonthlyPayment: async () => { },
    addRentPayment: async () => { },
    addExpense: async () => { },
    deleteExpense: async () => { },
    addLoan: async () => { },
    updateLoan: async () => { },
    markLoanAsPaid: async () => { },
    deleteLoan: async () => { },
});

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    // --- FETCH DATA (SUPABASE) ---
    const fetchData = useCallback(async () => {
        if (!user) {
            setProperties([]);
            setLoans([]);
            setRentPayments([]);
            setExpenses([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1. Properties
            const { data: propsData, error: propsError } = await supabase.from('properties').select('*').order('created_at');
            if (propsError) throw propsError;

            // 2. Loans
            const { data: loansData, error: loansError } = await supabase.from('loans').select('*').order('created_at');
            if (loansError) throw loansError;

            // 3. Rent Payments
            const { data: rentsData, error: rentsError } = await supabase.from('rent_payments').select('*');
            if (rentsError) throw rentsError;

            // 4. Expenses
            const { data: expsData, error: expsError } = await supabase.from('expenses').select('*');
            if (expsError) throw expsError;

            // MAPPING DB (snake_case) -> APP (camelCase)
            setProperties((propsData || []).map(p => ({
                id: p.id,
                name: p.name,
                rentAmount: p.rent_amount,
                paymentDay: p.payment_day,
                isActive: p.is_active,
                userId: p.user_id
            })));

            setLoans((loansData || []).map(l => ({
                id: l.id,
                borrowerName: l.borrower_name,
                principal: l.amount_lent,
                monthlyInterestRate: l.monthly_interest_rate,
                contractDays: l.contract_days,
                contractedInterest: l.contracted_interest,
                totalValue: l.total_value,
                startDate: l.start_date,
                dueDate: l.due_date,
                status: l.status as any,
                paidAt: l.paid_at,
                paymentDate: l.payment_date,
                finalTotalDays: l.final_total_days,
                finalTotalPaid: l.final_total_paid,
                finalInterestAmount: l.final_interest_amount
            })));

            setRentPayments((rentsData || []).map(r => ({
                id: r.id,
                propertyId: r.property_id,
                month: r.month,
                year: r.year,
                status: r.status as any,
                paidAt: r.paid_at,
                dueDate: r.due_date,
            })));

            setExpenses((expsData || []).map(e => ({
                id: e.id,
                propertyId: e.property_id,
                description: e.description,
                amount: e.amount,
                category: e.category as any,
                month: e.month,
                year: e.year
            })));

        } catch (error) {
            console.error("Error fetching (Supabase):", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial Load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- ACTIONS (SUPABASE) ---

    const addProperty = async (property: Omit<Property, "id">) => {
        if (!user) return;
        const { error } = await supabase.from('properties').insert({
            user_id: user.id,
            name: property.name,
            rent_amount: property.rentAmount,
            payment_day: property.paymentDay,
            is_active: property.isActive
        });
        if (error) throw error;
        await fetchData();
    };

    const updateProperty = async (id: string, updates: Partial<Property>) => {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.rentAmount !== undefined) dbUpdates.rent_amount = updates.rentAmount;
        if (updates.paymentDay !== undefined) dbUpdates.payment_day = updates.paymentDay;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        const { error } = await supabase.from('properties').update(dbUpdates).eq('id', id);
        if (error) throw error;
        await fetchData();
    }

    const deleteProperty = async (id: string) => {
        // Cascade delete is handled by DB FK constraints normally, but RLS might block if not careful.
        // 'on delete cascade' was set in schema, so deleting property shoudl auto-delete children.
        const { error } = await supabase.from('properties').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    const processMonthlyPayment = async (propertyId: string, month: number, year: number) => {
        if (!user) return;
        // Check if exists
        const existing = rentPayments.find(r => r.propertyId === propertyId && r.month === month && r.year === year);

        if (existing) {
            // Update
            const { error } = await supabase.from('rent_payments').update({
                status: 'paid',
                paid_at: new Date().toISOString()
            }).eq('id', existing.id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase.from('rent_payments').insert({
                user_id: user.id,
                property_id: propertyId,
                month,
                year,
                status: 'paid',
                paid_at: new Date().toISOString(),
                due_date: `${year}-${String(month + 1).padStart(2, '0')}-01` // Approx due date logic
            });
            if (error) throw error;
        }
        await fetchData();
    };

    const addRentPayment = async (payment: any) => {
        if (!user) return;
        const date = new Date(payment.date);
        const { error } = await supabase.from('rent_payments').insert({
            user_id: user.id,
            property_id: payment.propertyId,
            month: date.getMonth(),
            year: date.getFullYear(),
            status: payment.status,
            paid_at: payment.date, // storing full date as paid_at
            due_date: payment.dueDate
        });
        if (error) throw error;
        await fetchData();
    };

    const addExpense = async (expense: Omit<Expense, "id">) => {
        if (!user) return;
        const { error } = await supabase.from('expenses').insert({
            user_id: user.id,
            property_id: expense.propertyId,
            month: expense.month,
            year: expense.year,
            amount: expense.amount,
            category: expense.category,
            description: expense.description
        });
        if (error) throw error;
        await fetchData();
    };

    const deleteExpense = async (id: string) => {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }

    const addLoan = async (loan: Omit<Loan, "id">) => {
        if (!user) return;
        const { error } = await supabase.from('loans').insert({
            user_id: user.id,
            borrower_name: loan.borrowerName,
            amount_lent: loan.principal,
            monthly_interest_rate: loan.monthlyInterestRate,
            contract_days: loan.contractDays,
            contracted_interest: loan.contractedInterest,
            total_value: loan.totalValue,
            start_date: loan.startDate,
            due_date: loan.dueDate,
            status: 'active'
        });
        if (error) throw error;
        await fetchData();
    };

    const markLoanAsPaid = async (id: string) => {
        const { error } = await supabase.from('loans').update({
            status: 'paid',
            paid_at: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;
        await fetchData();
    };

    const updateLoan = async (loan: Loan) => {
        const { error } = await supabase.from('loans').update({
            borrower_name: loan.borrowerName,
            amount_lent: loan.principal,
            monthly_interest_rate: loan.monthlyInterestRate,
            start_date: loan.startDate,
            due_date: loan.dueDate
        }).eq('id', loan.id);
        if (error) throw error;
        await fetchData();
    };

    const deleteLoan = async (id: string) => {
        const { error } = await supabase.from('loans').delete().eq('id', id);
        if (error) throw error;
        await fetchData();
    }

    return (
        <AppContext.Provider
            value={{
                properties,
                loans,
                rentPayments,
                expenses,
                loading,
                addProperty,
                updateProperty,
                deleteProperty,
                processMonthlyPayment,
                addRentPayment,
                addExpense,
                deleteExpense,
                addLoan,
                updateLoan,
                markLoanAsPaid,
                deleteLoan
            }}
        >
            {children}
        </AppContext.Provider>
    );
}
