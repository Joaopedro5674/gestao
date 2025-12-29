
export type Frequency = 'monthly' | 'yearly'; // Simplified

// SUPABASE MAPPED TYPES (CamelCase for App usage, mapped in Context)

export interface Property {
    id: string;
    userId?: string; // Optional in frontend, optional in insert
    name: string;
    rentAmount: number; // db: rent_amount
    paymentDay: number; // db: payment_day
    isActive: boolean;  // db: is_active
    tenantId?: string;  // Deprecated? Keeping for compatibility if needed, but not in new DB schema explicitly yet.
}

export interface RentPayment {
    id: string;
    propertyId: string; // db: property_id
    month: number;      // db: month
    year: number;       // db: year
    status: 'paid' | 'pending'; // db: status
    paidAt?: string;    // db: paid_at
    dueDate?: string;   // db: due_date
}

export interface Expense {
    id: string;
    propertyId: string;
    description: string;
    amount: number;
    category: 'manutencao' | 'imposto' | 'emergencia' | 'outros';
    month: number;
    year: number;
}

export interface Loan {
    id: string;
    borrowerName: string;       // db: borrower_name
    principal: number;          // db: amount_lent
    monthlyInterestRate: number;// db: monthly_interest_rate
    contractDays: number;       // db: contract_days
    contractedInterest: number; // db: contracted_interest
    totalValue: number;         // db: total_value
    startDate: string;          // db: start_date
    dueDate: string;            // db: due_date
    status: 'active' | 'paid' | 'overdue';
    paidAt?: string;            // db: paid_at
}
