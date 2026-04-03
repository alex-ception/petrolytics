import { AnalyticalPipeline } from '../enricher/AnalyticalPipeline.js';
import { MarketPriceRepository } from './MarketPriceRepository.js';

/**
 * FUEL DATA REPOSITORY (Expert Central)
 * Point d'accès unique pour l'élaboration de tous les points de données pétrolifères.
 */
export class FuelDataRepository {
    
    /**
     * @param {number} year- 2000-2026.
     * @param {number} monthIndex - 0-11.
     * @param {string} fuelType - 'Gazole', 'SP95', etc.
     */
    static async getPoint(year, monthIndex, fuelType, markets) {
        // Le Repository délègue à la Chain of Responsibility pour enrichir le point.
        return await AnalyticalPipeline.process(year, monthIndex, fuelType, markets);
    }

    /**
     * Helper pour pré-charger tous les marchés nécessaires au calcul.
     */
    static async fetchMarkets() {
        return {
            brentHistory: await MarketPriceRepository.getBrentHistory(),
            exHistory: await MarketPriceRepository.getExchangeRateHistory()
        };
    }
}
