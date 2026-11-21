// Zutaten: Nährwerte pro 100 g (roh bzw. abgetropft), Gang im Laden und Packung pro Laden.
//
// n:      [kcal, Eiweiss g, Kohlenhydrate g, Fett g] pro 100 g (Richtwerte aus Nährwerttabellen)
// cook:   Gewichtsfaktor beim Kochen (Reis quillt auf, Fleisch verliert Wasser). Nur für «Teller in g».
// piece:  optionale Stückangabe (Ei, Dose, Gurke ...) für die Anzeige
// pantry: Vorrat (Öl, Gewürze ...). Kommt nicht als Packung auf die Liste, sondern unter «Hast du's zuhause?»
// stores: pro Laden [Packung, Inhalt in g, Richtpreis CHF] oder null = dort nicht sicher erhältlich.
//         Inhalt bei Dosen = Abtropfgewicht, weil die Rezepte abgetropft rechnen.
//
// Die Preise sind Richtwerte (Stand Nov. 2026), keine Live-Preise. Aktionen und Preisänderungen
// sind nicht berücksichtigt.

export const PRICE_DATE = "2026-11-21";

export const AISLES = [
  { id: "gemuese", name: "Gemüse & Früchte" },
  { id: "fleisch", name: "Fleisch & Fisch" },
  { id: "milch", name: "Milchprodukte & Eier" },
  { id: "brot", name: "Brot" },
  { id: "vorrat", name: "Teigwaren, Reis & Konserven" },
  { id: "tk", name: "Tiefkühl" },
];

const all = (label, g, migros, coop, denner) => ({
  migros: [label, g, migros],
  coop: [label, g, coop],
  denner: denner == null ? null : [label, g, denner],
});

export const INGREDIENTS = {
  // Gemüse & Früchte
  kartoffeln: {
    name: "Kartoffeln, festkochend", aisle: "gemuese", n: [77, 2, 17, 0.1],
    stores: { migros: ["Kartoffeln festkochend 1.5 kg", 1500, 3.95], coop: ["Kartoffeln festkochend 1.5 kg", 1500, 4.2], denner: ["Kartoffeln festkochend 2.5 kg", 2500, 4.99] },
  },
  suesskartoffeln: { name: "Süsskartoffeln", aisle: "gemuese", n: [86, 1.6, 20, 0.1], stores: all("Süsskartoffeln 1 kg", 1000, 4.5, 4.95, 3.99) },
  broccoli: { name: "Broccoli", aisle: "gemuese", n: [34, 2.8, 4, 0.4], cook: 0.9, stores: all("Broccoli 500 g", 500, 2.95, 3.2, 2.49) },
  blumenkohl: { name: "Blumenkohl", aisle: "gemuese", n: [25, 2, 3, 0.3], cook: 0.9, stores: all("Blumenkohl, 1 Stück (ca. 800 g)", 800, 3.5, 3.6, 2.99) },
  zucchetti: { name: "Zucchetti", aisle: "gemuese", n: [18, 1.3, 2.2, 0.3], cook: 0.9, stores: all("Zucchetti 500 g", 500, 2.9, 3.1, 2.49) },
  peperoni: { name: "Peperoni", aisle: "gemuese", n: [30, 1, 5, 0.3], cook: 0.9, stores: all("Peperoni-Mix, 3 Stück (ca. 500 g)", 500, 3.5, 3.7, 2.99) },
  ruebli: { name: "Rüebli", aisle: "gemuese", n: [41, 0.9, 8, 0.2], cook: 0.9, stores: all("Rüebli 1 kg", 1000, 2.2, 2.4, 1.79) },
  zwiebeln: { name: "Zwiebeln", aisle: "gemuese", n: [40, 1.2, 8, 0.1], cook: 0.8, stores: all("Zwiebeln 1 kg", 1000, 2.2, 2.3, 1.79) },
  knoblauch: {
    name: "Knoblauch", aisle: "gemuese", n: [140, 6, 28, 0.5],
    stores: all("Knoblauch, 1 Knolle", 40, 0.9, 0.95, 0.79),
  },
  champignons: { name: "Champignons", aisle: "gemuese", n: [22, 3, 0.5, 0.3], cook: 0.7, stores: all("Champignons 250 g", 250, 2.95, 3.1, 2.49) },
  lauch: { name: "Lauch", aisle: "gemuese", n: [30, 2, 4, 0.3], cook: 0.85, stores: all("Lauch 500 g", 500, 2.5, 2.7, 2.19) },
  gurke: { name: "Gurke", aisle: "gemuese", n: [13, 0.6, 2, 0.1], piece: { g: 400, one: "Gurke", many: "Gurken" }, stores: all("Gurke, 1 Stück", 400, 1.2, 1.3, 0.99) },
  tomaten: { name: "Tomaten", aisle: "gemuese", n: [18, 0.9, 3, 0.2], stores: all("Tomaten 500 g", 500, 2.95, 3.2, 2.49) },
  eisberg: { name: "Eisbergsalat", aisle: "gemuese", n: [14, 1, 2, 0.2], piece: { g: 500, one: "Kopf", many: "Köpfe" }, stores: all("Eisbergsalat, 1 Stück", 500, 1.8, 1.95, 1.49) },
  fruehlingszwiebeln: { name: "Frühlingszwiebeln", aisle: "gemuese", n: [30, 1.8, 5, 0.2], stores: all("Frühlingszwiebeln, 1 Bund", 100, 1.5, 1.6, 1.29) },
  weisskabis: { name: "Weisskabis", aisle: "gemuese", n: [25, 1.4, 4, 0.2], cook: 0.85, stores: all("Weisskabis, 1 Stück (ca. 1 kg)", 1000, 2.5, 2.7, 1.99) },
  zitrone: { name: "Zitrone", aisle: "gemuese", n: [30, 1, 3, 0.3], piece: { g: 100, one: "Zitrone", many: "Zitronen" }, stores: all("Zitronen 500 g", 500, 2.5, 2.7, 1.99) },

  // Fleisch & Fisch
  rindshack: { name: "Rindshackfleisch", aisle: "fleisch", n: [190, 20, 0, 12], cook: 0.75, stores: all("Rindshackfleisch 500 g", 500, 10.5, 10.95, 8.95) },
  pouletbrust: {
    name: "Pouletbrust", aisle: "fleisch", n: [110, 23, 0, 1.5], cook: 0.75,
    stores: { migros: ["Pouletbrüstli 400 g", 400, 13.9], coop: ["Pouletbrust 400 g", 400, 14.5], denner: ["Pouletbrust 500 g", 500, 12.95] },
  },
  rindgeschnetzelt: {
    name: "Rindsgeschnetzeltes", aisle: "fleisch", n: [120, 22, 0, 3.5], cook: 0.75,
    stores: { migros: ["Rindsgeschnetzeltes 300 g", 300, 13.5], coop: ["Rindsgeschnetzeltes 300 g", 300, 14.2], denner: ["Rindsgeschnetzeltes 400 g", 400, 13.95] },
  },
  schweinsgeschnetzeltes: { name: "Schweinsgeschnetzeltes", aisle: "fleisch", n: [130, 22, 0, 4.5], cook: 0.75, stores: { migros: ["Schweinsgeschnetzeltes 300 g", 300, 7.9], coop: ["Schweinsgeschnetzeltes 300 g", 300, 8.5], denner: ["Schweinsgeschnetzeltes 500 g", 500, 9.95] } },
  schinken: {
    name: "Hinterschinken", aisle: "fleisch", n: [110, 20, 1, 3],
    stores: { migros: ["Hinterschinken 150 g", 150, 4.2], coop: ["Hinterschinken 150 g", 150, 4.5], denner: ["Hinterschinken 200 g", 200, 3.95] },
  },

  // Milchprodukte & Eier
  magerquark: { name: "Magerquark", aisle: "milch", n: [67, 12, 4, 0.2], stores: all("Magerquark 500 g", 500, 2.6, 2.75, 2.29) },
  cottage: {
    name: "Hüttenkäse (Cottage Cheese)", aisle: "milch", n: [98, 12, 3, 4.3],
    stores: { migros: ["Cottage Cheese nature 200 g", 200, 2.1], coop: ["Hüttenkäse nature 200 g", 200, 2.25], denner: ["Hüttenkäse nature 200 g", 200, 1.85] },
  },
  eier: { name: "Eier", aisle: "milch", n: [140, 12.5, 0.7, 10], piece: { g: 55, one: "Ei", many: "Eier" }, stores: all("Eier, 6 Stück", 330, 4.4, 4.6, 3.95) },
  parmesan: { name: "Parmesan, gerieben", aisle: "milch", n: [390, 33, 0, 28], stores: all("Parmesan gerieben 100 g", 100, 3.6, 3.8, 2.95) },
  feta: { name: "Feta", aisle: "milch", n: [260, 17, 0.5, 21], stores: all("Feta 200 g", 200, 3.95, 4.2, 2.99) },
  mozzarella: { name: "Mozzarella", aisle: "milch", n: [230, 18, 1, 17], stores: all("Mozzarella 150 g (125 g abgetropft)", 125, 1.6, 1.7, 1.25) },
  kochcreme: { name: "Kochcrème (15 % Fett)", aisle: "milch", n: [160, 3, 4, 15], stores: all("Kochcrème 250 ml", 250, 2.2, 2.3, 1.79) },

  // Brot
  vollkornbrot: { name: "Vollkornbrot", aisle: "brot", n: [230, 8, 40, 2], stores: all("Vollkornbrot 500 g", 500, 3.2, 3.4, 2.49) },

  tortillas: { name: "Tortillas (Weizen)", aisle: "brot", n: [300, 8.5, 50, 7], piece: { g: 60, one: "Tortilla", many: "Tortillas" }, stores: all("Tortillas, 6 Stück", 360, 3.2, 3.4, 2.49) },

  // Teigwaren, Reis & Konserven
  reis: { name: "Basmatireis", aisle: "vorrat", n: [350, 8, 77, 0.6], cook: 2.6, stores: all("Basmatireis 1 kg", 1000, 3.5, 3.7, 2.99) },
  vk_spaghetti: { name: "Vollkorn-Spaghetti", aisle: "vorrat", n: [350, 13, 65, 2.5], cook: 2.3, stores: all("Vollkorn-Spaghetti 500 g", 500, 1.95, 2.1, 1.69) },
  // In Migros und Coop gibt es Linsen-Teigwaren; bei Denner sind sie nicht sicher im Sortiment.
  linsenpasta: { name: "Rote-Linsen-Teigwaren", aisle: "vorrat", n: [340, 25, 50, 2], cook: 2.2, stores: all("Rote-Linsen-Fusilli 250 g", 250, 3.5, 3.95, null) },
  mie: { name: "Mie-Nudeln", aisle: "vorrat", n: [360, 12, 70, 2], cook: 2.3, stores: all("Mie-Nudeln 250 g", 250, 2.4, 2.6, null) },
  lasagneblaetter: { name: "Lasagneblätter", aisle: "vorrat", n: [350, 12, 70, 1.5], cook: 2, stores: all("Lasagneblätter 500 g", 500, 2.2, 2.4, 1.79) },
  mehl: { name: "Weissmehl", aisle: "vorrat", n: [345, 10, 72, 1], stores: all("Weissmehl 1 kg", 1000, 1.95, 2.1, 1.45) },
  essiggurken: { name: "Essiggurken", aisle: "vorrat", n: [20, 0.5, 3, 0.2], stores: all("Essiggurken, Glas (ca. 190 g abgetropft)", 190, 2.2, 2.4, 1.69) },
  kichererbsen: { name: "Kichererbsen (Dose, abgetropft)", aisle: "vorrat", n: [130, 7, 16, 2.5], piece: { g: 240, one: "Dose", many: "Dosen" }, stores: all("Kichererbsen, Dose 400 g", 240, 1.3, 1.4, 0.99) },
  kidney: { name: "Kidneybohnen (Dose, abgetropft)", aisle: "vorrat", n: [100, 7, 13, 0.5], piece: { g: 250, one: "Dose", many: "Dosen" }, stores: all("Kidneybohnen, Dose 400 g", 250, 1.3, 1.4, 0.99) },
  mais: { name: "Mais (Dose, abgetropft)", aisle: "vorrat", n: [80, 2.6, 13, 1.5], piece: { g: 140, one: "Dose", many: "Dosen" }, stores: all("Mais, Dose 285 g", 140, 1.5, 1.6, 1.19) },
  tomaten_dose: { name: "Gehackte Tomaten (Dose)", aisle: "vorrat", n: [22, 1.1, 3.5, 0.2], piece: { g: 400, one: "Dose", many: "Dosen" }, stores: all("Gehackte Tomaten, Dose 400 g", 400, 0.95, 0.95, 0.79) },
  passata: { name: "Passata", aisle: "vorrat", n: [35, 1.5, 6, 0.2], stores: all("Passata 500 g", 500, 1.6, 1.7, 1.29) },

  // Tiefkühl
  crevetten: { name: "Crevetten, roh geschält (tiefgekühlt)", aisle: "tk", n: [70, 16, 0, 1], cook: 0.85, stores: all("Crevetten geschält, tiefgekühlt 400 g", 400, 12.5, 12.95, 9.95) },
  spinat_tk: { name: "Blattspinat (tiefgekühlt)", aisle: "tk", n: [23, 2.9, 0.6, 0.4], cook: 0.9, stores: { migros: ["Blattspinat tiefgekühlt 750 g", 750, 3.2], coop: ["Blattspinat tiefgekühlt 750 g", 750, 3.4], denner: ["Blattspinat tiefgekühlt 600 g", 600, 2.49] } },
  wokgemuese: { name: "Wokgemüse (tiefgekühlt)", aisle: "tk", n: [35, 2, 5, 0.3], cook: 0.9, stores: all("Wokgemüse tiefgekühlt 750 g", 750, 3.95, 4.2, 3.29) },

  // Vorrat (kommt nicht als Packung auf die Liste)
  oel: { name: "Olivenöl oder Rapsöl", pantry: true, n: [900, 0, 0, 100] },
  sojasauce: { name: "Sojasauce", pantry: true, n: [60, 8, 5, 0] },
  honig: { name: "Honig", pantry: true, n: [300, 0.4, 80, 0] },
  senf: { name: "Senf", pantry: true, n: [100, 6, 5, 5] },
  bouillon: { name: "Gemüsebouillon (Pulver)", pantry: true, n: [230, 10, 30, 8] },
  tomatenpueree: { name: "Tomatenpüree", pantry: true, n: [80, 4, 13, 0.5] },
  ketchup: { name: "Ketchup", pantry: true, n: [100, 1.5, 23, 0.2] },
  sriracha: { name: "Sriracha oder andere Chilisauce", pantry: true, n: [100, 2, 20, 1] },
  backpulver: { name: "Backpulver", pantry: true, n: [0, 0, 0, 0] },
  gyros: { name: "Gyros-Gewürz", pantry: true, n: [0, 0, 0, 0] },
  ingwer: { name: "Ingwer, gemahlen", pantry: true, n: [0, 0, 0, 0] },
  paprika: { name: "Paprika edelsüss", pantry: true, n: [0, 0, 0, 0] },
  currypulver: { name: "Currypulver", pantry: true, n: [0, 0, 0, 0] },
  kreuzkuemmel: { name: "Kreuzkümmel", pantry: true, n: [0, 0, 0, 0] },
  chili: { name: "Chiliflocken oder Cayennepfeffer", pantry: true, n: [0, 0, 0, 0] },
  oregano: { name: "Oregano", pantry: true, n: [0, 0, 0, 0] },
  kraeuter: { name: "Kräuter (getrocknet, z. B. Dill oder Schnittlauch)", pantry: true, n: [0, 0, 0, 0] },
  muskat: { name: "Muskatnuss", pantry: true, n: [0, 0, 0, 0] },
  salz_pfeffer: { name: "Salz und Pfeffer", pantry: true, n: [0, 0, 0, 0] },
};

// Mengeneinheiten in Rezepten ausser Gramm. Gramm pro Einheit, für Nährwerte und Einkauf.
export const UNITS = {
  TL: { g: 5, one: "TL", many: "TL" },
  EL: { g: 12, one: "EL", many: "EL" },
  Prise: { g: 0.3, one: "Prise", many: "Prisen" },
  Zehe: { g: 4, one: "Zehe", many: "Zehen" },
};
