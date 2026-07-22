import { InvestmentLot, CalculatedLotState } from "./types";
import { BankingCalendarEngine } from "./calendarEngine";
import { IndexerEngine } from "./indexerEngine";
import { TaxEngine } from "./taxEngine";
import { RoundingEngine } from "./roundingEngine";

/**
 * Pure Rule Engine evaluating complete financial state for any investment lot on any target date.
 */
export class RuleEngine {
    private calendarEngine: BankingCalendarEngine;

    constructor(holidaysList: string[] = []) {
        this.calendarEngine = new BankingCalendarEngine(holidaysList);
    }

    /**
     * Evaluates full financial state of an investment lot on a target date.
     */
    public evaluateLot(
        lot: InvestmentLot,
        targetDateStr: string,
        annualCdiRate: number = 10.65
    ): CalculatedLotState {
        const depositDateStr = lot.deposit_date.split('T')[0];
        const calendarDays = this.calendarEngine.getCalendarDays(depositDateStr, targetDateStr);
        const businessDays = this.calendarEngine.getBusinessDays(depositDateStr, targetDateStr);

        const ruleVersion = lot.rule_version;
        const multiplier = ruleVersion?.indexer_percentage ?? 100;
        const roundingMode = ruleVersion?.rounding_mode ?? 'HALF_EVEN';
        const taxConfig = ruleVersion?.tax_rules_config;

        const principal = Number(lot.initial_principal);

        // Gross balance compounding over business days
        const rawGrossBalance = IndexerEngine.compoundBalance(principal, annualCdiRate, multiplier, businessDays);
        const grossBalance = RoundingEngine.round(rawGrossBalance, 2, roundingMode);
        const totalGrossYield = Math.max(0, grossBalance - principal);

        // Taxes
        const taxes = TaxEngine.computeTaxes(totalGrossYield, calendarDays, taxConfig);
        const iofAmount = RoundingEngine.round(taxes.iofAmount, 2, roundingMode);
        const irAmount = RoundingEngine.round(taxes.irAmount, 2, roundingMode);
        const totalNetYield = RoundingEngine.round(taxes.netYield, 2, roundingMode);
        const netBalance = RoundingEngine.round(principal + totalNetYield, 2, roundingMode);

        // Daily yield (compared to yesterday)
        let dailyYieldGross = 0;
        let dailyYieldNet = 0;

        if (businessDays > 0) {
            const prevBusinessDays = businessDays - 1;
            const prevGrossRaw = IndexerEngine.compoundBalance(principal, annualCdiRate, multiplier, prevBusinessDays);
            const prevGross = RoundingEngine.round(prevGrossRaw, 2, roundingMode);
            const prevGrossYield = Math.max(0, prevGross - principal);
            const prevTaxes = TaxEngine.computeTaxes(prevGrossYield, Math.max(0, calendarDays - 1), taxConfig);

            dailyYieldGross = RoundingEngine.round(grossBalance - prevGross, 2, roundingMode);
            dailyYieldNet = RoundingEngine.round(totalNetYield - prevTaxes.netYield, 2, roundingMode);
        }

        return {
            lot,
            calendarDays,
            businessDays,
            grossBalance,
            totalGrossYield,
            iofAmount,
            iofRatePercent: RoundingEngine.round(taxes.iofRate * 100, 2, roundingMode),
            irAmount,
            irRatePercent: RoundingEngine.round(taxes.irRate * 100, 2, roundingMode),
            netBalance,
            totalNetYield,
            dailyYieldGross,
            dailyYieldNet
        };
    }
}
