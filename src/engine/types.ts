export type EntryType = 'DEBIT' | 'CREDIT';
export type AccountType = 'ASSET_BANK' | 'REVENUE_YIELD' | 'LIABILITY_TAX_IOF' | 'LIABILITY_TAX_IR' | 'CLIENT_PATRIMONY';
export type RoundingMode = 'HALF_EVEN' | 'FLOOR' | 'CEIL';
export type DayCountConvention = 'BUSINESS_252' | 'CALENDAR_365';

export interface Bank {
    id: string;
    code: string;
    name: string;
    icon_url?: string;
    brand_color: string;
    active: boolean;
}

export interface Product {
    id: string;
    bank_id: string;
    name: string;
    product_code: string;
    active: boolean;
    bank?: Bank;
}

export interface TaxRulesConfig {
    id: string;
    code: string;
    name: string;
    is_exempt: boolean;
    iof_table_json: Record<number, number>;
    ir_table_json: Record<number, number>;
}

export interface ProductRuleVersion {
    id: string;
    product_id: string;
    version_number: number;
    valid_from: string;
    valid_to?: string;
    indexer_code: string;
    indexer_percentage: number;
    day_count_convention: DayCountConvention;
    tax_rule_id: string;
    allows_partial_withdrawals: boolean;
    rounding_mode: RoundingMode;
    tier_cap_limit?: number; // ex: 10000 (Até R$ 10.000,00 rende mais)
    tier_secondary_percentage?: number; // ex: 100 (Excedente rende 100%)
    tax_rules_config?: TaxRulesConfig;
    product?: Product;
}

export interface InvestmentLot {
    id: string;
    user_id: string;
    product_rule_version_id: string;
    deposit_date: string;
    initial_principal: number;
    current_balance: number;
    status: 'ACTIVE' | 'PARTIAL_WITHDRAWN' | 'CLOSED';
    notes?: string;
    created_at?: string;
    rule_version?: ProductRuleVersion;
}

export interface DailyRate {
    reference_date: string;
    indexer_code: string;
    annual_rate: number;
    daily_factor: number;
}

export interface DailySnapshot {
    id?: string;
    lot_id: string;
    snapshot_date: string;
    gross_balance: number;
    net_balance: number;
    gross_yield_day: number;
    net_yield_day: number;
    iof_accumulated: number;
    ir_accumulated: number;
    calendar_days: number;
    business_days: number;
    cdi_used: number;
}

export interface Withdrawal {
    id?: string;
    lot_id: string;
    withdrawal_date: string;
    amount_requested: number;
    principal_withdrawn: number;
    gross_yield_realized: number;
    iof_paid: number;
    ir_paid: number;
    net_received: number;
}

export interface DivergenceMetric {
    id?: string;
    user_id: string;
    bank_id: string;
    check_date: string;
    user_reported_balance: number;
    engine_calculated_balance: number;
    divergence_cents: number;
    status: 'MATCH' | 'DIVERGENT' | 'ADJUSTED';
    adjustment_notes?: string;
}

export interface CalculatedLotState {
    lot: InvestmentLot;
    calendarDays: number;
    businessDays: number;
    grossBalance: number;
    totalGrossYield: number;
    iofAmount: number;
    iofRatePercent: number;
    irAmount: number;
    irRatePercent: number;
    netBalance: number;
    totalNetYield: number;
    dailyYieldGross: number;
    dailyYieldNet: number;
}
