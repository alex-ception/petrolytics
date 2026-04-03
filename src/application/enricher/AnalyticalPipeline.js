import { InseeLocalProvider } from '../../infrastructure/providers/InseeLocalProvider.js';
import { FiscalProvider } from '../../infrastructure/providers/FiscalProvider.js';
import { MarketDataEnricher } from '../../infrastructure/providers/MarketDataEnricher.js';
import { FUEL_REGISTRY } from '../../../data/FuelRegistry.js';

/**
 * Méthode résiduelle :
 *   totalIndusMargin = priceHT - TICPE - CEE - brut
 * Ce résidu est la "Marge Industrielle" totale (Raffinage + Distribution).
 *
 * Le split 55/45 ci-dessous est une approximation historique (source CPDP).
 * Il peut varier : en 2022 (choc Ukraine), le raffinage a absorbé jusqu'à 70%.
 * TODO : Affiner avec les rapports annuels CPDP : https://www.cpdp.org/
 */
const REFINING_INDUSTRY_SHARE = 0.55;

export class AnalyticalPipeline {
    static async process(year, monthIndex, fuelId, markets) {
        const fuelDef = FUEL_REGISTRY[fuelId];
        if (!fuelDef) return null;

        const ttc = InseeLocalProvider.getPrice(year, monthIndex, fuelId);
        if (!ttc) return null;

        const dataPoint = { year, monthIndex, fuelId, fuelDef, date: `${year}-${monthIndex + 1}`, total_ttc: Number(ttc.toFixed(4)) };

        FiscalProvider.enrich(dataPoint);
        MarketDataEnricher.enrich(dataPoint, markets.brentHistory, markets.exHistory);
        this._finalizeCascade(dataPoint);

        return dataPoint;
    }

    static _finalizeCascade(d) {
        const priceHT = d.total_ttc / (1 + d.vat);
        d.tva = Number((d.total_ttc - priceHT).toFixed(4));

        let brutVis = d.brut, ticpeVis = d.ticpe, ceeVis = d.cee;
        const totalFixed = brutVis + ticpeVis + ceeVis;

        if (totalFixed > priceHT) {
            const ratio = priceHT / totalFixed;
            brutVis *= ratio; ticpeVis *= ratio; ceeVis *= ratio;
        }

        const totalIndusMargin = Math.max(0, priceHT - ticpeVis - ceeVis - brutVis);
        d.marge_raffinage = Number((totalIndusMargin * REFINING_INDUSTRY_SHARE).toFixed(4));
        d.marge_distribution = Number(Math.max(0, totalIndusMargin - d.marge_raffinage).toFixed(4));

        d.brut = Number(brutVis.toFixed(4));
        d.ticpe = Number(ticpeVis.toFixed(4));
        d.cee = Number(ceeVis.toFixed(4));
    }
}
