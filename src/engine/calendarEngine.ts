/**
 * Banking Calendar Engine for evaluating business days (252 basis)
 * skipping weekends and ANBIMA/B3 national holidays.
 */
export class BankingCalendarEngine {
    private holidaysSet: Set<string>;

    constructor(holidaysList: string[] = []) {
        this.holidaysSet = new Set(holidaysList);
    }

    /**
     * Checks if a specific date (YYYY-MM-DD) is a banking business day.
     */
    public isBusinessDay(dateStr: string): boolean {
        const date = new Date(dateStr + 'T12:00:00');
        if (isNaN(date.getTime())) return false;

        const dayOfWeek = date.getDay();
        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }

        // Check if national banking holiday
        const formatted = dateStr.split('T')[0];
        if (this.holidaysSet.has(formatted)) {
            return false;
        }

        return true;
    }

    /**
     * Calculates total calendar days between two dates.
     */
    public getCalendarDays(startDateStr: string, endDateStr: string): number {
        const start = new Date(startDateStr + 'T12:00:00');
        const end = new Date(endDateStr + 'T12:00:00');
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

        const diff = end.getTime() - start.getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    /**
     * Calculates total banking business days between two dates (inclusive of end date if business day).
     */
    public getBusinessDays(startDateStr: string, endDateStr: string): number {
        const start = new Date(startDateStr + 'T12:00:00');
        const end = new Date(endDateStr + 'T12:00:00');
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

        let businessDaysCount = 0;
        const current = new Date(start);
        current.setDate(current.getDate() + 1); // Start counting from day after deposit

        while (current <= end) {
            const currentStr = current.toISOString().split('T')[0];
            if (this.isBusinessDay(currentStr)) {
                businessDaysCount++;
            }
            current.setDate(current.getDate() + 1);
        }

        return businessDaysCount;
    }
}
