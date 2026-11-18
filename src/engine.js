// Korb-Engine: schlägt pro Zubereitung (kalt / mikrowelle) einen Korb vor. Reines Modul, kein DOM.
import { getTargets } from "./targets.js";
import { countSuccesses } from "./feedback.js";

export const NOTICE_FALLBACK = "Mit deiner Auswahl passt kein Korb ganz. Das ist der nächstbeste.";
export const NOTICE_NONE = "Für diese Auswahl gibt es gerade keine passenden Produkte.";
export const NOTICE_NO_MORE = "Mehr Vorschläge gibt es für diese Auswahl gerade nicht.";

const PICK_FROM = 5; // zufällige Wahl unter 5 möglichst verschiedenen guten Körben
const KEEP_PER_HAUPT = 100; // gültige Körbe, die pro Hauptprodukt behalten werden (Auswahl für die Vielfalt)
const KEEP_NEAR = 2; // nächstbester Fallback + eine Alternative für nextBasket
const EPS = 1e-9; // Toleranz für Gleitkomma-Rundung beim Abschneiden der Suche

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byKey = (a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
const sum = (items, get) => items.reduce((s, p) => s + get(p), 0);
const round = (v, digits) => Math.round(v * 10 ** digits) / 10 ** digits;
const keyOf = (items) => items.map((p) => p.id).sort().join("+");

/** Produkt-ids der neuesten n Verlaufseinträge (Verlauf: neueste zuletzt). */
function recentIds(history, n) {
  const ids = new Set();
  for (const e of history.slice(-n)) for (const id of e.basketKey.split("+")) ids.add(id);
  return ids;
}

/**
 * Abstand eines Korbs zu den Zielen (Regel 6), normalisiert, damit kcal, Eiweiss und
 * Ballaststoffe vergleichbar zählen: Summe der relativen Abweichungen
 *   kcal unter kcalMin: (kcalMin − kcal) / kcalMin, über kcalMax: (kcal − kcalMax) / kcalMax
 *   + max(0, proteinMin − proteinG) / proteinMin
 *   + max(0, fiberMin − fiberG) / fiberMin
 * 0 heisst: alle Ziele erreicht. Mehr Eiweiss oder Ballaststoffe als nötig kostet nichts.
 */
function distance(kcal, protein, fiber, t) {
  const k = kcal < t.kcalMin ? (t.kcalMin - kcal) / t.kcalMin : kcal > t.kcalMax ? (kcal - t.kcalMax) / t.kcalMax : 0;
  return k + Math.max(0, t.proteinMin - protein) / t.proteinMin + Math.max(0, t.fiberMin - fiber) / t.fiberMin;
}

/** Fügt e in die sortierte Liste ein und kürzt sie auf max Einträge. */
function insertTop(list, e, better, max) {
  let i = list.length;
  while (i > 0 && better(e, list[i - 1])) i--;
  list.splice(i, 0, e);
  if (list.length > max) list.pop();
}

const betterScore = (a, b) => a.score > b.score || (a.score === b.score && byKey(a, b) < 0);
// Gleichstand beim Abstand: der zuerst gefundene bleibt (feste Reihenfolge: Hauptprodukte wie
// in der Liste, Extras nach kcal und id). Gleiche Abstände sind häufig (z. B. nur die
// Ballaststoffe fehlen), ein Vergleich per key würde dann zu viele Körbe anlegen.
const closer = (a, b) => a.dist < b.dist;

/**
 * Zählt alle Körbe einer Zubereitung durch (Regeln 1–5) und behält nur die besten:
 * valid = pro Hauptprodukt die 100 besten gültigen Körbe, alle nach Score sortiert (Vorrat für
 * pickDiverse), near = die 2 nächsten ungültigen (nur
 * solange kein gültiger gefunden ist). Extras sind nach kcal aufsteigend sortiert, darum
 * bricht eine Schleife ab, sobald explore() nein sagt (siehe dort).
 */
function search(products, query, state, prep) {
  const t = getTargets(query.duration, state.offsets?.[query.duration] ?? 0);
  const dislikes = new Set(state.dislikes);
  const pool = products.filter(
    (p) =>
      p.store === query.store &&
      p.meals.includes(query.meal) &&
      !dislikes.has(p.id) &&
      p.role !== "reserve" &&
      (prep === "mikrowelle" || p.prep === "kalt"),
  );
  const hauptList = pool.filter((p) => p.role === "haupt");
  const history = state.history || [];
  const last5 = recentIds(history, 5);
  const last30 = recentIds(history, 30);
  const variety = (p) => (last5.has(p.id) ? -3 : last30.has(p.id) ? 0 : 1);
  const isMw = (p) => (p.prep === "mikrowelle" ? 1 : 0);

  // Extras als Kombis: ein Produkt ohne needs allein, mit needs "sauce" je eine Kombi pro Sauce,
  // mit needs "dip" je eine pro Dipper. Ohne Partner fällt das Produkt weg. Eine Kombi belegt
  // einen Extra-Platz; ihre Werte sind die Summen. Saucen stehen nie allein im Korb.
  const sauces = pool.filter((p) => p.role === "sauce");
  const dippers = pool.filter((p) => p.dipper === true);
  const extras = [];
  for (const p of pool) {
    if (p.role !== "beilage" && p.role !== "frisch") continue;
    const partners = p.needs === "sauce" ? sauces : p.needs === "dip" ? dippers.filter((d) => d.id !== p.id) : [null];
    for (const partner of partners) {
      const items = partner ? [p, partner] : [p];
      extras.push({
        items,
        ids: items.map((x) => x.id),
        pair: partner ? { productId: p.id, partnerId: partner.id, kind: p.needs } : null,
        kcal: sum(items, (x) => x.kcal), proteinG: sum(items, (x) => x.proteinG), fiberG: sum(items, (x) => x.fiberG),
        variety: items.reduce((v, x) => v + variety(x), 0),
        mw: items.some((x) => x.prep === "mikrowelle") ? 1 : 0,
      });
    }
  }
  extras.sort((a, b) => a.kcal - b.kcal || (a.ids.join("+") < b.ids.join("+") ? -1 : a.ids.join("+") > b.ids.join("+") ? 1 : 0));

  // Nährwerte der Extras als Zahlen-Arrays, damit die Schleifen nichts anlegen müssen.
  const n = extras.length;
  const K = Float64Array.from(extras, (p) => p.kcal);
  const P = Float64Array.from(extras, (p) => p.proteinG);
  const F = Float64Array.from(extras, (p) => p.fiberG);
  const V = Float64Array.from(extras, (e) => e.variety);
  const M = Uint8Array.from(extras, (e) => e.mw);
  // conf[i * n + j] = 1: die Extras i und j enthalten dasselbe Produkt (kein Produkt doppelt im Korb).
  // Das Auslassen solcher Körbe verkleinert nur die Kandidaten; die Schranken in explore() bleiben gültig.
  const conf = new Uint8Array(n * n);
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (extras[a].ids.some((id) => extras[b].ids.includes(id))) conf[a * n + b] = conf[b * n + a] = 1;
    }
  }
  const { kcalMin, kcalMax, proteinMin, fiberMin } = t;
  const needMw = prep === "mikrowelle";

  const valid = [];
  const near = [];
  let hauptValid = []; // gültige Körbe des aktuellen Hauptprodukts
  let validCount = 0; // gültige Körbe insgesamt (für Fallback und Abschneiden)
  let validBound = -Infinity; // Score des 100.-besten Korbs des aktuellen Hauptprodukts, solange voll
  let nearBound = Infinity; // Abstand des 2.-nächsten Fallbacks, solange die Liste voll ist
  let haupt;
  let bonus;
  const entry = (idx, extra) => {
    const chosen = idx.filter((x) => x >= 0).map((x) => extras[x]);
    const items = [haupt, ...chosen.flatMap((e) => e.items)];
    return { items, pairs: chosen.filter((e) => e.pair).map((e) => e.pair), key: keyOf(items), ...extra };
  };
  function addValid(score, i, j, l) {
    validCount++;
    insertTop(hauptValid, entry([i, j, l], { score }), betterScore, KEEP_PER_HAUPT);
    if (hauptValid.length === KEEP_PER_HAUPT) validBound = hauptValid[KEEP_PER_HAUPT - 1].score;
  }
  function addNear(dist, i, j, l) {
    insertTop(near, entry([i, j, l], { dist }), closer, KEEP_NEAR);
    if (near.length === KEEP_NEAR) nearBound = near[KEEP_NEAR - 1].dist;
  }

  // Wird pro Korb aufgerufen (Millionen Mal), darum klein gehalten; das Einfügen ist ausgelagert.
  // i, j, l: Indizes der gewählten Extras, -1 = nicht belegt.
  function consider(kcal, protein, fiber, vsum, mw, i, j, l) {
    if (needMw && mw === 0) return;
    if (kcal >= kcalMin && kcal <= kcalMax && protein >= proteinMin && fiber >= fiberMin) {
      const score = ((protein + 2 * fiber) / kcal) * 100 + vsum + bonus;
      if (score >= validBound) addValid(score, i, j, l);
    } else if (validCount === 0) {
      const dist = distance(kcal, protein, fiber, t);
      if (dist < nearBound) addNear(dist, i, j, l);
    }
  }

  // Anzahl Extras mit weniger (strict) bzw. höchstens (sonst) kcal; Extras sind nach kcal sortiert.
  const countBelow = (kcal, strict) => {
    let lo = 0, hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (strict ? K[mid] < kcal : K[mid] <= kcal) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  // PP[e] / FF[e]: meiste Eiweiss / Ballaststoffe unter den e leichtesten Extras.
  const PP = new Float64Array(n + 1), FF = new Float64Array(n + 1);
  for (let x = 0; x < n; x++) { PP[x + 1] = Math.max(PP[x], P[x]); FF[x + 1] = Math.max(FF[x], F[x]); }

  // Lohnt es sich, in einem Bereich weiterzusuchen? Der Bereich: Körbe aus dem Basiskorb
  // (base kcal, protein, fiber) plus höchstens slots weiteren Extras, mit mindestens minKcal.
  // - Ja, wenn darin noch ein gültiger Korb sein kann: minKcal ≤ kcalMax und die Lücken lassen
  //   sich mit slots Extras schliessen, die noch unter kcalMax passen (PP/FF).
  // - Sonst nur, solange kein gültiger Korb gefunden ist (sonst zählt kein Fallback) und die
  //   untere Schranke für den Abstand unter dem zweitnächsten bisherigen Fallback (nearBound)
  //   liegt: max(0, minKcal − kcalMax) / kcalMax + Lücken, die slots Extras nicht schliessen.
  //   Dabei zählen nur Extras bis kcalMax × (1 + nearBound) − base: Ein schwereres treibt den
  //   kcal-Anteil allein schon über nearBound.
  // EPS fängt Rundung bei der Gültigkeit ab (30 − 20.4 − 9.6 ist in Gleitkomma knapp über 0).
  // Aufrufe: base = aktueller Korb und minKcal = seine kcal fürs Ausbauen; base = Elternkorb und
  // minKcal = kcal mit dem aktuellen Extra (über kcalMax) für den Abbruch: Das Nein gilt dann
  // auch für alle späteren (schwereren) Geschwister → break. Unter kcalMax kein Abbruch.
  // Der Abgleich mit einer vollständigen Suche steht in tests/engine.test.js.
  const explore = (base, minKcal, protein, fiber, slots) => {
    const gapP = proteinMin - protein, gapF = fiberMin - fiber;
    if (minKcal <= kcalMax) {
      const e = countBelow(kcalMax - base, false);
      if (gapP - slots * PP[e] <= EPS && gapF - slots * FF[e] <= EPS) return true;
    }
    if (validCount > 0) return false;
    if (near.length < KEEP_NEAR) return true;
    const e = countBelow(kcalMax * (1 + nearBound) - base + EPS, false);
    const bound = Math.max(0, minKcal - kcalMax) / kcalMax +
      Math.max(0, gapP - slots * PP[e]) / proteinMin + Math.max(0, gapF - slots * FF[e]) / fiberMin;
    return bound < nearBound; // Gleichstand verliert ohnehin (closer ist strikt)
  };

  // Mikrowellen-Korb: Ohne Mikrowellen-Produkt bisher und ohne eines ab Index from gibt es in
  // diesem Ast und bei allen späteren Geschwistern keinen Kandidaten → break.
  const mwAfter = new Uint16Array(n + 1);
  for (let x = n - 1; x >= 0; x--) mwAfter[x] = mwAfter[x + 1] + M[x];
  const mwLeft = (mw, from) => !needMw || mw > 0 || mwAfter[from] > 0;

  // Drei verschachtelte Schleifen = 0 bis 3 Extras (Regel 2).
  for (haupt of hauptList) {
    valid.push(...hauptValid);
    hauptValid = [];
    validBound = -Infinity;
    bonus = Math.min(3, 0.5 * countSuccesses(history, haupt.id, query.duration));
    const k0 = haupt.kcal, p0 = haupt.proteinG, f0 = haupt.fiberG, v0 = variety(haupt), m0 = isMw(haupt);
    const hid = haupt.id;
    consider(k0, p0, f0, v0, m0, -1, -1, -1);
    if (!explore(k0, k0, p0, f0, 3)) continue;
    for (let i = 0; i < n; i++) {
      if (!mwLeft(m0, i)) break;
      const k1 = k0 + K[i], p1 = p0 + P[i], f1 = f0 + F[i], v1 = v0 + V[i], m1 = m0 + M[i];
      const own1 = !extras[i].ids.includes(hid); // Kombi enthält nicht das Hauptprodukt
      if (own1) consider(k1, p1, f1, v1, m1, i, -1, -1);
      if (k1 > kcalMax && !explore(k0, k1, p0, f0, 3)) break;
      if (!own1 || !explore(k1, k1, p1, f1, 2)) continue;
      for (let j = i + 1; j < n; j++) {
        if (!mwLeft(m1, j)) break;
        const k2 = k1 + K[j], p2 = p1 + P[j], f2 = f1 + F[j], v2 = v1 + V[j], m2 = m1 + M[j];
        const ok2 = conf[i * n + j] === 0 && !extras[j].ids.includes(hid);
        if (ok2) consider(k2, p2, f2, v2, m2, i, j, -1);
        if (k2 > kcalMax && !explore(k1, k2, p1, f1, 2)) break;
        if (!ok2 || !explore(k2, k2, p2, f2, 1)) continue;
        // Mit einem gültigen Korb zählen nur noch Körbe ab kcalMin: leichtere Extras überspringen.
        const lStart = validCount > 0 ? Math.max(j + 1, countBelow(kcalMin - k2, true)) : j + 1;
        for (let l = lStart; l < n; l++) {
          if (!mwLeft(m2, l)) break;
          const k3 = k2 + K[l];
          if (conf[i * n + l] === 0 && conf[j * n + l] === 0 && !extras[l].ids.includes(hid)) {
            consider(k3, p2 + P[l], f2 + F[l], v2 + V[l], m2 + M[l], i, j, l);
          }
          if (k3 > kcalMax && !explore(k2, k3, p2, f2, 1)) break;
        }
      }
    }
  }
  valid.push(...hauptValid);
  valid.sort((a, b) => (betterScore(a, b) ? -1 : betterScore(b, a) ? 1 : 0));
  return { valid, near };
}

/**
 * Vielfalt: wählt aus den gültigen Körben (nach Score sortiert) bis zu k aus, nacheinander jeweils
 * den mit der kleinsten Überschneidung mit den schon gewählten: Summe, wie oft seine Produkte
 * schon gewählt sind. Bei Gleichstand gewinnt der höhere Score, der erste ist also der beste Korb.
 */
function pickDiverse(list, k) {
  const picked = [];
  const used = new Map(); // Produkt-id → wie oft schon gewählt
  const taken = new Set();
  while (picked.length < k && picked.length < list.length) {
    let best = -1;
    let bestOverlap = Infinity;
    for (let x = 0; x < list.length && bestOverlap > 0; x++) {
      if (taken.has(x)) continue;
      const overlap = list[x].items.reduce((c, p) => c + (used.get(p.id) ?? 0), 0);
      if (overlap < bestOverlap) { best = x; bestOverlap = overlap; }
    }
    taken.add(best);
    picked.push(list[best]);
    for (const p of list[best].items) used.set(p.id, (used.get(p.id) ?? 0) + 1);
  }
  return picked;
}

/**
 * Regel 7: Reserve nur, wenn keine mehr da ist. Gewählt wird die, die am längsten nicht
 * vorgeschlagen wurde (history[].reserveId); nie vorgeschlagene zählen als älteste,
 * Gleichstand nach id.
 */
function pickReserve(products, query, state) {
  if (state.reserveAvailable !== false) return null;
  const dislikes = new Set(state.dislikes);
  const lastSeen = new Map();
  (state.history || []).forEach((e, i) => e.reserveId && lastSeen.set(e.reserveId, i));
  const seen = (p) => lastSeen.get(p.id) ?? -1;
  const options = products
    .filter((p) => p.role === "reserve" && p.store === query.store && !dislikes.has(p.id))
    .sort((a, b) => seen(a) - seen(b) || byId(a, b));
  return options[0] ?? null;
}

function makeBasket(prep, { items, key, pairs }, reserve, fallback) {
  // Feldzugriff per Funktion statt per Text-Schlüssel (Textprüfung nach Ruling R4).
  const total = (get) => items.reduce((s, p) => s + get(p), 0);
  const prices = items.map((p) => p.priceChf);
  return {
    prep,
    items,
    pairs,
    reserve,
    totals: {
      kcal: round(total((p) => p.kcal), 1),
      proteinG: round(total((p) => p.proteinG), 1),
      fiberG: round(total((p) => p.fiberG), 1),
      priceChf: round(prices.reduce((s, v) => s + (v ?? 0), 0), 2),
      priceComplete: prices.every((v) => v !== null && v !== undefined),
    },
    key,
    fallback,
  };
}

/**
 * Wählt einen Korb einer Zubereitung, ohne den Korb mit currentKey (Regel 8).
 * Gibt es einen gültigen Korb, wird nie auf einen Fallback ausgewichen: Ist der aktuelle
 * der einzige gültige, bleibt er stehen (mit NOTICE_NO_MORE). Ein stehen gebliebener
 * Fallback-Korb behält fallback: true, die notice ist dann NOTICE_NO_MORE.
 */
function choose(products, query, state, prep, currentKey, rng, reserve) {
  const { valid, near } = search(products, query, state, prep);
  if (valid.length > 0) {
    const others = pickDiverse(valid.filter((e) => e.key !== currentKey), PICK_FROM);
    if (others.length === 0) return { basket: makeBasket(prep, valid[0], reserve, false), notice: NOTICE_NO_MORE };
    const i = Math.min(others.length - 1, Math.floor(rng() * others.length));
    return { basket: makeBasket(prep, others[i], reserve, false), notice: null };
  }
  if (near.length > 0) {
    const others = near.filter((e) => e.key !== currentKey);
    if (others.length === 0) return { basket: makeBasket(prep, near[0], reserve, true), notice: NOTICE_NO_MORE };
    return { basket: makeBasket(prep, others[0], reserve, true), notice: NOTICE_FALLBACK };
  }
  return { basket: null, notice: NOTICE_NONE };
}

/**
 * Je ein kalter und ein Mikrowellen-Korb. notices hält den Hinweis pro Seite,
 * notice ist der erste vorhandene davon (kalt vor mikrowelle) oder null.
 */
export function buildBaskets(products, query, state, rng = Math.random) {
  const reserve = pickReserve(products, query, state);
  const kalt = choose(products, query, state, "kalt", null, rng, reserve);
  const mikrowelle = choose(products, query, state, "mikrowelle", null, rng, reserve);
  const notices = { kalt: kalt.notice, mikrowelle: mikrowelle.notice };
  return {
    kalt: kalt.basket,
    mikrowelle: mikrowelle.basket,
    notice: notices.kalt ?? notices.mikrowelle,
    notices,
  };
}

export function nextBasket(products, query, state, prep, currentKey, rng = Math.random) {
  return choose(products, query, state, prep, currentKey, rng, pickReserve(products, query, state));
}

/** Regel 9: kurzer Grund, warum der Korb sättigt. */
export function reasonText(basket, targets) {
  const parts = [];
  if (basket.totals.proteinG >= targets.proteinMin * 1.2) parts.push("viel Eiweiss");
  if (basket.totals.fiberG >= targets.fiberMin * 1.2) parts.push("viele Ballaststoffe");
  if (parts.length === 0) return "Ausgewogen und sättigend";
  const text = parts.join(" + ");
  return text[0].toUpperCase() + text.slice(1);
}
