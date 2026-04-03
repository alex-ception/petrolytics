import { FredApiProvider } from '../../infrastructure/providers/FredApiProvider.js';
import { BRENT_MILESTONES } from '../../../data/BrentFallbackHistory.js';

const FRED_TIMEOUT_MS = 3000;
const SNAPSHOT_PATH = '/market_snapshot.json';

export class MarketPriceRepository {

    /**
     * Stratégie de résolution (par ordre de priorité) :
     *   1. Snapshot statique pré-généré (public/market_snapshot.json) — prod & GitHub Pages
     *   2. API FRED live (dev uniquement, via proxy Vite)
     *   3. Interpolation des milestones locaux (fallback inconditionnel)
     */
    static async getBrentHistory() {
        const snapshot = await this._loadSnapshot();
        if (snapshot) return snapshot.series.brent_usd_per_barrel;

        const live = await this._fetchWithTimeout(() => FredApiProvider.fetchHistory('DCOILBRENTEU'));
        if (live && Object.keys(live).length > 1) return live;

        console.info('MarketPriceRepository: using local Brent fallback.');
        return this._interpolateMilestones('brent');
    }

    static async getExchangeRateHistory() {
        const snapshot = await this._loadSnapshot();
        if (snapshot) return snapshot.series.eur_usd_rate;

        const live = await this._fetchWithTimeout(() => FredApiProvider.fetchHistory('DEXUSEU'));
        if (live && Object.keys(live).length > 1) return live;

        console.info('MarketPriceRepository: using local Forex fallback.');
        return this._interpolateMilestones('ex');
    }

    // ─── Private ───────────────────────────────────────────────────────────────

    static _snapshotCache = null;

    static async _loadSnapshot() {
        if (this._snapshotCache !== null) return this._snapshotCache;
        try {
            const res = await fetch(SNAPSHOT_PATH);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this._snapshotCache = await res.json();
            console.info(`MarketPriceRepository: using snapshot generated at ${this._snapshotCache.generated_at}`);
            return this._snapshotCache;
        } catch {
            this._snapshotCache = false;
            return null;
        }
    }

    static async _fetchWithTimeout(fn) {
        try {
            return await Promise.race([
                fn(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), FRED_TIMEOUT_MS))
            ]);
        } catch {
            return null;
        }
    }

    static _interpolateMilestones(type) {
        const map = {};
        const years = Object.keys(BRENT_MILESTONES).map(Number).sort((a, b) => a - b);

        for (let y = 2000; y <= 2026; y++) {
            for (let m = 1; m <= 12; m++) {
                const key = `${y}-${String(m).padStart(2, '0')}`;
                const curY = years.findLast(yr => yr <= y) || years[0];
                const nextY = years.find(yr => yr > y) || years[years.length - 1];
                const t = (y - curY) / (nextY - curY || 1);
                map[key] = BRENT_MILESTONES[curY][type] + (BRENT_MILESTONES[nextY][type] - BRENT_MILESTONES[curY][type]) * t;
            }
        }
        return map;
    }
}
