import { FUEL_PRICE_HISTORY } from '../../../data/InseeFuelHistory.js';

export class InseeLocalProvider {
    /**
     * Get pump price for a specific month/year.
     * Handles interpolation if a specific year is missing in the archive.
     */
    static getPrice(year, monthIndex, fuelType) {
        const data = FUEL_PRICE_HISTORY[fuelType];
        if (!data) return null;

        const years = Object.keys(data).map(Number).sort((a,b) => a-b);
        let targetYear = years.findLast(y => y <= year) || years[0];
        
        // Exact year data exists
        if (data[year]) {
            const yearMonths = data[year];
            const safeMonth = Math.min(monthIndex, yearMonths.length - 1);
            return yearMonths[safeMonth];
        }
        
        // Interpolation logic between known milestones
        let nextYear = years.find(y => y > year) || years[years.length-1];
        let t = (year - targetYear) / (nextYear - targetYear || 1);
        
        const startMonths = data[targetYear];
        const endMonths = data[nextYear];
        
        const safeStartIdx = Math.min(monthIndex % 12, startMonths.length - 1);
        const safeEndIdx = Math.min(monthIndex % 12, endMonths.length - 1);
        
        const startValue = startMonths[safeStartIdx];
        const endValue = endMonths[safeEndIdx];
        
        return startValue + (endValue - startValue) * t;
    }
}
