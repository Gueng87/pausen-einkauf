import { KCAL_STEP, maxOffset } from "./targets.js";

export function applyFeedback(state, entryIndex, answer, reserveEaten) {
  const next = {
    ...state,
    dislikes: [...state.dislikes],
    offsets: { ...state.offsets },
    history: state.history.map((e) => ({ ...e })),
  };
  const entry = next.history[entryIndex];
  if (!entry) return next;

  const effective = reserveEaten === true ? "zu-wenig" : answer;
  entry.feedback = effective;
  if (reserveEaten === true) next.reserveAvailable = false;

  const duration = entry.query.duration;
  const current = next.offsets[duration] || 0;
  if (effective === "zu-wenig") {
    next.offsets[duration] = Math.min(current + KCAL_STEP, maxOffset(duration));
  } else if (effective === "zu-viel") {
    next.offsets[duration] = Math.max(current - KCAL_STEP, 0);
  }
  return next;
}

export function countSuccesses(history, hauptId, duration) {
  return history.filter(
    (e) => e.feedback === "genau-richtig" && e.hauptId === hauptId && e.query.duration === duration,
  ).length;
}

export function pendingFeedback(history, now) {
  if (history.length === 0) return null;
  const index = history.length - 1;
  const last = history[index];
  if (last.feedback !== null) return null;
  const ageMin = (now.getTime() - new Date(last.at).getTime()) / 60000;
  return ageMin >= 60 ? index : null;
}
