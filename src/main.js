import { loadState, saveState } from "./storage.js";
import { buildBaskets, nextBasket, reasonText } from "./engine.js";
import { getTargets } from "./targets.js";
import { applyFeedback, pendingFeedback, countSuccesses } from "./feedback.js";
import { validateProducts } from "./model.js";
import { renderBasketCard, markReserveBought, formatDate, isListStale, mealForHour, prepsContaining } from "./ui.js";

const SELECTION_KEY = "pausen-einkauf:auswahl";
const PREPS = ["kalt", "mikrowelle"];

let products = [];
let state = loadState();
let query = loadSelection();
const view = { kalt: null, mikrowelle: null };

function loadSelection() {
  const fallback = { store: "coop", meal: mealForHour(new Date().getHours()), duration: "4-5" };
  try {
    const raw = JSON.parse(localStorage.getItem(SELECTION_KEY));
    if (raw && ["coop", "migros"].includes(raw.store) && ["mittag", "abend"].includes(raw.meal) && ["3", "4-5", "6"].includes(raw.duration)) {
      return { store: raw.store, meal: raw.meal, duration: raw.duration };
    }
  } catch {
    /* Standardwerte */
  }
  return fallback;
}

function saveSelection() {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(query));
  } catch {
    /* ignorieren */
  }
}

const $ = (sel) => document.querySelector(sel);

function renderCards() {
  const host = $("#baskets");
  host.replaceChildren();
  const targets = getTargets(query.duration, state.offsets[query.duration]);
  for (const prep of PREPS) {
    const v = view[prep];
    host.append(
      renderBasketCard(
        {
          prep,
          basket: v.basket,
          notice: v.notice,
          taken: v.taken,
          targets,
          reason: v.basket ? reasonText(v.basket, targets) : "",
          successes: v.basket ? countSuccesses(state.history, v.basket.items[0].id, query.duration) : 0,
        },
        handlers,
      ),
    );
  }
}

function rebuildAll() {
  const b = buildBaskets(products, query, state, Math.random);
  for (const prep of PREPS) view[prep] = { basket: b[prep], notice: b.notices[prep], taken: false };
  renderCards();
}

function renderControls() {
  for (const group of document.querySelectorAll("[data-group]")) {
    for (const btn of group.querySelectorAll("button")) {
      btn.setAttribute("aria-pressed", String(query[group.dataset.group] === btn.dataset.value));
    }
  }
}

const handlers = {
  onOther(prep) {
    const cur = view[prep].basket;
    const r = nextBasket(products, query, state, prep, cur ? cur.key : null, Math.random);
    view[prep] = { basket: r.basket ?? cur, notice: r.notice, taken: false };
    renderCards();
  },
  onTake(prep) {
    const basket = view[prep].basket;
    if (!basket) return;
    state = {
      ...state,
      history: [
        ...state.history,
        {
          at: new Date().toISOString(),
          query: { ...query },
          basketKey: basket.key,
          hauptId: basket.items[0].id,
          feedback: null,
          reserveId: basket.reserve?.id ?? null,
        },
      ],
    };
    state = markReserveBought(state, basket);
    saveState(state);
    $("#reserve-available").checked = state.reserveAvailable;
    view[prep] = { ...view[prep], taken: true };
    renderCards();
  },
  onDislike(prep, id) {
    if (!state.dislikes.includes(id)) state = { ...state, dislikes: [...state.dislikes, id] };
    saveState(state);
    const affected = new Set([prep, ...prepsContaining(view, id)]);
    for (const p of affected) {
      const r = nextBasket(products, query, state, p, null, Math.random);
      view[p] = { basket: r.basket, notice: r.notice, taken: false };
    }
    renderCards();
  },
};

function setupFeedback() {
  const card = $("#feedback");
  const idx = pendingFeedback(state.history, new Date());
  card.hidden = idx === null;
  if (idx === null) return;
  for (const btn of card.querySelectorAll("[data-answer]")) {
    btn.onclick = () => {
      state = applyFeedback(state, idx, btn.dataset.answer, $("#reserve-eaten").checked);
      saveState(state);
      card.hidden = true;
      $("#reserve-available").checked = state.reserveAvailable;
      if (products.length > 0) rebuildAll();
    };
  }
}

function setupControls() {
  for (const group of document.querySelectorAll("[data-group]")) {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      query = { ...query, [group.dataset.group]: btn.dataset.value };
      saveSelection();
      renderControls();
      if (products.length > 0) rebuildAll();
    });
  }
  const reserve = $("#reserve-available");
  reserve.checked = state.reserveAvailable;
  reserve.addEventListener("change", () => {
    state = { ...state, reserveAvailable: reserve.checked };
    saveState(state);
    if (products.length > 0) rebuildAll();
  });
}

async function start() {
  setupControls();
  renderControls();
  setupFeedback();
  try {
    const res = await fetch("data/products.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (validateProducts(data).length) throw new Error("Produktliste ungültig");
    products = data.products;
    $("#list-date").textContent = `Produktliste vom ${formatDate(data.listDate)}`;
    $("#list-stale").hidden = !isListStale(data.listDate, new Date());
    rebuildAll();
  } catch {
    $("#baskets").textContent = "Die Produktliste konnte nicht geladen werden. Bitte die Seite neu laden.";
  }
}

start();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  setupFeedback();
  // Beim Zurueckkehren nach einer neuen Version fragen (die App bleibt auf dem Handy oft tagelang offen).
  navigator.serviceWorker?.getRegistration().then((reg) => reg?.update()).catch(() => {});
});

if ("serviceWorker" in navigator) {
  // Lief schon eine alte Version, die Seite einmal neu laden, sobald die neue uebernimmt.
  // Beim allerersten Besuch (noch kein Controller) wird nicht neu geladen.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
