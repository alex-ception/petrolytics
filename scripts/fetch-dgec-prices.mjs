#!/usr/bin/env node
/**
 * scripts/fetch-dgec-prices.mjs
 *
 * Télécharge les prix moyens mensuels à la pompe depuis l'API SDMX de l'INSEE (BDM).
 * Source officielle, sans clé API, données certifiées métropole France.
 *
 * Séries INSEE utilisées :
 *   000442588 — Gazole (1 litre)
 *   010596132 — SP95-E10 (1 litre)
 *   000442589 — SP98 (1 litre)
 *   GPL : non disponible en série BDM mensuelle publique
 *
 * Génère : data/sources/InseeFuelHistory.YYYY-MM-DD.js
 * Met à jour : data/InseeFuelHistory.js (pointeur)
 */

import { writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TODAY = new Date().toISOString().slice(0, 10);
const SNAPSHOT_FILENAME = `InseeFuelHistory.${TODAY}.js`;
const SOURCES_DIR = join(ROOT, 'data', 'sources');
const OUTPUT_PATH = join(SOURCES_DIR, SNAPSHOT_FILENAME);
const POINTER_PATH = join(ROOT, 'data', 'InseeFuelHistory.js');

const INSEE_BDM_BASE = 'https://bdm.insee.fr/series/sdmx/data/SERIES_BDM';

const SERIES = {
    Gazole: { id: '000442588' },
    SP95:   { id: '010596132' },
    SP98:   { id: '000442589' },
    GPL:    { id: null, optional: true }
};

// prix-carburants-quotidien : structure pivotée
// Chaque ligne = 1 carburant à 1 station
// Filtre sur prix_nom, valeur dans prix_valeur, date dans prix_maj
const FLUX_FUEL_NAME = {
    Gazole: 'Gazole',
    SP95:   'E10',
    SP98:   'SP98'
};

const FLUX_API_BASE = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-carburants-quotidien/records';

async function fetchSeries(fuelKey, series) {
    if (!series.id) {
        console.warn(`   ⚠️  ${fuelKey} : pas de série BDM disponible — ignoré.`);
        return null;
    }
    const url = `${INSEE_BDM_BASE}/${series.id}`;
    console.log(`   Fetching ${fuelKey} (${series.id})...`);

    const res = await fetch(url, { headers: { Accept: 'application/xml' } });
    if (!res.ok) {
        if (series.optional) {
            console.warn(`   ⚠️  ${fuelKey} : HTTP ${res.status} — ignoré (série optionnelle).`);
            return null;
        }
        throw new Error(`HTTP ${res.status} pour ${fuelKey} (${url})`);
    }

    const xml = await res.text();
    const result = {};

    const regex = /TIME_PERIOD="(\d{4}-\d{2})" OBS_VALUE="([^"]+)"/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        const [, period, value] = match;
        const val = parseFloat(value);
        if (!isNaN(val) && val > 0) {
            const [year, month] = period.split('-').map(Number);
            if (!result[year]) result[year] = new Array(12).fill(null);
            result[year][month - 1] = val;
        }
    }

    return result;
}

function formatOutput(data, fetchedAt) {
    const lines = [
        `// GÉNÉRÉ par scripts/fetch-dgec-prices.mjs — NE PAS ÉDITER À LA MAIN`,
        `// Source : INSEE / BDM — bdm.insee.fr/series/sdmx`,
        `// Séries : Gazole ${SERIES.Gazole}, SP95 ${SERIES.SP95}, SP98 ${SERIES.SP98}, GPL ${SERIES.GPL}`,
        `// Généré le : ${fetchedAt}`,
        '',
        'export const FUEL_PRICE_HISTORY = {'
    ];

    for (const fuel of Object.keys(data)) {
        lines.push(`    ${fuel}: {`);
        for (const year of Object.keys(data[fuel]).sort((a, b) => Number(a) - Number(b))) {
            const vals = data[fuel][year].map(v => v === null ? 'null' : v.toFixed(2));
            lines.push(`        ${year}: [${vals.join(', ')}],`);
        }
        lines.push(`    },`);
    }

    lines.push('};');
    return lines.join('\n');
}

function updatePointer(snapshotFilename) {
    const versions = readdirSync(SOURCES_DIR)
        .filter(f => f.startsWith('InseeFuelHistory.') && f.endsWith('.js'))
        .sort();

    const content = [
        `// Pointeur vers la version active des prix à la pompe — INSEE/BDM.`,
        `// Pour rollback : modifier l'import ci-dessous et committer.`,
        '//',
        '// Versions disponibles dans data/sources/ :',
        ...versions.map(v => `//   ${v}`),
        '',
        `export { FUEL_PRICE_HISTORY } from './sources/${snapshotFilename}';`
    ].join('\n');

    writeFileSync(POINTER_PATH, content, 'utf-8');
}

async function fetchFluxAverage(fuelKey, year, month) {
    const fuelName = FLUX_FUEL_NAME[fuelKey];
    if (!fuelName) return null;

    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const params = new URLSearchParams({
        select: 'avg(prix_valeur) as avg_price',
        where: `prix_maj >= "${dateFrom}" AND prix_maj <= "${dateTo}T23:59:59" AND prix_nom = "${fuelName}" AND prix_valeur > 0`,
        limit: '1'
    });

    try {
        const res = await fetch(`${FLUX_API_BASE}?${params}`);
        if (!res.ok) return null;
        const json = await res.json();
        const val = json.results?.[0]?.avg_price;
        return val ? Number(val.toFixed(2)) : null;
    } catch {
        return null;
    }
}

async function patchRecentMonths(data) {
    const now = new Date();
    // Check the last 6 months for missing values
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const monthIndex = month - 1;

        for (const fuelKey of Object.keys(FLUX_FUEL_NAME)) {
            if (!data[fuelKey]?.[year]) continue;
            if (data[fuelKey][year][monthIndex] !== null) continue;

            const val = await fetchFluxAverage(fuelKey, year, month);
            if (val) {
                data[fuelKey][year][monthIndex] = val;
                console.log(`   ✅ ${fuelKey} ${year}-${String(month).padStart(2, '0')} : ${val}€ (flux instantané)`);
            } else {
                console.warn(`   ⚠️  ${fuelKey} ${year}-${String(month).padStart(2, '0')} : non disponible`);
            }
        }
    }
}

async function main() {
    mkdirSync(SOURCES_DIR, { recursive: true });

    console.log('⏳ Téléchargement des prix INSEE/BDM...');
    const fetchedAt = new Date().toISOString();
    const data = {};

    for (const [fuelKey, series] of Object.entries(SERIES)) {
        const result = await fetchSeries(fuelKey, series);
        if (result) data[fuelKey] = result;
    }

    console.log('\n⏳ Complément des mois récents via flux instantané...');
    await patchRecentMonths(data);

    const output = formatOutput(data, fetchedAt);
    writeFileSync(OUTPUT_PATH, output, 'utf-8');
    updatePointer(SNAPSHOT_FILENAME);

    console.log(`\n✅ Snapshot : data/sources/${SNAPSHOT_FILENAME}`);
    for (const [fuel, years] of Object.entries(data)) {
        const yrs = Object.keys(years).map(Number);
        console.log(`   ${fuel} : ${Object.keys(years).length} années (${Math.min(...yrs)}–${Math.max(...yrs)})`);
    }
    console.log(`\n✅ Pointeur mis à jour → data/InseeFuelHistory.js`);
    console.log(`   Pour rollback : git checkout data/InseeFuelHistory.js`);
}

main().catch(err => {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
});
