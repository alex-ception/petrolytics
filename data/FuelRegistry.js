/**
 * REGISTRE DES CARBURANTS - IDENTITÉS ET RÈGLES MÉTIERS
 * -------------------------------------------------------------------
 * RÔLE : Définit les caractéristiques intrinsèques de chaque carburant
 * pour supprimer toute condition "en dur" (if/else) dans les Providers.
 */

export const FUEL_REGISTRY = {
    Gazole: {
        id: 'Gazole',
        label: 'Gazole B7',
        fiscalGroup: 'Gazole',
        refiningStrategy: 'Standard'
    },
    SP95: {
        id: 'SP95',
        label: 'SP95-E10',
        fiscalGroup: 'Essence',
        refiningStrategy: 'Standard'
    },
    SP98: {
        id: 'SP98',
        label: 'SP98',
        fiscalGroup: 'Essence',
        refiningStrategy: 'Standard'
    },
    GPL: {
        id: 'GPL',
        label: 'GPL',
        fiscalGroup: 'GPL',
        refiningStrategy: 'Fixed',
        fixedMargin: 0.05
    }
};

export const getSupportedFuels = () => Object.values(FUEL_REGISTRY);
