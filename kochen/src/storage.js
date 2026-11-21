// Alles bleibt im Browser (localStorage), nichts wird verschickt.
import { STORES, DIETS, MIN_PORTIONS, MAX_PORTIONS } from "./engine.js";

const KEY = "satt-und-fit:v1";
const MAX_HISTORY = 50;

export function defaultState() {
  return {
    store: "migros",
    portions: 2,
    diet: "alles",
    current: null, // id des angezeigten Menüs
    chosen: false, // «Das koche ich» gedrückt: Liste und Rezept offen
    tab: "liste",
    checked: [], // abgehakte Zutaten-ids auf der aktuellen Liste
    dislikes: [],
    history: [], // [{ id, at }] gewählte Menüs, neueste zuletzt
  };
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export function normalize(raw) {
  const st = defaultState();
  if (!isObj(raw)) return st;
  if (Object.hasOwn(STORES, raw.store)) st.store = raw.store;
  if (Number.isInteger(raw.portions) && raw.portions >= MIN_PORTIONS && raw.portions <= MAX_PORTIONS) st.portions = raw.portions;
  if (DIETS.includes(raw.diet)) st.diet = raw.diet;
  if (typeof raw.current === "string") st.current = raw.current;
  if (typeof raw.chosen === "boolean") st.chosen = raw.chosen;
  if (raw.tab === "liste" || raw.tab === "rezept") st.tab = raw.tab;
  st.checked = strings(raw.checked);
  st.dislikes = strings(raw.dislikes);
  if (Array.isArray(raw.history)) {
    st.history = raw.history.filter((e) => isObj(e) && typeof e.id === "string" && typeof e.at === "string").slice(-MAX_HISTORY);
  }
  return st;
}

export function loadState(store = globalThis.localStorage) {
  try {
    const text = store.getItem(KEY);
    return text == null ? defaultState() : normalize(JSON.parse(text));
  } catch {
    return defaultState();
  }
}

export function saveState(state, store = globalThis.localStorage) {
  try {
    store.setItem(KEY, JSON.stringify({ ...state, history: state.history.slice(-MAX_HISTORY) }));
  } catch {
    /* Speicher voll oder gesperrt: App läuft trotzdem */
  }
}

/** ids der zuletzt gewählten n Menüs. */
export function recentIds(history, n = 5) {
  return new Set(history.slice(-n).map((e) => e.id));
}
