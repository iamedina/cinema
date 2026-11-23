"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { FRONT, leerCssCompleto, cargar } = require("./ayuda.cjs");
const leer = (relativo) => fs.readFileSync(path.join(FRONT, relativo), "utf8");

test("ficha: botón Copiar enlace con delegación y respaldo sin CSP inline", () => {
  const detalle = leer("js/detalle.js");

  for (const fragmento of [
    "function botonCopiar()",
    "data-copiar-enlace",
    "data-copiar-texto",
    "function activarCopiar()",
    "botonCopiar() +",
    "activarCopiar();",
    "navigator.clipboard.writeText(url)",
    'document.execCommand("copy")',
    "¡Enlace copiado!",
  ]) {
    assert.ok(detalle.includes(fragmento), "falta en detalle.js: " + fragmento);
  }

  assert.ok(detalle.indexOf("contenedor.innerHTML = plantilla(datos)") < detalle.indexOf("activarCopiar();"));
  assert.doesNotMatch(detalle, /onclick=|onerror=/);

  const css = leerCssCompleto();
  assert.match(css, /\.detalle-copiar-btn\s*\{[^}]*--bs-btn-color/);
});

test("Sorpréndeme: botón en el hero que elige un destacado distinto del actual", () => {
  const html = leer("index.html");
  const hero = leer("js/hero.js");

  assert.ok(html.includes('id="heroSorprendeme"'));
  assert.ok(html.includes("Sorpréndeme"));
  assert.match(hero, /getElementById\("heroSorprendeme"\)/);
  assert.match(hero, /sorprender\.addEventListener\("click"/);
  assert.match(hero, /Math\.floor\(Math\.random\(\) \* DESTACADOS\.length\)/);
  assert.match(hero, /if \(elegido === indice\) elegido = \(elegido \+ 1\) % DESTACADOS\.length/);
  assert.match(hero, /location\.href = "descripcion\.html\?id=" \+ encodeURIComponent\(DESTACADOS\[elegido\]\.id\)/);
});

test("búsqueda: la barra de filtros se carga y conserva query y page en la URL", () => {
  const html = leer("busqueda.html");
  const codigo = leer("js/busqueda.js");
  const filtros = leer("js/filtros.js");

  assert.ok(html.includes('id="filtros"'), "falta el contenedor de filtros");
  assert.ok(html.indexOf("js/generos.js") < html.indexOf("js/filtros.js"));
  assert.ok(html.indexOf("js/filtros.js") < html.indexOf("js/busqueda.js"));

  assert.match(codigo, /moduloFiltros\.init\(\{/);
  assert.match(codigo, /tipo: "todos"/);
  assert.match(codigo, /alCambiar: \(nuevos\)/);
  assert.match(codigo, /const params = new URLSearchParams\(location\.search\)/);
  assert.match(codigo, /params\.set\("query", estado\.query\)/);
  assert.match(codigo, /cacheConFiltros = null/);

  assert.match(filtros, /if \(tipo === "todos"\)/);
  assert.match(filtros, /new Map\(\)/);
  assert.match(filtros, /CINEMA\.generos\.para\("tv"\)/);
});

test("búsqueda: los filtros se aplican a los resultados y se paginan en bloques", () => {
  const codigo = leer("js/busqueda.js");
  const api = leer("js/api.js");

  for (const fragmento of [
    "function aplicarFiltros(items, filtros)",
    "filtros.genero",
    "filtros.anio",
    "filtros.nota",
    'filtros.orden === "nota"',
    'filtros.orden === "novedad"',
    'filtros.orden === "titulo"',
    "async function obtenerDatos(texto, page)",
    "PAGINAS_A_CONSULTAR.map",
    "POR_PAGINA = 12",
    "Ningún resultado cumple los filtros elegidos",
  ]) {
    assert.ok(codigo.includes(fragmento), "falta en busqueda.js: " + fragmento);
  }

  assert.match(api, /generoIds: Array\.isArray\(item\.genre_ids\)/);
});

test("búsqueda: los géneros de «todos» unen películas y series sin duplicados", () => {
  const { CINEMA } = cargar(["js/generos.js", "js/filtros.js"]);
  assert.equal(CINEMA.filtros.CLAVES.join(","), "genero,anio,orden,nota");

  const filtros = leer("js/filtros.js");
  const bloque = filtros.slice(
    filtros.indexOf('if (tipo === "todos")'),
    filtros.indexOf("return CINEMA.generos")
  );
  assert.match(bloque, /CINEMA\.generos\.para\("movie"\)/);
  assert.match(bloque, /CINEMA\.generos\.para\("tv"\)/);
  assert.match(bloque, /unicos\.set\(genero\.id, genero\)/);
  assert.match(bloque, /\[\.\.\.unicos\.values\(\)\]/);
});

test("portada: «Siguiendo viendo» usa progreso real y comparte la rejilla", () => {
  const html = leer("index.html");
  const home = leer("js/home.js");
  const css = leerCssCompleto();

  assert.ok(html.includes('id="seccionSeguimiento"') && html.includes("Siguiendo viendo"));
  assert.ok(html.includes('id="resultadoSeguirViendo"'));
  assert.ok(html.indexOf("js/almacen.js") < html.indexOf("js/progreso.js"));

  for (const fragmento of [
    "function cargarSeguimiento()",
    "cargarSeguimiento();",
    "progreso.enCurso()",
    "progreso.porcentaje(item)",
    "progreso.restante(item)",
    "progreso.alCambiar(pintar)",
    "visibilitychange",
    "pd-progreso-barra",
    "seguimiento-restante",
  ]) {
    assert.ok(home.includes(fragmento), "falta en home.js: " + fragmento);
  }

  assert.match(css, /#resultadoSeguirViendo[\s\S]{0,200}grid-template-columns: repeat\(6/);
  assert.match(css, /\.seguimiento-restante\s*\{[^}]*font-size/);
});
