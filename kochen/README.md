# Satt & Fit

Schlägt Menüs für zuhause vor: grosse Teller, viel Eiweiss, wenig Kalorien. Dazu gibt es das Rezept und eine Einkaufsliste für Migros, Coop oder Denner, hochgerechnet auf die gewählte Anzahl Portionen.

- Reines HTML/JS ohne Build, offline-fähig (Service Worker), wie die Pausen-App.
- Rezepte: `src/data/recipes.js` (Mengen pro Portion)
- Zutaten, Nährwerte, Packungen und Richtpreise pro Laden: `src/data/ingredients.js`
- Logik: `src/engine.js`, Oberfläche: `src/main.js`

## Neues Rezept hinzufügen

1. Rezept in `src/data/recipes.js` ergänzen. Fehlt eine Zutat, sie in `src/data/ingredients.js` eintragen. Bei `null` gibt es sie in diesem Laden nicht, dann wird das Rezept dort nicht vorgeschlagen.
2. Tests laufen lassen: `node --test kochen/tests/*.test.mjs` (prüft u. a. ≤ 700 kcal und ≥ 38 g Eiweiss pro Portion).
3. In `sw.js` die `CACHE_VERSION` erhöhen, sonst sehen installierte Apps die Änderung nicht.
