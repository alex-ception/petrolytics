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
        
        // On récupère le prix brut ($) et le cours de change (ex: 1.08)
        const brentUSD = brentHistory?.[key] || 80;
        const exRate = exHistory?.[key] || 1.08;
        
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
