// Service Worker: legt alle App-Dateien beim ersten Besuch ab, damit die App ohne Netz startet.
// Es werden nur Dateien der eigenen Herkunft geladen, nichts wird verschickt.
// Wichtig: Die App-Dateien kommen zuerst aus dem Cache. Jede Aenderung an einer Datei unter app/
// (Code oder Daten) wird erst ausgeliefert, wenn CACHE_VERSION erhoeht wird.
// tools/refresh (Task 8) erhoeht sie bei jedem Lauf, der etwas schreibt.
const CACHE_VERSION = "2026-11-18-12";
const PRECACHE = ["./","apple-touch-icon.png","data/products.json","icon-512.png","icon.svg","img/coop-aelplerbrot-bio.jpg","img/coop-aprikosen-getrocknet.jpg","img/coop-basilikum-tofu-bio.jpg","img/coop-baumnuesse-bio.jpg","img/coop-bbq-tofu-bio.jpg","img/coop-bio-beerenmueesli.jpg","img/coop-bio-joghurt-mueesli.jpg","img/coop-blumenkohl-kichererbsenmus.jpg","img/coop-broetli-lachs.jpg","img/coop-buendner-gerstensuppe.jpg","img/coop-cashewnuesse-bio.jpg","img/coop-cervelat-kaese-salat.jpg","img/coop-chicken-tikka-masala.jpg","img/coop-country-soft-apfel-erdbeer.jpg","img/coop-country-soft-brombeer-apfel.jpg","img/coop-crevetten-zitronensauce.jpg","img/coop-crunchy-getreideriegel.jpg","img/coop-eisbergsalat.jpg","img/coop-erdnuesse.jpg","img/coop-falafel-tahina-dip.jpg","img/coop-falafel-tahina.jpg","img/coop-feigen-getrocknet.jpg","img/coop-fleischvoegel-kartoffelstock.jpg","img/coop-goldbutt-gemuese.jpg","img/coop-granola-berry-bowl.jpg","img/coop-greek-pasta-salat.jpg","img/coop-greek-salad.jpg","img/coop-griechischer-joghurt-nature.jpg","img/coop-high-protein-choco-drink.jpg","img/coop-high-protein-cottage-cheese.jpg","img/coop-high-protein-erdbeer-drink.jpg","img/coop-high-protein-jogurt-nature.jpg","img/coop-hoernli-gehacktes.jpg","img/coop-hummus-nature-bio.jpg","img/coop-hummus-pesto-verde.jpg","img/coop-hummus-piri-piri.jpg","img/coop-joghurt-natur.jpg","img/coop-kaesewaehe.jpg","img/coop-kefir-erdbeere.jpg","img/coop-knaeckebrot-kaese-kuerbiskern.jpg","img/coop-kuerbissuppe-curry.jpg","img/coop-lasagne-al-forno.jpg","img/coop-lemon-basil-pasta.jpg","img/coop-magerquark.jpg","img/coop-mango-getrocknet.jpg","img/coop-mango-stuecke.jpg","img/coop-massaman-curry.jpg","img/coop-nuesslisalat-rucola-bio.jpg","img/coop-nuesslisalat.jpg","img/coop-nussbrot.jpg","img/coop-nussmischung-bio.jpg","img/coop-nussmischung.jpg","img/coop-olive-zitrone-tofu-bio.jpg","img/coop-pancroc.jpg","img/coop-pasta-champignons.jpg","img/coop-penne-pollo.jpg","img/coop-pepper-nut-mix.jpg","img/coop-pesto-pasta-chicken.jpg","img/coop-piccata-milanese.jpg","img/coop-picnic-eier-bio.jpg","img/coop-pistazien.jpg","img/coop-proteinbrot.jpg","img/coop-puurebrot-bio.jpg","img/coop-randensalat-bio.jpg","img/coop-rosemary-chicken.jpg","img/coop-rueebli-geraffelt-bio.jpg","img/coop-saisonsalat-bio.jpg","img/coop-saisonsalat-naturaplan.jpg","img/coop-salat-pouletbrust.jpg","img/coop-salatmischung.jpg","img/coop-salatsauce-french.jpg","img/coop-salatsauce-naturelle.jpg","img/coop-sandwich-poulet-tartare.jpg","img/coop-sandwich-toast.jpg","img/coop-sandwich-vorderschinken-ei.jpg","img/coop-selleriesalat-bio.jpg","img/coop-skyr-himbeere.jpg","img/coop-spaghetti-bolognese.jpg","img/coop-spaghetti-gamberetti.jpg","img/coop-spinat-speckwaehe.jpg","img/coop-taboule-oriental-gross.jpg","img/coop-taboule-oriental.jpg","img/coop-teigwarensalat-pesto.jpg","img/coop-teriyaki-rice-bowl.jpg","img/coop-tofu-fume.jpg","img/coop-tomatensuppe-mascarpone.jpg","img/coop-vegan-spaghetti-bolognese.jpg","img/coop-vegi-smokey-tofu.jpg","img/coop-wintersalat-bio.jpg","img/coop-yellow-thai-curry.jpg","img/migros-aelplermagronen.jpg","img/migros-ananas.jpg","img/migros-asia-noodle-salad.jpg","img/migros-balsamico-dressing.jpg","img/migros-bami-goreng-vegi.jpg","img/migros-basler-ruchbrot.jpg","img/migros-baumnuesse.jpg","img/migros-birchermueesli.jpg","img/migros-buendner-gerstensuppe.jpg","img/migros-bulgursalat-hummus.jpg","img/migros-cannelloni-bolognese.jpg","img/migros-cashewkerne.jpg","img/migros-chicken-piccata-penne.jpg","img/migros-chicken-teriyaki-reis.jpg","img/migros-chili-con-carne.jpg","img/migros-chili-sin-carne.jpg","img/migros-cottage-cheese-klein.jpg","img/migros-cottage-cheese-kraeuter.jpg","img/migros-cottage-cheese-nature.jpg","img/migros-cottage-cheese-piment.jpg","img/migros-datteln.jpg","img/migros-edamame-salat.jpg","img/migros-edamame.jpg","img/migros-erdnuesse-pikant.jpg","img/migros-falafel-couscous.jpg","img/migros-farmer-soft-heidelbeere.jpg","img/migros-farmer-soft-joghurt.jpg","img/migros-farmer-soft-peanuts.jpg","img/migros-gaertnersalat.jpg","img/migros-gehacktes-hoernli.jpg","img/migros-gemuesesuppe-bio.jpg","img/migros-greek-style-heidelbeere.jpg","img/migros-gurkensalat.jpg","img/migros-haselnuesse.jpg","img/migros-high-protein-quark-limette.jpg","img/migros-honey-nuts.jpg","img/migros-huettensuppe.jpg","img/migros-hummus-basilikum.jpg","img/migros-hummus-nature.jpg","img/migros-hummus-randen.jpg","img/migros-kefir-drink.jpg","img/migros-kefir-joghurt.jpg","img/migros-knaeckebrot-sesam-vollkorn.jpg","img/migros-kuerbis-kokos-suppe.jpg","img/migros-kuerbissuppe-bio.jpg","img/migros-lasagne-plant-based.jpg","img/migros-laugenbrezel-frischkaese.jpg","img/migros-magerquark.jpg","img/migros-mandeln.jpg","img/migros-mango-getrocknet.jpg","img/migros-mischsalat.jpg","img/migros-pastasalat-poulet.jpg","img/migros-picknick-eier.jpg","img/migros-plant-based-strips-suesskartoffel.jpg","img/migros-quinoasalat-tahini.jpg","img/migros-riz-casimir.jpg","img/migros-roggen-knaeckebrot.jpg","img/migros-rueeblisuppe-bio.jpg","img/migros-salade-melee.jpg","img/migros-salatbowl-poulet.jpg","img/migros-sandwich-chicken-ketchup.jpg","img/migros-sandwich-fleischkaese.jpg","img/migros-sandwich-frischkaese.jpg","img/migros-sandwich-lachs-gross.jpg","img/migros-sandwich-lachs-tatar.jpg","img/migros-sandwich-lachs.jpg","img/migros-sandwich-plant-based-bacon.jpg","img/migros-sandwich-poulet-curry.jpg","img/migros-sandwich-schinken.jpg","img/migros-sandwich-tomate-mozzarella.jpg","img/migros-sandwich-vegi-ei.jpg","img/migros-schweinsgeschnetzeltes-tagliatelle.jpg","img/migros-singapur-nudeln-huhn.jpg","img/migros-skyr-nature.jpg","img/migros-sonnenblumenbroetli-kaese.jpg","img/migros-spaghetti-bolognese.jpg","img/migros-spaghetti-carbonara.jpg","img/migros-spaghetti-soja-bolognese.jpg","img/migros-spezialbrot-ei-tartar.jpg","img/migros-steinpilzsuppe.jpg","img/migros-stroganoff-rind.jpg","img/migros-toast-dunkel.jpg","img/migros-tomaten-mascarpone-suppe.jpg","img/migros-tomatensuppe.jpg","img/migros-urdinkel-farmerbrot.jpg","img/migros-vollkorn-landbrot.jpg","img/migros-zoepfli-vorderschinken.jpg","index.html","manifest.webmanifest","src/engine.js","src/feedback.js","src/main.js","src/model.js","src/storage.js","src/targets.js","src/ui.js","styles.css"];
const CACHE_NAME = `pausen-einkauf-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        const req = (u) => new Request(u, { cache: "reload" });
        // Kerndateien müssen da sein; Produktfotos nur nach Möglichkeit (ein fehlendes Foto bricht nichts ab).
        await cache.addAll(PRECACHE.filter((u) => !u.startsWith("img/")).map(req));
        await Promise.allSettled(PRECACHE.filter((u) => u.startsWith("img/")).map((u) => cache.add(req(u))));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("pausen-einkauf-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request)
    .then(async (res) => {
      if (res.ok) await cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);
  event.waitUntil(refresh);
  if (cached) return cached;
  return (await refresh) || Response.error();
}

async function cacheFirst(event) {
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) event.waitUntil(cache.put(request, res.clone()).catch(() => {}));
    return res;
  } catch {
    if (request.mode === "navigate") {
      const start = await cache.match("./");
      if (start) return start;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/data/products.json")) {
    event.respondWith(staleWhileRevalidate(event));
  } else {
    event.respondWith(cacheFirst(event));
  }
});
