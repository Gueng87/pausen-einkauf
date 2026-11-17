import { BASE_TARGETS } from "./targets.js";

const KEY = "pausen-einkauf:v1";
const MAX_HISTORY = 200;
const DURATIONS = Object.keys(BASE_TARGETS);
const FEEDBACKS = ["zu-wenig", "genau-richtig", "zu-viel"];

export function defaultState() {
  return {
    dislikes: [],
    reserveAvailable: true,
    offsets: Object.fromEntries(DURATIONS.map((d) => [d, 0])),
    history: [],
  };
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function validEntry(e) {
  return (
    isObj(e) &&
    typeof e.at === "string" &&
    isObj(e.query) &&
    DURATIONS.includes(e.query.duration) &&
    typeof e.basketKey === "string" &&
    typeof e.hauptId === "string" &&
    (e.feedback === null || FEEDBACKS.includes(e.feedback))
  );
}

function normalize(raw) {
  const st = defaultState();
  if (!isObj(raw)) return st;
  if (Array.isArray(raw.dislikes)) st.dislikes = raw.dislikes.filter((x) => typeof x === "string");
  if (typeof raw.reserveAvailable === "boolean") st.reserveAvailable = raw.reserveAvailable;
  if (isObj(raw.offsets)) {
    for (const d of DURATIONS) {
      const v = raw.offsets[d];
      st.offsets[d] = typeof v === "number" && Number.isFinite(v) ? v : 0;
    }
  }
  if (Array.isArray(raw.history)) st.history = raw.history.filter(validEntry);
  return st;
}

export function loadState(store) {
  try {
    const s = store === undefined ? globalThis.localStorage : store;
    const text = s.getItem(KEY);
    if (text == null) return defaultState();
    return normalize(JSON.parse(text));
  } catch {
    return defaultState();
  }
}

export function saveState(state, store) {
  try {
    const s = store === undefined ? globalThis.localStorage : store;
    const out = { ...state, history: (state.history || []).slice(-MAX_HISTORY) };
    s.setItem(KEY, JSON.stringify(out));
  } catch {
    /* Speicher voll oder nicht verfügbar: ignorieren */
  }
}
