#!/usr/bin/env node
/**
 * scripts/fetch-market-data.mjs
 *
 * Appelle l'API FRED (St. Louis Fed) pour récupérer :
 *   - DCOILBRENTEU : Cours du Brent en USD/baril (mensuel)
 *   - DEXUSEU      : Taux de change USD/EUR (mensuel)
 *
 * Génère : public/market_snapshot.json
 * Ce fichier est embarqué dans le build Vite et servi statiquement.
 * En production (GitHub Pages), l'app lit ce snapshot au lieu d'appeler FRED.
 *
 * Usage :
 *   FRED_API_KEY=<key> node scripts/fetch-market-data.mjs
 *   ou via Makefile : make fetch-data
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_PATH = join(ROOT, 'public', 'market_snapshot.json');

const API_KEY = process.env.FRED_API_KEY;
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const START_DATE = '2000-01-01';

async function fetchSeries(seriesId) {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&observation_start=${START_DATE}&frequency=m`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`FRED API error for ${seriesId}: HTTP ${res.status}`);
    }

    const json = await res.json();
    const result = {};

    for (const obs of (json.observations || [])) {
        const val = parseFloat(obs.value);
        if (!isNaN(val)) {
            const [y, m] = obs.date.split('-');
            result[`${y}-${m}`] = val;
        }
    }

    return result;
}

async function main() {
    console.log('⏳ Fetching market data from FRED...');

    const [brent, forex] = await Promise.all([
        fetchSeries('DCOILBRENTEU'),
        fetchSeries('DEXUSEU')
    ]);

    const snapshot = {
        generated_at: new Date().toISOString(),
        series: {
            brent_usd_per_barrel: brent,
            eur_usd_rate: forex
        }
    };

    mkdirSync(join(ROOT, 'public'), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');

    console.log(`✅ Snapshot written to public/market_snapshot.json`);
    console.log(`   Brent entries : ${Object.keys(brent).length}`);
    console.log(`   Forex entries : ${Object.keys(forex).length}`);
    console.log(`   Generated at  : ${snapshot.generated_at}`);
}

main().catch(err => {
    console.error('❌ Failed to fetch market data:', err.message);
    process.exit(1);
});
