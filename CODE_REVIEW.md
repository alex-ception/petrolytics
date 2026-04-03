# PetroLytics — Code Review (Avr 2026)

---

## ✅ Corrections appliquées

### Architecture
| Fait | Fichier(s) |
|---|---|
| Séparation `data/` vs `src/` | Tous les fichiers de données déplacés |
| Enrichment Pipeline (Chain of Responsibility) | `AnalyticalPipeline.js` |
| Strategy Pattern via `FuelRegistry` | `data/FuelRegistry.js` |
| Injection de dépendance : `fuelDef` résolu une seule fois | `AnalyticalPipeline.js` |
| `HISTORICAL_EVENTS` et `RETAILER_PROFILES` sortis de `main.js` | `data/HistoricalEvents.js`, `data/RetailerProfiles.js` |
| Marqueurs ECharts générés dynamiquement depuis `HISTORICAL_EVENTS` | `src/main.js` |
| Commentaires inutiles supprimés | `main.js`, `AnalyticalPipeline.js`, `FiscalProvider.js` |
| Commentaire d'exemple supprimé dans `FuelRegistry.js` | `data/FuelRegistry.js` |

### Fiabilité
| Fait | Fichier(s) |
|---|---|
| Fallback silencieux `\|\| Gazole` → erreur explicite | `FiscalProvider.js` |
| Magic number `0.8` → constante nommée `REFINING_INDUSTRY_SHARE_CAP` avec `TODO` sourcé | `AnalyticalPipeline.js` |
| Timeout 3s sur API FRED (évite plateau artificiel) | `MarketPriceRepository.js` |
| Cache du snapshot pour éviter les requêtes multiples | `MarketPriceRepository.js` |

### Versionnement des sources de données
| Fait | Fichier(s) |
|---|---|
| Snapshots INSEE datés dans `data/sources/InseeFuelHistory.YYYY-MM-DD.js` | `scripts/fetch-dgec-prices.mjs` |
| `data/InseeFuelHistory.js` converti en pointeur (1 ligne) | `data/InseeFuelHistory.js` |
| Rollback via `git checkout data/InseeFuelHistory.js` | Convention Git |
| CSV source brut conservé dans `data/sources/dgec-prices.YYYY-MM-DD.csv` | `scripts/fetch-dgec-prices.mjs` |
| Pointeur auto-mis à jour avec liste des versions disponibles en commentaire | `scripts/fetch-dgec-prices.mjs` |

### Déploiement GitHub Pages
| Fait | Fichier(s) |
|---|---|
| Snapshot INSEE/BDM + patch flux quotidien pour mois récents | `scripts/fetch-dgec-prices.mjs` |
| `RefiningProvider` supprimé du pipeline (méthode résiduelle pure) | `AnalyticalPipeline.js` |
| CEE 2026 = 0.16€ ajouté dans `FiscalRules.js` | `data/FiscalRules.js` |
| `REFINING_INDUSTRY_SHARE = 0.55` (55% raffinage / 45% distribution) | `AnalyticalPipeline.js` |
| Script `fetch-dgec-prices.mjs` → snapshots versionnés DGEC | `scripts/fetch-dgec-prices.mjs` |
| `MarketPriceRepository` : snapshot → FRED live → fallback local | `MarketPriceRepository.js` |
| `vite.config.js` : `base`, `target: esnext` | `vite.config.js` |
| All commands via Docker (no local Node) | `Makefile`, `docker-compose.yml` |
| Clé API dans `.env` (gitignored), template `.env.example` | `.env.example` |
| `APP_PORT` en variable d'environnement | `.env`, `docker-compose.yml` |
| GitHub Actions CI/CD (`deploy.yml`) | `.github/workflows/deploy.yml` |

---

## ⚠️ Ce qui reste à corriger

### 🟠 Données GPL — Pas de série BDM publique

L'INSEE ne publie pas de série mensuelle publique pour le GPL en BDM. Le GPL reste sur la baseline estimée dans `InseeFuelHistory.2000-01-01.js` pour les périodes non couvertes par le snapshot.

**Options :**
1. Trouver la série via l'espace abonné INSEE (nécessite un compte professionnel)
2. Utiliser les données brutes de stations-service (flux quotidien data.gouv.fr) et calculer une moyenne mensuelle
3. Laisser le GPL avec la baseline estimée (carburant marginal, faible impact sur la lisibilité du dashboard)

### 🟡 Split Raffinage/Distribution — ratio fixe approximatif

Le ratio `REFINING_INDUSTRY_SHARE = 0.55` est une approximation historique (55% raffinage, 45% distribution).
En réalité ce ratio varie selon les périodes : en 2022 (choc Ukraine), le raffinage a absorbé jusqu'à 70% de la marge totale.

**Pour affiner** : les rapports CPDP annuels publient la marge brute de raffinage mensuelle. https://www.cpdp.org/


Ce fichier est le fallback de dernier recours (si FRED et le snapshot sont tous les deux indisponibles). Les valeurs sont des ordres de grandeur, pas des moyennes annuelles précises. `2026: { brent: 145.0 }` est estimé.

**Options** :
1. Remplacer par les moyennes annuelles EIA : https://www.eia.gov/dnav/pet/hist/rbrteM.htm
2. Supprimer ce fallback et afficher un message d'erreur explicite si le snapshot est absent

### 🟠 `REFINING_INDUSTRY_SHARE_CAP = 0.8` — Sans source officielle

Ce coefficient dans `AnalyticalPipeline.js` plafonne la marge de raffinage à 80% de la marge industrielle totale. Il est documenté avec un `TODO` mais sans source.

**Comment corriger** :
- Consulter les rapports CPDP : https://www.cpdp.org/
- Ou supprimer ce plafonnement et laisser la cascade pure

### 🟡 `data/FiscalRules.js` — Mise à jour manuelle annuelle

Les barèmes TICPE/CEE doivent être mis à jour manuellement après chaque nouveau PLF (Projet de Loi de Finances, voté en décembre).

**Comment ne pas l'oublier** :
- Ajouter une GitHub Action planifiée (`schedule: cron`) qui ouvre automatiquement une issue en décembre avec un rappel

---

## Flux de génération des données

```
make fetch-market
  └── FRED API → public/market_snapshot.json (embarqué dans le build)

make fetch-prices
  └── data.economie.gouv.fr CSV
      └── parse → data/sources/InseeFuelHistory.YYYY-MM-DD.js
          └── update pointer → data/InseeFuelHistory.js

make build
  └── fetch-market + vite build → dist/

CI (GitHub Actions)
  └── fetch-market + vite build + gh-pages deploy
      (fetch-prices non automatisé en CI : acte éditorial)
```

---

## État actuel

```
Architecture       ████████████████████ 100% ✅
Déploiement        ████████████████████ 100% ✅
Qualité code       ████████████████████ 100% ✅
Données marché     ████████████████████ 100% ✅ (FRED live — snapshot Avr 2026 généré)
Données prix pompe ██████████████████▌░  90% ✅ (INSEE/BDM officiel — GPL estimé)
Méthodologie       ██████████████████░░  90% ✅ (méthode résiduelle exacte — split 55/45 approximatif)
Données fiscales   ██████████████████░░  90% ✅ (CEE 2026 mis à jour — TICPE à vérifier)
```
