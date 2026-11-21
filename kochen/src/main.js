import { RECIPES } from "./data/recipes.js";
import { INGREDIENTS as ING, PRICE_DATE } from "./data/ingredients.js";
import {
  STORES, MIN_PORTIONS, MAX_PORTIONS, candidates, pickRecipe, nutrition, shoppingList, amountText, listAsText, chf,
} from "./engine.js";
import { loadState, saveState, recentIds } from "./storage.js";

let state = loadState();
const seen = new Set(); // in dieser Sitzung schon gezeigte Menüs, damit «Anderes Menü» durchwechselt
let notice = "";
let shareStatus = "";

const $ = (sel) => document.querySelector(sel);

/** Kleiner DOM-Helfer: Text immer als Textknoten, nie als HTML. */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k === "checked") node.checked = Boolean(v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c);
  return node;
}

const portionsText = (n) => `${n} ${n === 1 ? "Portion" : "Portionen"}`;
const byId = (id) => RECIPES.find((r) => r.id === id) ?? null;
const available = () => candidates(RECIPES, ING, state);

function update(patch) {
  state = { ...state, ...patch };
  saveState(state);
  render();
}

/** Stellt sicher, dass ein passendes Menü angezeigt wird (z. B. nach Ladenwechsel). */
function ensureCurrent() {
  const list = available();
  if (list.some((r) => r.id === state.current)) return;
  const { recipe } = pickRecipe(list, ING, { seen, recent: recentIds(state.history) });
  state = { ...state, current: recipe?.id ?? null, chosen: false, checked: [] };
  if (recipe) seen.add(recipe.id);
  saveState(state);
}

function newMenu() {
  if (state.current) seen.add(state.current);
  const { recipe, wrapped } = pickRecipe(available(), ING, { seen, recent: recentIds(state.history), current: state.current });
  if (wrapped) {
    seen.clear();
    notice = "Du hast alle passenden Menüs gesehen. Es geht wieder von vorne los.";
  } else {
    notice = "";
  }
  if (recipe) seen.add(recipe.id);
  shareStatus = "";
  update({ current: recipe?.id ?? null, chosen: false, checked: [], tab: "liste" });
  $("#menu").scrollIntoView({ behavior: "smooth", block: "start" });
}

function choose() {
  const history = [...state.history, { id: state.current, at: new Date().toISOString() }];
  update({ chosen: true, tab: "liste", checked: [], history });
  requestAnimationFrame(() => $("#detail").scrollIntoView({ behavior: "smooth", block: "start" }));
}

function dislike() {
  const id = state.current;
  if (!id) return;
  update({ dislikes: [...new Set([...state.dislikes, id])], current: null, chosen: false, checked: [] });
}

function toggleChecked(id) {
  const set = new Set(state.checked);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  update({ checked: [...set] });
}

async function share(recipe, list) {
  const text = listAsText(recipe, state.portions, state.store, list, new Set(state.checked));
  try {
    if (navigator.share) {
      await navigator.share({ title: "Einkaufsliste", text });
      shareStatus = "";
    } else {
      await navigator.clipboard.writeText(text);
      shareStatus = "Liste kopiert. Du kannst sie jetzt z. B. in WhatsApp einfügen.";
    }
  } catch (e) {
    if (e?.name === "AbortError") return; // Teilen abgebrochen
    shareStatus = "Teilen hat nicht geklappt. Mach am besten einen Screenshot.";
  }
  render();
}

// ---------- Darstellung ----------

function renderControls() {
  for (const group of document.querySelectorAll("[data-group]")) {
    for (const btn of group.querySelectorAll("button")) {
      btn.setAttribute("aria-pressed", String(state[group.dataset.group] === btn.dataset.value));
    }
  }
  $("#portions-value").textContent = portionsText(state.portions);
  $("#portions-minus").disabled = state.portions <= MIN_PORTIONS;
  $("#portions-plus").disabled = state.portions >= MAX_PORTIONS;

  const info = $("#dislikes-info");
  const n = state.dislikes.length;
  info.hidden = n === 0;
  info.replaceChildren(
    `${n} ${n === 1 ? "Menü" : "Menüs"} ausgeblendet. `,
    el("button", { type: "button", class: "link", onclick: () => { seen.clear(); update({ dislikes: [] }); } }, "Wieder alle zeigen"),
  );
}

function stat(value, label) {
  return el("div", { class: "stat" }, el("strong", {}, value), el("span", {}, label));
}

function renderMenu(recipe) {
  const host = $("#menu");
  if (!recipe) {
    host.replaceChildren(
      el("div", { class: "card" }, el("p", { class: "notice" }, "Für diese Auswahl gibt es gerade kein passendes Menü. Probier einen anderen Laden oder zeig ausgeblendete Menüs wieder an.")),
    );
    return;
  }
  const n = nutrition(recipe, ING);
  const list = shoppingList(recipe, state.portions, state.store, ING);
  const meta = [`⏱ ${recipe.minutes} Min.`, `ca. ${chf(list.perPortionChf)} pro Portion`, recipe.vegi ? "vegetarisch" : null].filter(Boolean);

  host.replaceChildren(
    el(
      "article",
      { class: "card menu" },
      el("p", { class: "eyebrow" }, "Dein Menü"),
      el("div", { class: "menu-head" }, el("span", { class: "emoji", "aria-hidden": "true" }, recipe.emoji), el("h2", {}, recipe.title)),
      el("p", { class: "desc" }, recipe.description),
      el("div", { class: "stats" }, stat(`${n.kcal}`, "kcal"), stat(`${n.protein} g`, "Eiweiss"), stat(`${n.plateG} g`, "auf dem Teller")),
      el("p", { class: "small muted" }, "pro Portion"),
      el("p", { class: "volume" }, `Nur ${n.kcalPer100} kcal pro 100 g: viel Essen für wenig Kalorien.`),
      el("p", { class: "meta" }, meta.join(" · ")),
      notice ? el("p", { class: "notice" }, notice) : null,
      el(
        "div",
        { class: "actions" },
        el("button", { type: "button", onclick: newMenu }, "Anderes Menü"),
        state.chosen ? null : el("button", { type: "button", class: "primary", onclick: choose }, "Das koche ich"),
      ),
      el("button", { type: "button", class: "link dislike", onclick: dislike }, "Mag ich nicht, nicht mehr vorschlagen"),
    ),
  );
}

function renderList(recipe) {
  const list = shoppingList(recipe, state.portions, state.store, ING);
  const checked = new Set(state.checked);
  const row = (id, main, meta, price) =>
    el(
      "li",
      { class: checked.has(id) ? "done" : null },
      el(
        "label",
        {},
        el("input", { type: "checkbox", checked: checked.has(id), onchange: () => toggleChecked(id) }),
        el("span", { class: "item-text" }, el("span", { class: "item-name" }, main), meta ? el("span", { class: "item-meta" }, meta) : null),
        price ? el("span", { class: "price" }, price) : null,
      ),
    );

  const parts = [
    el("div", { class: "list-head" }, el("h2", {}, `Einkauf ${STORES[state.store]}`), el("span", { class: "total" }, `ca. ${chf(list.totalChf)}`)),
    el("p", { class: "small muted" }, `Für ${portionsText(state.portions)}. Ganze Packungen, was übrig bleibt, steht dabei.`),
  ];
  for (const s of list.sections) {
    parts.push(el("h3", {}, s.name));
    parts.push(
      el("ul", { class: "items" }, s.items.map((it) => row(it.id, `${it.count} × ${it.product}`, [it.need, it.rest].filter(Boolean).join(" · "), chf(it.priceChf)))),
    );
  }
  if (list.pantry.length) {
    parts.push(el("h3", {}, "Vorrat: hast du das zuhause?"));
    parts.push(el("ul", { class: "items pantry" }, list.pantry.map((p) => row(`vorrat:${p.id}`, p.name, p.amount, ""))));
  }
  parts.push(
    el(
      "div",
      { class: "actions" },
      el("button", { type: "button", onclick: () => share(recipe, list) }, "Liste teilen"),
      checked.size ? el("button", { type: "button", onclick: () => update({ checked: [] }) }, "Häkchen löschen") : null,
    ),
  );
  if (shareStatus) parts.push(el("p", { class: "confirm", role: "status" }, shareStatus));
  return parts;
}

function renderRecipe(recipe) {
  const n = nutrition(recipe, ING);
  return [
    el("h2", {}, `Zutaten für ${portionsText(state.portions)}`),
    el(
      "ul",
      { class: "ingredients" },
      recipe.items.map((item) => el("li", {}, el("span", { class: "amount" }, amountText(item, state.portions, ING)), el("span", {}, ING[item[0]].name))),
    ),
    el("h2", {}, "So geht's"),
    el("ol", { class: "steps" }, recipe.steps.map((s) => el("li", {}, s))),
    recipe.tip ? el("p", { class: "tip" }, `Tipp: ${recipe.tip}`) : null,
    el("p", { class: "small muted" }, `Pro Portion: ${n.kcal} kcal · ${n.protein} g Eiweiss · ${n.carbs} g Kohlenhydrate · ${n.fat} g Fett`),
  ];
}

function renderDetail(recipe) {
  const host = $("#detail");
  if (!recipe || !state.chosen) {
    host.replaceChildren();
    return;
  }
  const tab = (id, label) =>
    el("button", { type: "button", role: "tab", "aria-selected": String(state.tab === id), onclick: () => update({ tab: id }) }, label);
  host.replaceChildren(
    el(
      "div",
      { class: "card detail" },
      el("div", { class: "tabs", role: "tablist", "aria-label": "Ansicht" }, tab("liste", "🛒 Einkaufsliste"), tab("rezept", "👩‍🍳 Rezept")),
      el("div", { role: "tabpanel" }, state.tab === "liste" ? renderList(recipe) : renderRecipe(recipe)),
    ),
  );
}

function render() {
  ensureCurrent();
  renderControls();
  const recipe = byId(state.current);
  renderMenu(recipe);
  renderDetail(recipe);
}

function setupControls() {
  for (const group of document.querySelectorAll("[data-group]")) {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (!btn || state[group.dataset.group] === btn.dataset.value) return;
      notice = "";
      shareStatus = "";
      update({ [group.dataset.group]: btn.dataset.value });
    });
  }
  const step = (d) => update({ portions: Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, state.portions + d)) });
  $("#portions-minus").addEventListener("click", () => step(-1));
  $("#portions-plus").addEventListener("click", () => step(1));
  const [y, m, d] = PRICE_DATE.split("-");
  $("#price-date").textContent = `${d}.${m}.${y}`;
}

setupControls();
if (state.current) seen.add(state.current);
render();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  navigator.serviceWorker?.getRegistration().then((reg) => reg?.update()).catch(() => {});
});

if ("serviceWorker" in navigator) {
  // Lief schon eine alte Version, die Seite einmal neu laden, sobald die neue übernimmt.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
