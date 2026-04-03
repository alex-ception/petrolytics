/**
 * SOURCE FISCALE : BARÈMES ÉTATIQUE (TICPE, CEE, TVA) - FRANCE 2000-2026
 * ----------------------------------------------------------------------
 * Toute modification législative de taxation se fait ici.
 */

export const VAT_HISTORY = {
    2014: 0.20,
    2000: 0.196
};

export const TICPE_BARÈME = {
    Gazole: {
        2026: 0.72,
        2022: 0.61, // Moyenne remisée
        2018: 0.59,
        2014: 0.43,
        2000: 0.42
    },
    Essence: { // SP95, SP98
        2026: 0.76,
        2022: 0.68,
        2018: 0.68,
        2014: 0.60,
        2000: 0.60
    },
    GPL: {
        2000: 0.07
    }
};

export const CEE_BARÈME = {
    2026: 0.16,
    2022: 0.08,
    2018: 0.05,
    2014: 0.02,
    2000: 0.01
};
