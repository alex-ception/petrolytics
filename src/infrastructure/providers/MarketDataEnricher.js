/**
 * MARKET DATA ENRICHER (Chain of Responsibility Maillon)
 * Transforme le Brent (USD) en Brent Équivalent (EUR / Litre).
 */
export class MarketDataEnricher {
    /**
     * @param {Object} dataPoint - L'objet en cours d'enrichissement.
     * @param {Object} brentHistory - Map historisee de l'API FRED ou Fallback.
     * @param {Object} exHistory - Map historisee de l'API FRED ou Fallback.
     */
    static enrich(dataPoint, brentHistory, exHistory) {
        const { year, monthIndex } = dataPoint;
        const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        
        const brentVals = Object.values(brentHistory || {});
        const exVals = Object.values(exHistory || {});
        const lastBrent = brentVals.length > 0 ? brentVals[brentVals.length - 1] : 80;
        const lastEx = exVals.length > 0 ? exVals[exVals.length - 1] : 1.08;
        
        // On récupère le prix brut ($) et le cours de change (ex: 1.08)
        const brentUSD = brentHistory?.[key] || lastBrent;
        const exRate = exHistory?.[key] || lastEx;
        
        // Formule de conversion unitaire : 
        // Brent ($/Baril) / Taux ($/€) = Brent (€/Baril)
        // Brent (€/Baril) / 158.987 = Brent (€ / Litre)
        const brentEURBaril = brentUSD / exRate;
        const brentEURLit = brentEURBaril / 158.987;
        
        dataPoint.brut = Number(brentEURLit.toFixed(4));
        dataPoint.ex = exRate; // Utile pour tracer le taux USD/EUR si besoin
        dataPoint.brentUSD = brentUSD;

        return dataPoint; // Enrichi avec le coût réel de la matière première
    }
}
