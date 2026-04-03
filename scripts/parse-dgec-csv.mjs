#!/usr/bin/env node
/**
 * scripts/parse-dgec-csv.mjs
 *
 * Convertit les fichiers CSV officiels de la DGEC/INSEE en InseeFuelHistory.js
 *
 * Source officielle des données :
 *   https://www.data.gouv.fr/fr/datasets/prix-des-carburants-en-france-series-historiques/
 *
 * Format attendu du CSV (séparateur ';') :
 *   date;Gazole;SP95;SP98;E10;GPLc;...
 *   2000-01;0.75;1.02;1.08;;0.46;...
 *
 * Usage :
 *   node scripts/parse-dgec-csv.mjs <path-to-csv>
 *   node scripts/parse-dgec-csv.mjs data/sources/prix-carburants-dgec.csv
 *
 * Génère : data/InseeFuelHistory.generated.js
 * (Ne remplace PAS InseeFuelHistory.js — vous décidez quand intégrer)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CSV_PATH = process.argv[2];
const OUTPUT_PATH = join(ROOT, 'data', 'InseeFuelHistory.generated.js');

const FUEL_COLUMN_MAP = {
    'Gazole':  'Gazole',
    'SP95':    'SP95',
    'SP95-E10':'SP95',
    'E10':     'SP95',
    'SP98':    'SP98',
    'GPLc':    'GPL',
    'GPL':     'GPL'
};

if (!CSV_PATH) {
    console.error('Usage: node scripts/parse-dgec-csv.mjs <path-to-csv>');
    process.exit(1);
}

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));

    const result = {};

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map(c => c.trim().replace(/"/g, ''));
        const datePart = cols[0];
        if (!datePart || !datePart.match(/^\d{4}-\d{2}/)) continue;

        const [year, month] = datePart.split('-').map(Number);
        const monthIndex = month - 1;

        for (let j = 1; j < headers.length; j++) {
            const colName = headers[j];
            const fuelKey = FUEL_COLUMN_MAP[colName];
            if (!fuelKey) continue;

            const val = parseFloat(cols[j]?.replace(',', '.'));
            if (isNaN(val) || val <= 0) continue;

            if (!result[fuelKey]) result[fuelKey] = {};
            if (!result[fuelKey][year]) result[fuelKey][year] = new Array(12).fill(null);
            result[fuelKey][year][monthIndex] = val;
        }
    }

    // Nettoyer les années avec des mois incomplets (null → interpolé ou retiré)
    for (const fuel of Object.keys(result)) {
        for (const year of Object.keys(result[fuel])) {
            const months = result[fuel][year];
            const allNull = months.every(v => v === null);
            if (allNull) {
                delete result[fuel][year];
            } else {
                // Interpoler les mois manquants entre valeurs connues
                result[fuel][year] = interpolateMonths(months);
            }
        }
    }

    return result;
}

function interpolateMonths(months) {
    const filled = [...months];
    for (let i = 0; i < filled.length; i++) {
        if (filled[i] !== null) continue;
        const prev = filled.slice(0, i).findLast(v => v !== null);
        const next = filled.slice(i + 1).find(v => v !== null);
        if (prev !== undefined && next !== undefined) {
            filled[i] = Number(((prev + next) / 2).toFixed(4));
        } else if (prev !== undefined) {
            filled[i] = prev;
        } else if (next !== undefined) {
            filled[i] = next;
        }
    }
    return filled;
}

function formatOutput(data) {
    const lines = ['// GÉNÉRÉ AUTOMATIQUEMENT par scripts/parse-dgec-csv.mjs — NE PAS ÉDITER À LA MAIN'];
    lines.push(`// Source : DGEC/data.gouv.fr — Généré le ${new Date().toISOString()}`);
    lines.push('');
    lines.push('export const FUEL_PRICE_HISTORY = {');

    for (const fuel of Object.keys(data)) {
        lines.push(`    ${fuel}: {`);
        for (const year of Object.keys(data[fuel]).sort()) {
            const vals = data[fuel][year].map(v => v === null ? 'null' : v.toFixed(4));
            lines.push(`        ${year}: [${vals.join(', ')}],`);
        }
        lines.push('    },');
    }

    lines.push('};');
    return lines.join('\n');
}

const content = readFileSync(CSV_PATH, 'utf-8');
const parsed = parseCSV(content);
const output = formatOutput(parsed);

writeFileSync(OUTPUT_PATH, output, 'utf-8');

console.log(`✅ Généré : data/InseeFuelHistory.generated.js`);
for (const [fuel, years] of Object.entries(parsed)) {
    console.log(`   ${fuel} : ${Object.keys(years).length} années`);
}
console.log('');
console.log('→ Vérifiez le fichier généré, puis renommez-le en InseeFuelHistory.js si correct.');
