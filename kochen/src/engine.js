// Reine Logik ohne DOM: Nährwerte, Mengen hochrechnen, Einkaufsliste, Menü-Auswahl.
import { AISLES, UNITS } from "./data/ingredients.js";

export const STORES = { migros: "Migros", coop: "Coop", denner: "Denner" };
export const DIETS = ["alles", "vegi"];
export const MIN_PORTIONS = 1;
export const MAX_PORTIONS = 8;

const PACK_TOLERANCE = 0.03; // 3 % weniger als eine ganze Packung zählt noch als «reicht»

/** Gramm einer Rezeptzeile [id, Menge, Einheit] für eine Portion. */
export function gramsOf([id, amount, unit], ING) {
  if (!unit) return amount;
  if (unit === "Stk") {
    const piece = ING[id]?.piece;
    if (!piece) throw new Error(`Zutat ${id} hat keine Stückangabe`);
    return amount * piece.g;
  }
  const u = UNITS[unit];
  if (!u) throw new Error(`Unbekannte Einheit ${unit}`);
  return amount * u.g;
}

const round1 = (v) => Math.round(v * 10) / 10;

/** Nährwerte pro Portion plus geschätztes Tellergewicht (gekocht). */
export function nutrition(recipe, ING) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, plateG = 0;
  for (const item of recipe.items) {
    const ing = ING[item[0]];
    const g = gramsOf(item, ING);
    const [k, p, c, f] = ing.n;
    kcal += (k * g) / 100;
    protein += (p * g) / 100;
    carbs += (c * g) / 100;
    fat += (f * g) / 100;
    plateG += g * (ing.cook ?? 1);
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    plateG: Math.round(plateG / 10) * 10,
    kcalPer100: Math.round((kcal / plateG) * 100),
    proteinPer100kcal: round1((protein / kcal) * 100),
  };
}

/** Gibt es alle Zutaten (ausser Vorrat) in diesem Laden? */
export function availableAt(recipe, store, ING) {
  return recipe.items.every(([id]) => ING[id].pantry || ING[id].stores?.[store] != null);
}

/** Rezepte, die zur Auswahl passen. */
export function candidates(recipes, ING, { store, diet, dislikes = [] }) {
  const dis = new Set(dislikes);
  return recipes.filter((r) => !dis.has(r.id) && (diet !== "vegi" || r.vegi) && availableAt(r, store, ING));
}

/**
 * Gewicht für die Zufallswahl: Eiweiss pro 100 kcal und Volumen (wenig kcal pro 100 g Teller)
 * zählen beide. Kürzlich gekochte Menüs kommen seltener.
 */
export function weightOf(recipe, ING, recent) {
  const n = nutrition(recipe, ING);
  const base = n.proteinPer100kcal + 1000 / Math.max(n.kcalPer100, 1);
  return recent.has(recipe.id) ? base * 0.2 : base;
}

/**
 * Wählt ein Menü. seen = in dieser Runde schon gezeigte ids (werden übersprungen),
 * recent = zuletzt gekochte ids. Sind alle gesehen, beginnt die Runde von vorne (wrapped: true),
 * das aktuelle Menü wird dabei ausgelassen, falls es eine Alternative gibt.
 */
export function pickRecipe(list, ING, { seen = new Set(), recent = new Set(), current = null } = {}, rnd = Math.random) {
  if (list.length === 0) return { recipe: null, wrapped: false };
  let pool = list.filter((r) => !seen.has(r.id) && r.id !== current);
  let wrapped = false;
  if (pool.length === 0) {
    wrapped = true;
    pool = list.length > 1 ? list.filter((r) => r.id !== current) : list;
  }
  const weights = pool.map((r) => weightOf(r, ING, recent));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rnd() * total;
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i];
    if (x < 0) return { recipe: pool[i], wrapped };
  }
  return { recipe: pool[pool.length - 1], wrapped };
}

const FRACTIONS = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/** 1.5 -> "1½", 0.25 -> "¼", 2 -> "2". Rundet auf Viertel (mindestens ¼). */
export function fractionText(v, step = 0.25) {
  const r = Math.max(step, Math.round(v / step) * step);
  const whole = Math.floor(r + 1e-9);
  const frac = Math.round((r - whole) * 100) / 100;
  const fracText = FRACTIONS[frac] ?? "";
  if (whole === 0) return fracText || "¼";
  return `${whole}${fracText}`;
}

/** Gramm hübsch runden: unter 20 g aufs Gramm, unter 100 g auf 5 g, sonst auf 10 g. */
export function roundGrams(g) {
  if (g < 20) return Math.max(1, Math.round(g));
  if (g < 100) return Math.round(g / 5) * 5;
  return Math.round(g / 10) * 10;
}

function pieceText(count, piece) {
  const t = fractionText(count, 0.5);
  const n = count <= 1 ? piece.one : piece.many;
  return `${t} ${n}`;
}

/** Menge einer Zutat für n Portionen als Text, z. B. "375 g", "6 Eier", "2 Zehen", "1½ EL". */
export function amountText(item, portions, ING) {
  const [id, amount, unit] = item;
  const ing = ING[id];
  const total = amount * portions;
  if (unit === "Stk") return pieceText(total, ing.piece);
  if (unit === "Prise") return total <= 3 ? `${Math.round(total)} ${total <= 1 ? "Prise" : "Prisen"}` : "nach Geschmack";
  if (unit === "TL" && total >= 3) return `${fractionText(total / 3, 0.5)} EL`;
  if (unit) {
    const u = UNITS[unit];
    const t = fractionText(total, 0.5);
    return `${t} ${total <= 1 ? u.one : u.many}`;
  }
  const g = roundGrams(total);
  const text = g >= 1000 ? `${(g / 1000).toLocaleString("de-CH", { maximumFractionDigits: 2 })} kg` : `${g} g`;
  if (ing.piece && ing.piece.one === "Dose") return `${text} (≈ ${pieceText(total / ing.piece.g, ing.piece)})`;
  return text;
}

/** Ganze Packungen für den Bedarf in g, mit Rest. */
export function packsFor(needG, packG) {
  const count = Math.max(1, Math.ceil(needG / packG - PACK_TOLERANCE));
  return { count, restG: Math.max(0, count * packG - needG) };
}

function restText(restG, packG, ing) {
  if (restG < 30 || restG < packG * 0.2) return "";
  if (ing.piece) {
    const pieces = Math.floor((restG / ing.piece.g) * 2) / 2;
    if (pieces < 0.5) return "";
    return `Rest: ${pieceText(pieces, ing.piece)}`;
  }
  return `Rest ca. ${roundGrams(restG)} g`;
}

function needText(needG, ing) {
  if (ing.piece && ing.piece.one !== "Dose") return `${pieceText(needG / ing.piece.g, ing.piece)} nötig`;
  return `${roundGrams(needG)} g nötig`;
}

/**
 * Einkaufsliste für ein Rezept: ganze Packungen aus dem gewählten Laden, nach Gang sortiert.
 * Vorrat (Öl, Gewürze ...) kommt separat mit der Menge zum Nachschauen.
 */
export function shoppingList(recipe, portions, store, ING) {
  const need = new Map();
  const pantry = [];
  for (const item of recipe.items) {
    const ing = ING[item[0]];
    if (ing.pantry) {
      pantry.push({ id: item[0], name: ing.name, amount: amountText(item, portions, ING) });
      continue;
    }
    need.set(item[0], (need.get(item[0]) ?? 0) + gramsOf(item, ING) * portions);
  }
  let total = 0;
  let used = 0; // nur der Anteil, der gekocht wird (ohne Rest)
  const sections = [];
  for (const aisle of AISLES) {
    const items = [];
    for (const [id, needG] of need) {
      const ing = ING[id];
      if (ing.aisle !== aisle.id) continue;
      const offer = ing.stores[store];
      if (!offer) throw new Error(`${id} gibt es nicht bei ${store}`);
      const [label, packG, price] = offer;
      const { count, restG } = packsFor(needG, packG);
      const priceChf = Math.round(count * price * 100) / 100;
      total += priceChf;
      used += (needG / packG) * price;
      items.push({ id, name: ing.name, product: label, count, priceChf, need: needText(needG, ing), rest: restText(restG, packG, ing) });
    }
    if (items.length) sections.push({ id: aisle.id, name: aisle.name, items });
  }
  const totalChf = Math.round(total * 100) / 100;
  // Kosten pro Portion nach verbrauchter Menge (der Rest bleibt für später), auf 10 Rappen gerundet.
  const perPortionChf = Math.round((used / portions) * 10) / 10;
  return { sections, pantry, totalChf, perPortionChf };
}

/** "CHF 12.40" */
export function chf(n) {
  return `CHF ${n.toFixed(2)}`;
}

/** Einkaufsliste als Text zum Teilen (WhatsApp, Notizen ...). checked = abgehakte ids. */
export function listAsText(recipe, portions, store, list, checked = new Set()) {
  const lines = [`Einkaufsliste ${STORES[store]}: ${recipe.title} (${portions} ${portions === 1 ? "Portion" : "Portionen"})`, ""];
  for (const s of list.sections) {
    lines.push(`${s.name}:`);
    for (const it of s.items) lines.push(`${checked.has(it.id) ? "☑" : "☐"} ${it.count} × ${it.product}`);
    lines.push("");
  }
  if (list.pantry.length) {
    lines.push("Vorrat, falls nicht zuhause:");
    lines.push(list.pantry.map((p) => p.name).join(", "));
    lines.push("");
  }
  lines.push(`Total ca. ${chf(list.totalChf)} (Richtpreise)`);
  return lines.join("\n");
}
