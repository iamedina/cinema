"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { RAIZ, FRONT, leerCssCompleto } = require("./ayuda.cjs");
const { CABECERAS_SEGURIDAD, POLITICA_CONTENIDO } = require("../backend/http.js");
const { fetchConReintento } = require("../backend/servicios/red.js");

const paginas = fs.readdirSync(FRONT).filter((nombre) => nombre.endsWith(".html")).sort();
const BASE = "http://127.0.0.1:8080";

test("metadatos: las 12 páginas tienen canonical y og:image absoluta", () => {
  assert.equal(paginas.length, 12);

  for (const pagina of paginas) {
    const html = fs.readFileSync(path.join(FRONT, pagina), "utf8");
    const esperada = BASE + (pagina === "index.html" ? "/" : "/" + pagina);

    assert.match(html, /<link rel="canonical" href="http:\/\/[^"]+">/, pagina);
    assert.ok(html.includes('<link rel="canonical" href="' + esperada + '">'), pagina + " canonical");
    assert.ok(html.includes('<meta property="og:url" content="' + esperada + '">'), pagina + " og:url");
    assert.ok(
      html.includes('<meta property="og:image" content="' + BASE + '/img/image-cinema.png">'),
      pagina + " og:image"
    );
  }
});

test("robots.txt y sitemap.xml están en la raíz web y se sirven como texto", () => {
  const robots = fs.readFileSync(path.join(FRONT, "robots.txt"), "utf8");
  const sitemap = fs.readFileSync(path.join(FRONT, "sitemap.xml"), "utf8");

  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, new RegExp("Sitemap:\\s*" + BASE.replace(/[.:/]/g, "\\$&") + "/sitemap\\.xml"));
  assert.match(sitemap, /<urlset[^>]+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);

  for (const pagina of paginas) {
    const ruta = pagina === "index.html" ? "/" : "/" + pagina;
    assert.ok(sitemap.includes("<loc>" + BASE + ruta + "</loc>"), pagina + " falta en el sitemap");
  }
});

test("el repositorio incluye la licencia MIT declarada en package.json", () => {
  const licencia = fs.readFileSync(path.join(RAIZ, "LICENSE"), "utf8");
  assert.match(licencia, /MIT License/);
  assert.match(licencia, /Copyright \(c\) 2026/);
});

test("las respuestas llevan una política de contenido sin scripts en línea", () => {
  assert.equal(CABECERAS_SEGURIDAD["Content-Security-Policy"], POLITICA_CONTENIDO);
  assert.match(POLITICA_CONTENIDO, /default-src 'self'/);
  assert.match(POLITICA_CONTENIDO, /script-src 'self'/);
  assert.doesNotMatch(POLITICA_CONTENIDO, /script-src[^;]*unsafe-inline/);
  assert.match(POLITICA_CONTENIDO, /object-src 'none'/);
  assert.match(POLITICA_CONTENIDO, /frame-src[^;]*youtube/);
});

test("fetchConReintento reintenta un 5xx y conserva la primera respuesta fallida", async () => {
  const fetchOriginal = global.fetch;
  const estados = [500, 200];
  const visitas = [];

  global.fetch = async (url) => {
    visitas.push(String(url));
    return { status: estados.shift(), ok: estados[0] !== undefined };
  };

  try {
    const respuesta = await fetchConReintento("http://ejemplo/api");
    assert.equal(respuesta.status, 200);
    assert.equal(visitas.length, 2);
  } finally {
    global.fetch = fetchOriginal;
  }
});

test("fetchConReintento no repite una respuesta correcta", async () => {
  const fetchOriginal = global.fetch;
  let visitas = 0;

  global.fetch = async () => {
    visitas += 1;
    return { status: 200, ok: true };
  };

  try {
    const respuesta = await fetchConReintento("http://ejemplo/api");
    assert.equal(respuesta.status, 200);
    assert.equal(visitas, 1);
  } finally {
    global.fetch = fetchOriginal;
  }
});

test("CSS: token de enlace accesible y breakpoints unificados", () => {
  const css = leerCssCompleto();

  assert.match(css, /--color-enlace:\s*var\(--primario-suave\)/);
  assert.match(css, /\.section-subtitle\s*\{[^}]*color:\s*var\(--color-enlace\)/);
  assert.match(css, /\.pelicula-card \.card-anio\s*\{[^}]*color:\s*var\(--color-enlace\)/);
  assert.doesNotMatch(css, /max-width:\s*767px/);
  assert.doesNotMatch(css, /max-width:\s*559px/);
  assert.doesNotMatch(css, /max-width:\s*575\.98px/);
});
