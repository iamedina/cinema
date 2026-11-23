"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { FRONT, leerCssCompleto } = require("./ayuda.cjs");

const paginas = fs
  .readdirSync(FRONT)
  .filter((archivo) => archivo.endsWith(".html"))
  .sort();

function leer(archivo) {
  return fs.readFileSync(path.join(FRONT, archivo), "utf8");
}

/** Rutas de los scripts locales en el orden en que se cargan. */
function scripts(html) {
  return [...html.matchAll(/<script\s+src="(js\/[^"]+)"/g)].map((m) => m[1]);
}

test("todas las páginas cargan preferencias antes del resto de scripts", () => {
  assert.ok(paginas.length >= 10, "hay páginas que revisar");

  for (const pagina of paginas) {
    const html = leer(pagina);
    const lista = scripts(html);

    assert.ok(
      lista.includes("js/preferencias.js"),
      pagina + " debe cargar js/preferencias.js"
    );

    const primera = lista.find((ruta) => ruta !== "js/preferencias.js");
    if (primera) {
      assert.ok(
        lista.indexOf("js/preferencias.js") < lista.indexOf(primera),
        pagina + " debe cargar preferencias antes que " + primera
      );
    }
  }
});

test("todas las páginas enlazan Ajustes en cabecera y pie, sin el login muerto", () => {
  for (const pagina of paginas) {
    const html = leer(pagina);

    assert.match(
      html,
      /<a class="login ajustes-enlace" href="ajustes\.html"/,
      pagina + " debe tener el engranaje de Ajustes en la cabecera"
    );
    assert.match(
      html,
      /<a href="ajustes\.html" class="d-block text-light text-decoration-none">Ajustes<\/a>/,
      pagina + " debe enlazar Ajustes en el pie"
    );
    assert.doesNotMatch(html, />login</, pagina + " no debe conservar el login muerto");
  }
});

test("todas las páginas mantienen el header de una fila sin SVG en la navegación", () => {
  for (const pagina of paginas) {
    const html = leer(pagina);

    assert.match(
      html,
      /<div class="barra-superior">\s*<header class="header-cine">/,
      pagina + " debe tener la cabecera de una sola fila"
    );
    assert.match(
      html,
      /<nav class="navegacion" aria-label="Navegación principal">/,
      pagina + " debe tener la navegación principal"
    );
    assert.doesNotMatch(
      html,
      /<div class="anclas-header">[\s\S]*?<svg[\s\S]*?<\/svg>[\s\S]*?<\/div>/,
      pagina + " los enlaces de navegación no deben llevar SVG"
    );
    assert.match(
      html,
      /<div class="login-div">/,
      pagina + " debe conservar login-div para el avatar de perfiles"
    );
    assert.doesNotMatch(
      html,
      /id="buscarBtn"[^>]*style=/,
      pagina + " el botón de búsqueda no debe llevar estilos inline"
    );
  }
});

test("la cabecera mide 80 px, es transparente y ocupa todo el ancho sin bordes", () => {
  const css = leerCssCompleto();

  assert.match(css, /--header-alto:\s*80px/, "la cabecera debe medir 80 px");
  assert.match(css, /\.barra-superior\s*\{[^}]*position:\s*sticky[^}]*z-index:\s*200/, "la cabecera debe ser sticky y estar por encima de los filtros");
  const barra = css.slice(css.indexOf(".barra-superior {"), css.indexOf(".header-cine {"));
  assert.doesNotMatch(barra, /background:\s*var\(--rich-black\)/, "arriba no debe tener fondo azul");
  assert.match(barra, /background:\s*transparent/, "arriba debe verse la película de detrás");
  assert.match(barra, /border:\s*0/, "sin bordes");

  const cine = css.slice(css.indexOf(".header-cine {"), css.indexOf(".logo {"));
  assert.match(cine, /min-height:\s*80px/, "altura de 80 px");
  assert.match(cine, /width:\s*100%/, "debe abarcar todo el ancho");
  assert.doesNotMatch(cine, /max-width/, "sin ancho máximo que la recorte");
  assert.doesNotMatch(cine, /border:\s*1px/, "sin borde en la barra interior");

  const buscar = css.slice(css.indexOf(".search input {"), css.indexOf(".search input::placeholder"));
  assert.match(buscar, /background-color:\s*transparent/, "el buscador debe ser transparente sin scroll");
  assert.match(css, /body\.con-scroll \.search input\s*\{[^}]*background-color:\s*var\(--gunmetal-2\)/, "al scrollear el buscador recupera su fondo");

  assert.match(css, /body\.con-scroll \.barra-superior\s*\{[^}]*top:\s*0/, "la cabecera no debe dejar espacio arriba al desplazarse");
  assert.match(css, /body\.con-scroll \.header-cine\s*\{[^}]*background:\s*rgb\(20 24 30 \/ 0\.86\)/, "al desplazarse la cabecera debe desplegarse con fondo");
});

test("Ajustes carga los módulos que usa para contadores y datos", () => {
  const lista = scripts(leer("ajustes.html"));

  for (const modulo of [
    "js/preferencias.js",
    "js/almacen.js",
    "js/historial.js",
    "js/ui.js",
    "js/favoritos.js",
    "js/progreso.js",
    "js/buscador.js",
    "js/ajustes.js",
  ]) {
    assert.ok(lista.includes(modulo), "ajustes.html debe cargar " + modulo);
  }

  assert.ok(
    lista.indexOf("js/ajustes.js") > lista.indexOf("js/progreso.js"),
    "ajustes.js debe ejecutarse después de sus dependencias"
  );
});

test("todas las páginas cargan el almacén antes de los módulos que lo usan", () => {
  for (const pagina of paginas) {
    const lista = scripts(leer(pagina));

    assert.ok(lista.includes("js/almacen.js"), pagina + " debe cargar js/almacen.js");

    for (const modulo of [
      "js/perfiles.js",
      "js/historial.js",
      "js/favoritos.js",
      "js/progreso.js",
    ]) {
      if (!lista.includes(modulo)) continue;
      assert.ok(
        lista.indexOf("js/almacen.js") < lista.indexOf(modulo),
        pagina + " debe cargar js/almacen.js antes que " + modulo
      );
    }
  }
});

test("Mi lista solo se enlaza desde Ajustes", () => {
  for (const pagina of paginas) {
    if (pagina === "ajustes.html") continue;
    assert.doesNotMatch(
      leer(pagina),
      /href="favoritos\.html"/,
      pagina + " no debe enlazar Mi lista fuera de Ajustes"
    );
  }
});

test("todos los scripts locales referenciados existen", () => {
  for (const pagina of paginas) {
    for (const ruta of scripts(leer(pagina))) {
      assert.ok(
        fs.existsSync(path.join(FRONT, ruta)),
        pagina + " referencia un script inexistente: " + ruta
      );
    }
  }
});
