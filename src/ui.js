import { NOTICE_FALLBACK } from "./engine.js";

const STALE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 8.4 -> "CHF 8.40" */
export function formatChf(n) {
  return `CHF ${n.toFixed(2)}`;
}

/** true, wenn die Produktliste älter als 30 Tage ist. */
export function isListStale(listDate, now) {
  const t = new Date(listDate).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > STALE_DAYS * DAY_MS;
}

/** "2026-11-17" -> "17.11.2026" */
export function formatDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/** Preis nur, wenn bekannt; sonst leer (keine «Preis unbekannt»-Zeile pro Produkt). */
export function productPriceText(product) {
  return product.priceChf == null ? "" : formatChf(product.priceChf);
}

/** Gesamtpreis eines Korbs: nur bei vollständigen Preisen als Zahl. */
export function basketPriceText(totals) {
  if (totals.priceComplete) return formatChf(totals.priceChf);
  if (totals.priceChf > 0) return "Preis teilweise unbekannt";
  return "Preis unbekannt";
}

export const REST_HINT = "Rest fürs nächste Mal aufheben";

/**
 * Hinweis, wenn die Portion nur ein Teil der gekauften Einheit ist, sonst null.
 * Teil: Bruch (½ ¼ ¾ ⅓), Packungsgrösse nach dem Komma, Scheiben, blosse Grammangabe,
 * Handvoll und mehrere kleine Stücke (bis 100 g) aus einer Packung.
 * Ganze Einheiten (1 Stück, 1 Becher, 1 Schale, loses Obst mit «ohne Schale» ...) ergeben null.
 */
export function restHint(portion) {
  const t = String(portion ?? "").trim();
  if (/^[½¼¾⅓]/.test(t)) return REST_HINT;
  if (/^\d+\s*g\b/.test(t)) return REST_HINT;
  if (/^\d+\s*Scheiben?\b/.test(t)) return REST_HINT;
  if (/^1\s*Handvoll\b/.test(t)) return REST_HINT;
  if (/^\d+\s*Portion\b.*,\s*\S+\s+\d+\s*g\)/.test(t)) return REST_HINT;
  const m = t.match(/^(\d+)\s*Stück\s*\((\d+)\s*g\)$/);
  if (m && Number(m[1]) > 1 && Number(m[2]) <= 100) return REST_HINT;
  return null;
}

/** Wer einen Korb mit Reserve nimmt, kauft die Reserve: sie gilt danach als vorhanden. */
export function markReserveBought(state, basket) {
  if (!basket || !basket.reserve) return state;
  return { ...state, reserveAvailable: true };
}

/** Hinweise einer Karte: bei Fallback-Korb immer der Fallback-Hinweis, dazu ein weiterer. */
export function noticesFor(basket, notice) {
  const out = [];
  if (basket?.fallback) out.push(NOTICE_FALLBACK);
  if (notice && !out.includes(notice)) out.push(notice);
  return out;
}

/** Karten (kalt/mikrowelle), deren Korb das Produkt oder die Reserve mit dieser id enthält. */
export function prepsContaining(view, id) {
  return Object.keys(view).filter((prep) => {
    const b = view[prep]?.basket;
    return !!b && (b.items.some((p) => p.id === id) || b.reserve?.id === id);
  });
}

export function mealForHour(hour) {
  return hour < 15 ? "mittag" : "abend";
}

/** Kleiner DOM-Helfer: Text immer als Textknoten, nie als HTML. */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "onclick") node.addEventListener("click", v);
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

/** Kleines Produktfoto; ohne Foto ein leerer Platzhalter gleicher Grösse, damit der Text bündig bleibt. */
function thumbnail(p) {
  if (!p.image) return el("span", { class: "thumb thumb-empty", "aria-hidden": "true" });
  return el("img", { class: "thumb", src: p.image, alt: "", width: 48, height: 48, loading: "lazy" });
}

const TITLES = { kalt: "KALT", mikrowelle: "MIKROWELLE" };

/**
 * Eine Korb-Karte.
 * view: { prep, basket, notice, targets, reason, successes, taken }
 * handlers: { onOther(prep), onTake(prep), onDislike(prep, id) }
 */
export function renderBasketCard(view, handlers) {
  const { prep, basket, targets, successes, taken } = view;
  const notices = noticesFor(basket, view.notice);
  const card = el("section", { class: "card basket", "data-prep": prep });

  if (!basket) {
    card.append(el("div", { class: "basket-head" }, el("h2", {}, TITLES[prep])));
    for (const n of notices) card.append(el("p", { class: "notice" }, n));
    return card;
  }

  card.append(
    el("div", { class: "basket-head" }, el("h2", {}, TITLES[prep]), el("span", { class: "total" }, basketPriceText(basket.totals))),
  );

  const list = el("ul", { class: "items" });
  for (const p of basket.items) {
    const meta = [p.portion, prep === "mikrowelle" && p.microwaveMin > 0 ? `(${p.microwaveMin} Min.)` : null, productPriceText(p)];
    list.append(
      el(
        "li",
        {},
        thumbnail(p),
        el("span", { class: "item-text" }, el("span", { class: "item-name" }, p.name), el("span", { class: "item-meta" }, meta.filter(Boolean).join(" · ")), restHint(p.portion) ? el("span", { class: "item-meta" }, restHint(p.portion)) : null),
        el("button", { type: "button", "data-dislike": p.id, onclick: () => handlers.onDislike(prep, p.id) }, "mag ich nicht"),
      ),
    );
  }
  card.append(list);

  card.append(el("p", { class: "reason" }, view.reason));
  if (!basket.fallback) card.append(el("p", { class: "promise" }, `✓ ${targets.label}`));
  if (basket.reserve) card.append(el("p", { class: "reserve" }, `Reserve: ${basket.reserve.name}`));
  if (basket.reserve && restHint(basket.reserve.portion)) card.append(el("p", { class: "reserve-note" }, restHint(basket.reserve.portion)));
  if (basket.reserve) card.append(el("p", { class: "reserve-note" }, "Für die Garderobe, nur bei echtem Hunger"));
  if (successes > 0) card.append(el("p", { class: "success" }, `✓ Hat bisher ${successes}× gereicht`));
  for (const n of notices) card.append(el("p", { class: "notice" }, n));

  if (taken) {
    card.append(el("p", { class: "confirm" }, "Gute Wahl. Das reicht."));
  } else {
    card.append(
      el(
        "div",
        { class: "actions" },
        el("button", { type: "button", "data-other": prep, onclick: () => handlers.onOther(prep) }, "Anderer Vorschlag"),
        el("button", { type: "button", class: "primary", "data-take": prep, onclick: () => handlers.onTake(prep) }, "Den nehme ich"),
      ),
    );
  }
  return card;
}
