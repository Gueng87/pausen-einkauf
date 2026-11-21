// Ausführen: node --test kochen/tests
import { test } from "node:test";
import assert from "node:assert/strict";
import { RECIPES } from "../src/data/recipes.js";
import { INGREDIENTS as ING, AISLES, UNITS } from "../src/data/ingredients.js";
import {
  STORES, nutrition, availableAt, candidates, pickRecipe, shoppingList, amountText, packsFor, fractionText, listAsText,
} from "../src/engine.js";
import { normalize, defaultState } from "../src/storage.js";

test("Daten: jede Rezeptzeile verweist auf eine bekannte Zutat und Einheit", () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), `doppelte id ${r.id}`);
    ids.add(r.id);
    assert.ok(r.steps.length >= 3, r.id);
    for (const [id, amount, unit] of r.items) {
      assert.ok(ING[id], `${r.id}: unbekannte Zutat ${id}`);
      assert.ok(amount > 0, `${r.id}: ${id}`);
      if (unit === "Stk") assert.ok(ING[id].piece, `${r.id}: ${id} ohne Stückangabe`);
      else if (unit) assert.ok(UNITS[unit], `${r.id}: Einheit ${unit}`);
    }
  }
});

test("Daten: jede Nicht-Vorrat-Zutat hat einen Gang und gültige Packungen", () => {
  const aisles = new Set(AISLES.map((a) => a.id));
  for (const [id, ing] of Object.entries(ING)) {
    assert.equal(ing.n.length, 4, id);
    if (ing.pantry) continue;
    assert.ok(aisles.has(ing.aisle), `${id}: Gang ${ing.aisle}`);
    for (const s of Object.keys(STORES)) {
      const offer = ing.stores[s];
      if (offer === null) continue;
      const [label, g, price] = offer;
      assert.ok(label && g > 0 && price > 0, `${id} @ ${s}`);
    }
  }
});

test("Jedes Rezept ist ein Sattmacher: ≤ 700 kcal, ≥ 38 g Eiweiss, < 100 kcal pro 100 g", () => {
  for (const r of RECIPES) {
    const n = nutrition(r, ING);
    assert.ok(n.kcal <= 700 && n.kcal >= 400, `${r.id}: ${n.kcal} kcal`);
    assert.ok(n.protein >= 38, `${r.id}: ${n.protein} g Eiweiss`);
    assert.ok(n.kcalPer100 < 100, `${r.id}: ${n.kcalPer100} kcal/100 g`);
  }
});

test("Jeder Laden hat genug Menüs, auch vegetarisch", () => {
  for (const store of Object.keys(STORES)) {
    assert.ok(candidates(RECIPES, ING, { store, diet: "alles" }).length >= 12, store);
    assert.ok(candidates(RECIPES, ING, { store, diet: "vegi" }).length >= 3, store);
  }
});

test("Rezepte mit Zutaten, die es bei Denner nicht gibt, kommen dort nicht", () => {
  const linsen = RECIPES.find((r) => r.id === "linsenpasta-gemuese");
  assert.equal(availableAt(linsen, "denner", ING), false);
  assert.equal(availableAt(linsen, "migros", ING), true);
  assert.ok(!candidates(RECIPES, ING, { store: "denner", diet: "alles" }).includes(linsen));
});

test("Ausgeblendete Menüs und Vegi-Filter wirken", () => {
  const all = candidates(RECIPES, ING, { store: "coop", diet: "alles" });
  const fewer = candidates(RECIPES, ING, { store: "coop", diet: "alles", dislikes: [all[0].id] });
  assert.equal(fewer.length, all.length - 1);
  assert.ok(candidates(RECIPES, ING, { store: "coop", diet: "vegi" }).every((r) => r.vegi));
});

test("packsFor: ganze Packungen mit kleiner Toleranz", () => {
  assert.deepEqual(packsFor(250, 500), { count: 1, restG: 250 });
  assert.deepEqual(packsFor(500, 500), { count: 1, restG: 0 });
  assert.equal(packsFor(510, 500).count, 1); // 2 % zu wenig: reicht noch
  assert.equal(packsFor(600, 500).count, 2);
});

test("Einkaufsliste skaliert mit den Portionen", () => {
  const r = RECIPES.find((x) => x.id === "hack-kartoffel-pfanne");
  const one = shoppingList(r, 1, "migros", ING);
  const six = shoppingList(r, 6, "migros", ING);
  const hack = (l) => l.sections.flatMap((s) => s.items).find((i) => i.id === "rindshack");
  assert.equal(hack(one).count, 1); // 125 g -> 1 × 500 g
  assert.equal(hack(six).count, 2); // 750 g -> 2 × 500 g
  assert.match(hack(one).rest, /Rest ca\. 380 g/);
  assert.ok(six.totalChf > one.totalChf);
  assert.ok(one.perPortionChf < one.totalChf); // nur verbrauchte Menge
  // Vorrat kommt nicht als Packung, sondern separat
  assert.ok(one.pantry.some((p) => p.id === "oel"));
  assert.ok(!one.sections.flatMap((s) => s.items).some((i) => i.id === "oel"));
});

test("Einkaufsliste folgt der Gang-Reihenfolge und nimmt die Packung des Ladens", () => {
  const r = RECIPES.find((x) => x.id === "hack-kartoffel-pfanne");
  const d = shoppingList(r, 2, "denner", ING);
  const order = AISLES.map((a) => a.id);
  const idx = d.sections.map((s) => order.indexOf(s.id));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  const kart = d.sections.flatMap((s) => s.items).find((i) => i.id === "kartoffeln");
  assert.equal(kart.product, "Kartoffeln festkochend 2.5 kg");
});

test("amountText: lesbare Mengen", () => {
  const eier = ["eier", 3, "Stk"];
  assert.equal(amountText(eier, 2, ING), "6 Eier");
  assert.equal(amountText(["eier", 1, "Stk"], 1, ING), "1 Ei");
  assert.equal(amountText(["knoblauch", 1, "Zehe"], 3, ING), "3 Zehen");
  assert.equal(amountText(["oel", 1, "TL"], 1, ING), "1 TL");
  assert.equal(amountText(["oel", 1, "TL"], 4, ING), "1½ EL");
  assert.equal(amountText(["zitrone", 0.25, "Stk"], 2, ING), "½ Zitrone");
  assert.equal(amountText(["kartoffeln", 300], 4, ING), "1.2 kg");
  assert.equal(amountText(["rindshack", 125], 3, ING), "380 g");
  assert.equal(amountText(["kidney", 120], 2, ING), "240 g (≈ 1 Dose)");
  assert.equal(amountText(["salz_pfeffer", 1, "Prise"], 6, ING), "nach Geschmack");
});

test("fractionText", () => {
  assert.equal(fractionText(1.5), "1½");
  assert.equal(fractionText(0.1), "¼");
  assert.equal(fractionText(2), "2");
});

test("pickRecipe: wechselt durch und meldet, wenn alle gesehen sind", () => {
  const list = candidates(RECIPES, ING, { store: "migros", diet: "vegi" });
  const seen = new Set();
  let current = null;
  for (let i = 0; i < list.length; i++) {
    const { recipe, wrapped } = pickRecipe(list, ING, { seen, current }, () => 0.5);
    assert.equal(wrapped, false);
    assert.ok(!seen.has(recipe.id));
    seen.add(recipe.id);
    current = recipe.id;
  }
  const again = pickRecipe(list, ING, { seen, current }, () => 0.5);
  assert.equal(again.wrapped, true);
  assert.notEqual(again.recipe.id, current);
  assert.deepEqual(pickRecipe([], ING), { recipe: null, wrapped: false });
});

test("listAsText enthält Laden, Packungen und Total", () => {
  const r = RECIPES[0];
  const list = shoppingList(r, 2, "coop", ING);
  const text = listAsText(r, 2, "coop", list, new Set(["rindshack"]));
  assert.match(text, /^Einkaufsliste Coop: /);
  assert.match(text, /☑ 1 × Rindshackfleisch 500 g/);
  assert.match(text, /Total ca\. CHF/);
});

test("Speicher: kaputte Werte fallen auf Standard zurück", () => {
  assert.deepEqual(normalize(null), defaultState());
  const st = normalize({ store: "aldi", portions: 99, diet: "x", checked: [1, "a"], history: [{ id: "x", at: "t" }, {}] });
  assert.equal(st.store, "migros");
  assert.equal(st.portions, 2);
  assert.equal(st.diet, "alles");
  assert.deepEqual(st.checked, ["a"]);
  assert.equal(st.history.length, 1);
});
