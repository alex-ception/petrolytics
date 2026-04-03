import { VAT_HISTORY, TICPE_BARÈME, CEE_BARÈME } from '../../../data/FiscalRules.js';

export class FiscalProvider {
    static enrich(dataPoint) {
        const { year, fuelDef } = dataPoint;
        const group = fuelDef.fiscalGroup;

        if (!TICPE_BARÈME[group]) {
            throw new Error(`FiscalProvider: groupe fiscal inconnu "${group}" pour le carburant "${fuelDef.id}". Vérifier FuelRegistry.js.`);
        }

        const vatKeys = Object.keys(VAT_HISTORY).map(Number).sort((a, b) => b - a);
        dataPoint.vat = VAT_HISTORY[vatKeys.find(y => y <= year) || vatKeys[vatKeys.length - 1]];

        const subLevel = TICPE_BARÈME[group];
        const ticpeKeys = Object.keys(subLevel).map(Number).sort((a, b) => b - a);
        dataPoint.ticpe = subLevel[ticpeKeys.find(y => y <= year) || ticpeKeys[ticpeKeys.length - 1]];

        const ceeKeys = Object.keys(CEE_BARÈME).map(Number).sort((a, b) => b - a);
        dataPoint.cee = CEE_BARÈME[ceeKeys.find(y => y <= year) || ceeKeys[ceeKeys.length - 1]];

        return dataPoint;
    }
}
