// Produktmodell: Validierung der Produktliste (products.json).

const STORES = ["coop", "migros"];
const ROLES = ["haupt", "beilage", "frisch", "reserve"];
const PREPS = ["kalt", "mikrowelle"];
const MEALS = ["mittag", "abend"];
const STRING_FIELDS = ["id", "store", "name", "portion", "prep", "role", "sourceUrl", "checkedAt"];
const NUMBER_FIELDS = ["kcal", "proteinG", "fiberG", "sugarG"];
const REQUIRED_FIELDS = [
  ...STRING_FIELDS, "priceChf", ...NUMBER_FIELDS, "microwaveMin", "meals", "offCode",
];

const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

function validateProduct(p, index) {
  const label = typeof p?.id === "string" && p.id ? p.id : `Produkt Nr. ${index + 1}`;
  if (p === null || typeof p !== "object") return [`${label}: kein gültiges Produkt`];

  const missing = REQUIRED_FIELDS.filter((f) => p[f] === undefined);
  if (missing.length) {
    return missing.map((f) => `${label}: Pflichtfeld ${f} fehlt`);
  }

  const errors = [];
  for (const f of STRING_FIELDS) {
    if (typeof p[f] !== "string" || p[f] === "") errors.push(`${label}: ${f} muss ein Text sein`);
  }
  for (const f of NUMBER_FIELDS) {
    if (!isNumber(p[f])) errors.push(`${label}: ${f} muss eine Zahl sein`);
    else if (p[f] < 0) errors.push(`${label}: ${f} darf nicht negativ sein`);
  }
  if (p.priceChf !== null) {
    if (!isNumber(p.priceChf)) errors.push(`${label}: priceChf muss eine Zahl oder null sein`);
    else if (p.priceChf < 0) errors.push(`${label}: priceChf darf nicht negativ sein`);
  }
  if (!STORES.includes(p.store)) errors.push(`${label}: unbekannter Laden «${p.store}»`);
  if (!ROLES.includes(p.role)) errors.push(`${label}: unbekannte Rolle «${p.role}»`);
  if (!PREPS.includes(p.prep)) errors.push(`${label}: unbekannte Zubereitung «${p.prep}»`);

  if (!isNumber(p.microwaveMin) || p.microwaveMin < 0) {
    errors.push(`${label}: microwaveMin muss eine Zahl von 0 oder mehr sein`);
  } else if (p.prep === "mikrowelle" && p.microwaveMin <= 0) {
    errors.push(`${label}: Zubereitung mikrowelle braucht microwaveMin über 0`);
  } else if (p.prep === "kalt" && p.microwaveMin !== 0) {
    errors.push(`${label}: Zubereitung kalt braucht microwaveMin 0`);
  }

  if (!Array.isArray(p.meals) || p.meals.length === 0) {
    errors.push(`${label}: meals darf nicht leer sein`);
  } else if (p.meals.some((m) => !MEALS.includes(m))) {
    errors.push(`${label}: meals enthält eine unbekannte Mahlzeit`);
  }
  if (p.offCode !== null && typeof p.offCode !== "string") {
    errors.push(`${label}: offCode muss ein Text oder null sein`);
  }
  return errors;
}

export function validateProducts(data) {
  if (data === null || typeof data !== "object") {
    return ["Die Produktdaten fehlen oder sind kein Objekt"];
  }
  const errors = [];
  if (typeof data.listDate !== "string" || data.listDate === "") {
    errors.push("listDate fehlt oder ist kein Text");
  }
  if (!Array.isArray(data.products)) {
    errors.push("products fehlt oder ist keine Liste");
    return errors;
  }
  const seen = new Set();
  data.products.forEach((p, i) => {
    errors.push(...validateProduct(p, i));
    if (typeof p?.id === "string") {
      if (seen.has(p.id)) errors.push(`${p.id}: id ist doppelt vorhanden`);
      seen.add(p.id);
    }
  });
  return errors;
}
