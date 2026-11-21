# Hinweise für Claude

Dieses Repo enthält zwei Web-Apps, die über GitHub Pages vom Branch `main` ausgeliefert werden:

- Pausen-Einkauf (Wurzelordner): Einkaufsvorschläge für die Pause
- Satt & Fit (`kochen/`): Menüvorschläge mit Rezept und Einkaufsliste für Migros, Coop und Denner

## Änderungen immer automatisch veröffentlichen

Der Besitzer will, dass jede Änderung an einer App **ohne Nachfrage** live geht. Nach jeder Änderung:

1. Tests laufen lassen, falls vorhanden (`node --test kochen/tests/*.test.mjs` für Satt & Fit). Schlagen sie fehl, nichts veröffentlichen: zuerst reparieren oder dem Besitzer melden.
2. Im `sw.js` der geänderten App die `CACHE_VERSION` erhöhen, sonst sehen installierte Apps das Update nicht.
3. Committen und auf den Arbeits-Branch pushen.
4. Einen Pull Request nach `main` erstellen und ihn sofort per Squash mergen. Dafür nicht nachfragen.
5. Kurz melden, was live gegangen ist, mit dem Link zum PR.

Diese Erlaubnis gilt für Änderungen, die der Besitzer verlangt hat. Kein Force-Push, und nichts auf `main` löschen.

## Satt & Fit: Vorlieben des Besitzers

- Kein Thunfisch, kein Lachs, kein Tofu.
- Ziel jedes Rezepts: viel Volumen, viel Eiweiss, wenig Kalorien (Tests prüfen ≤ 700 kcal, ≥ 38 g Eiweiss, < 100 kcal pro 100 g).
- Texte auf Deutsch mit Schweizer Schreibweise (ss statt ß, Rüebli, Peperoni, Zucchetti, Poulet).
- Preise sind Richtwerte. Zutaten, deren Verfügbarkeit in einem Laden unsicher ist, dort auf `null` setzen.
