"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

const paginas = fs
  .readdirSync(RAIZ)
  .filter((archivo) => archivo.endsWith(".html"))
  .sort();

function leer(archivo) {
  return fs.readFileSync(path.join(RAIZ, archivo), "utf8");
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

test("todos los scripts locales referenciados existen", () => {
  for (const pagina of paginas) {
    for (const ruta of scripts(leer(pagina))) {
      assert.ok(
        fs.existsSync(path.join(RAIZ, ruta)),
        pagina + " referencia un script inexistente: " + ruta
      );
    }
  }
});
