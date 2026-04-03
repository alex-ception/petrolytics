import { REFINING_BENCHMARKS } from '../../../data/RefiningBenchmarks.js';

/**
 * REFINING PROVIDER (Lecteur de Sources Industrielles)
 * Lit les marges benchmarks émanant des archives raffinage.
 */
export class RefiningProvider {
    /**
     * @param {Object} dataPoint - L'objet en cours d'enrichissement.
     * Attend d.year, d.monthIndex et d.fuelDef (injecté par le pipeline).
     */
    static enrich(dataPoint) {
        const { year, monthIndex, fuelDef } = dataPoint;
        const strategy = fuelDef.refiningStrategy; // INJECTÉ - Pas de lookup redondant

        // RÈGLE FIXE (GPL, E85 spécifique, etc.)
        if (strategy === 'Fixed') {
            dataPoint.marge_raffinage = fuelDef.fixedMargin || 0.05;
            return dataPoint;
        }

        // RÈGLE STANDARD (Interpolation Benchmarks Industriels)
        const keys = Object.keys(REFINING_BENCHMARKS).map(Number).sort((a,b)=>a-b);
        const target = keys.findLast(k => k <= year) || keys[0];
        const val = REFINING_BENCHMARKS[target];

        if (Array.isArray(val)) {
            dataPoint.marge_raffinage = val[Math.min(monthIndex, val.length - 1)];
        } else {
            dataPoint.marge_raffinage = val;
        }

        return dataPoint; 
    }
}
