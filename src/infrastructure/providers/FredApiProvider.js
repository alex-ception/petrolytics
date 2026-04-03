/**
 * FRED API CLIENT
 * Encapsule les appels vers la Federal Reserve via le proxy Vite.
 */
export class FredApiProvider {
    static API_KEY = ""; // Not committed for security reasons

    /**
     * @param {string} seriesId - DCOILBRENTEU (Brent) or DEXUSEU (EUR/USD)
     */
    static async fetchHistory(seriesId) {
        if (!this.API_KEY) return null;
        const url = `/fred-api/fred/series/observations?series_id=${seriesId}&api_key=${this.API_KEY}&file_type=json&observation_start=2000-01-01&frequency=m`;
        
        try {
            const resp = await fetch(url);
            const json = await resp.json();
            const obs = json.observations || [];
            const result = {};
            obs.forEach(o => {
                const [y, m] = o.date.split('-');
                const val = parseFloat(o.value);
                if (!isNaN(val)) result[`${y}-${m}`] = val;
            });
            return result;
        } catch (e) {
            console.warn(`FRED Provider Error (${seriesId}):`, e);
            return null;
        }
    }
}
