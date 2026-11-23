"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { RAIZ, FRONT, BACK, cargar, leerCssCompleto } = require("./ayuda.cjs");
const { MIME, crearEstatico } = require("../backend/estatico.js");
const { POLITICA_CONTENIDO } = require("../backend/http.js");

const paginas = fs.readdirSync(FRONT).filter((nombre) => nombre.endsWith(".html")).sort();
const leer = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), "utf8");

test("PWA: manifest, iconos 192/512 y MIME correcto", () => {
  const manifest = JSON.parse(leer("frontend/manifest.webmanifest"));
  assert.equal(manifest.name, "CINEMA · Películas, series y anime");
  assert.equal(manifest.lang, "es");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(
    manifest.icons.map((icono) => icono.sizes),
    ["192x192", "512x512"]
  );
  assert.equal(MIME[".webmanifest"], "application/manifest+json");

  for (const icono of manifest.icons) {
    const archivo = path.join(FRONT, icono.src.replace(/^\//, ""));
    const buf = fs.readFileSync(archivo);
    assert.equal(buf.subarray(1, 4).toString(), "PNG", icono.src);
    const ancho = buf.readUInt32BE(16);
    const alto = buf.readUInt32BE(20);
    assert.equal(ancho, Number(icono.sizes.split("x")[0]));
    assert.equal(alto, ancho);
  }
});

test("PWA: las 12 páginas enlazan el manifest y registran el service worker", () => {
  assert.equal(paginas.length, 12);
  for (const pagina of paginas) {
    const html = leer("frontend/" + pagina);
    assert.ok(html.includes('<link rel="manifest" href="manifest.webmanifest">'), pagina);
    assert.ok(html.includes('<script src="js/pwa.js" defer></script>'), pagina);
    assert.ok(html.indexOf("js/preferencias.js") < html.indexOf("js/pwa.js"), pagina);
  }

  const pwa = leer("frontend/js/pwa.js");
  assert.match(pwa, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.doesNotMatch(pwa, /onclick|onload=/);
});

test("service worker: red primero en HTML, caché en estáticos y jamás /api/", () => {
  const sw = leer("frontend/sw.js");
  assert.match(sw, /const CACHE = "cinema-v2"/);
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /solicitud\.mode === "navigate"/);
  assert.match(sw, /fetch\(solicitud\)[\s\S]*?\.catch\(/);
  assert.match(sw, /caches\.match\("\/index\.html"\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  assert.doesNotMatch(sw, /fetch\(url\)/);
});

test("Poppins se sirve localmente y la CSP ya no depende de Google", () => {
  const css = leerCssCompleto();
  const entrada = leer("frontend/css/style.css");

  assert.match(entrada, /@import url\("00-fuentes\.css"\)/);
  assert.match(css, /@font-face[\s\S]*?font-family: 'Poppins'/);
  assert.match(css, /src: url\(\.\.\/vendor\/fonts\/poppins-400-latin\.woff2\)/);
  assert.doesNotMatch(entrada + css, /fonts\.googleapis\.com/);
  assert.doesNotMatch(POLITICA_CONTENIDO, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(POLITICA_CONTENIDO, /font-src 'self' data:/);

  const fuentes = fs.readdirSync(path.join(FRONT, "vendor", "fonts"));
  assert.equal(fuentes.filter((nombre) => nombre.endsWith(".woff2")).length, 8);
  assert.ok(fuentes.includes("OFL.txt"));
  for (const nombre of fuentes.filter((f) => f.endsWith(".woff2"))) {
    assert.ok(fs.statSync(path.join(FRONT, "vendor", "fonts", nombre)).size > 5000, nombre);
  }
});

test("srcset: la misma imagen de TMDB en 185/342/500 y respeto por los marcadores", () => {
  const documento = {
    createElement() {
      return {
        innerHTML: "",
        classList: { add() {} },
        setAttribute() {},
        querySelector() { return null; },
        appendChild() {},
        prepend() {},
      };
    },
    createDocumentFragment() {
      return { appendChild() {} };
    },
  };
  const { CINEMA } = cargar(["js/ui.js"], { document: documento });
  const srcset = CINEMA.ui.srcsetPoster("https://image.tmdb.org/t/p/w500/abc123.jpg");

  assert.match(srcset, /^https:\/\/image\.tmdb\.org\/t\/p\/w185\/abc123\.jpg 185w, /);
  assert.match(srcset, /w342\/abc123\.jpg 342w/);
  assert.match(srcset, /w500\/abc123\.jpg 500w$/);
  assert.equal(CINEMA.ui.srcsetPoster(CINEMA.ui.POSTER_PLACEHOLDER), "");
  assert.equal(CINEMA.ui.srcsetPoster("https://otro.example/poster.jpg"), "");

  const tarjeta = CINEMA.ui.crearTarjeta({
    id: "tmdb-movie-603",
    titulo: "Matrix",
    anio: 1999,
    tipo: "movie",
    poster: "https://image.tmdb.org/t/p/w500/abc123.jpg",
  });
  assert.match(tarjeta.innerHTML, /srcset="[^"]+w185[^"]+w342[^"]+w500[^"]+"/);
  assert.match(tarjeta.innerHTML, /sizes="\(max-width: 576px\) 45vw/);

  const detalle = leer("frontend/js/detalle.js");
  assert.match(detalle, /srcsetPoster\(datos\.poster\)/);
  assert.match(detalle, /imagen\.removeAttribute\("srcset"\)/);
});

test("build:css genera una hoja minificada más pequeña con las mismas reglas", () => {
  const min = leer("frontend/css/style.min.css");
  const fuente = leerCssCompleto();

  assert.match(min, /No editar a mano/);
  assert.ok(Buffer.byteLength(min) < Buffer.byteLength(fuente) * 0.9, "la versión minificada no reduce nada");
  assert.ok(Buffer.byteLength(min) < 75 * 1024, "la hoja minificada supera 75 KB");
  assert.match(min, /--color-enlace:var\(--primario-suave\)/);
  assert.match(min, /poppins-400-latin\.woff2/);
  assert.doesNotMatch(min, /@import url/);
  assert.doesNotMatch(min, /\/\*(?! CINEMA · CSS generado)[\s\S]*?\*\//);
});

test("CINEMA_CSS=min cambia el enlace del HTML sin tocar las fuentes", () => {
  const anterior = process.env.CINEMA_CSS;
  const { CABECERAS_SEGURIDAD } = require("../backend/http.js");
  const crear = () => crearEstatico({ raiz: FRONT, cabecerasSeguridad: CABECERAS_SEGURIDAD });

  function servir(estatico, archivo) {
    let estado = null;
    let cuerpo = "";
    estatico.servirArchivo(
      { writeHead: (codigo) => { estado = codigo; }, end: (datos) => { cuerpo = String(datos); } },
      archivo,
      () => {}
    );
    return { estado, cuerpo };
  }

  try {
    delete process.env.CINEMA_CSS;
    assert.match(servir(crear(), "/").cuerpo, /css\/style\.css/);

    process.env.CINEMA_CSS = "min";
    assert.match(servir(crear(), "/").cuerpo, /css\/style\.min\.css/);
    assert.doesNotMatch(servir(crear(), "/").cuerpo, /href="css\/style\.css"/);
  } finally {
    if (anterior === undefined) delete process.env.CINEMA_CSS;
    else process.env.CINEMA_CSS = anterior;
  }

  assert.ok(!leer("frontend/index.html").includes("style.min.css"));
});
