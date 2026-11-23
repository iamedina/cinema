"use strict";

/**
 * Comprobaciones estáticas de seguridad: el repositorio es público, así
 * que ninguna clave puede vivir en el código del cliente.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { FRONT, resolver } = require("./ayuda.cjs");

function leer(relativo) {
  return fs.readFileSync(resolver(relativo), "utf8");
}

const ARCHIVOS_JS = fs
  .readdirSync(path.join(FRONT, "js"))
  .filter((nombre) => nombre.endsWith(".js"))
  .map((nombre) => "js/" + nombre);

test("ningún script del cliente contiene claves ni llama a OMDb directamente", () => {
  const patrones = [
    /omdbapi\.com/i,
    /API_KEY_OMDB/,
    /\beyJ[A-Za-z0-9_-]{10,}/,
    /\bAIza[0-9A-Za-z_-]{20,}/,
    /\b[0-9a-f]{32}\b/i,
  ];

  for (const archivo of ARCHIVOS_JS) {
    const codigo = leer(archivo);
    for (const patron of patrones) {
      assert.doesNotMatch(codigo, patron, archivo + " contiene " + patron);
    }
  }
});

test("la clave OMDb retirada no aparece en el cliente ni en la plantilla", () => {
  const archivos = ARCHIVOS_JS.concat(["backend/config.example.js"]);

  for (const archivo of archivos) {
    assert.doesNotMatch(
      leer(archivo),
      /CLAVE_ELIMINADA/,
      archivo + " conserva la clave OMDb retirada"
    );
  }
});

test("config.local.js está ignorado y la plantilla no lleva claves reales", () => {
  assert.match(leer(".gitignore"), /^backend\/config\.local\.js$/m);

  const plantilla = leer("backend/config.example.js");
  assert.doesNotMatch(plantilla, /CLAVE_ELIMINADA/);
  assert.doesNotMatch(plantilla, /\b[0-9a-f]{32}\b/i);
  assert.doesNotMatch(plantilla, /\beyJ[A-Za-z0-9_-]{10,}/);
});
