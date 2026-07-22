import { RoundingMode } from "./types";

/**
 * High-precision rounding engine implementing Banker's Rounding (HALF_EVEN), FLOOR and CEIL.
 */
export class RoundingEngine {
    /**
     * Rounds a numeric value to specified decimal places using specified mode.
     */
    public static round(value: number, decimals: number = 2, mode: RoundingMode = 'HALF_EVEN'): number {
        if (isNaN(value)) return 0;
        const factor = Math.pow(10, decimals);
        const scaled = value * factor;

        if (mode === 'FLOOR') {
            return Math.floor(scaled) / factor;
        }

        if (mode === 'CEIL') {
            return Math.ceil(scaled) / factor;
        }

        // HALF_EVEN (Banker's Rounding)
        const floor = Math.floor(scaled);
        const diff = scaled - floor;

        if (diff > 0.5) {
            return Math.ceil(scaled) / factor;
        } else if (diff < 0.5) {
            return floor / factor;
        } else {
            // Exactly .5 -> Round to nearest even integer
            return (floor % 2 === 0 ? floor : floor + 1) / factor;
        }
    }
}
