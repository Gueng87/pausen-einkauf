export const KCAL_STEP = 60;
export const KCAL_CAP = 900;

export const BASE_TARGETS = {
  "3": { kcalMin: 500, kcalMax: 580, proteinMin: 25, fiberMin: 7, label: "reicht für 3 Std. nach dem Essen" },
  "4-5": { kcalMin: 570, kcalMax: 650, proteinMin: 30, fiberMin: 9, label: "reicht für 4–5 Std. nach dem Essen" },
  "6": { kcalMin: 630, kcalMax: 700, proteinMin: 35, fiberMin: 10, label: "reicht für 6 Std. nach dem Essen" },
};

/** Höchster erlaubter Offset, damit kcalMax nicht über KCAL_CAP steigt. */
export function maxOffset(duration) {
  return KCAL_CAP - BASE_TARGETS[duration].kcalMax;
}

export function getTargets(duration, offset) {
  const base = BASE_TARGETS[duration];
  const off = Math.min(Math.max(offset || 0, 0), maxOffset(duration));
  const kcalMax = base.kcalMax + off;
  return {
    kcalMin: base.kcalMin + off,
    kcalMax,
    proteinMin: Math.round((base.proteinMin * kcalMax) / base.kcalMax),
    fiberMin: Math.round((base.fiberMin * kcalMax) / base.kcalMax),
    label: base.label,
  };
}
