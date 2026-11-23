"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { FRONT, leerCssCompleto, cargar } = require("./ayuda.cjs");
const leer = (relativo) => fs.readFileSync(path.join(FRONT, relativo), "utf8");

test("CSS: el acento vive en tokens semánticos y el azul sigue siendo el default", () => {
  const css = leerCssCompleto();

  for (const fragmento of [
    "--acento: #0d6efd",
    "--acento-rgb: 13 110 253",
    "--acento-suave: #6ea8fe",
    "--acento-profundo: #073b8c",
    "--primario: var(--acento)",
    "--primario-suave: var(--acento-suave)",
  ]) {
    assert.ok(css.includes(fragmento), "falta en CSS: " + fragmento);
  }

  assert.match(
    css,
    /:root\.acento-ambar\s*\{[^}]*--acento:\s*#b45309[^}]*--acento-rgb:\s*180 83 9[^}]*--acento-suave:\s*#fbbf24[^}]*\}/
  );

  /* Fuera de la definición de tokens no debe quedar azul escrito a mano. */
  const sinTokens = css.replace(/--acento(?:-rgb|-suave|-profundo)?:[^;]+;/g, "");
  assert.doesNotMatch(sinTokens, /13 110 253|13,\s*110,\s*253|#073b8c/);

  for (const fragmento of [
    "box-shadow: 0 0 24px rgb(var(--acento-rgb) / 0.25)",
    "linear-gradient(135deg, var(--acento), var(--acento-profundo))",
    "rgb(var(--acento-rgb) / 0.92)",
  ]) {
    assert.ok(css.includes(fragmento), "la capa semántica no se usa: " + fragmento);
  }
});

test("preferencias: el acento se normaliza, se aplica y se revierte", () => {
  const clases = new Set();
  const documento = {
    documentElement: {
      classList: {
        toggle(nombre, activo) {
          if (activo) clases.add(nombre);
          else clases.delete(nombre);
        },
      },
    },
  };

  const { CINEMA } = cargar(["js/preferencias.js"], { document: documento });
  const prefs = CINEMA.preferencias;

  assert.equal(prefs.leer().acento, "azul");
  assert.equal(clases.has("acento-ambar"), false);

  assert.equal(prefs.normalizar({ acento: "verde" }).acento, "azul");
  assert.equal(prefs.normalizar({ acento: "ambar" }).acento, "ambar");
  assert.equal(prefs.ACENTOS.length, 2);

  prefs.guardar({ acento: "ambar" });
  assert.ok(clases.has("acento-ambar"));
  assert.equal(prefs.leer().acento, "ambar");

  prefs.guardar({ acento: "azul" });
  assert.equal(clases.has("acento-ambar"), false);

  prefs.guardar({ acento: "ambar" });
  prefs.restablecer();
  assert.equal(prefs.leer().acento, "azul");
  assert.equal(clases.has("acento-ambar"), false);
});

test("ajustes: el selector de acento está en Apariencia y guarda el cambio", () => {
  const html = leer("ajustes.html");
  const ajustes = leer("js/ajustes.js");

  assert.ok(html.includes("Color de acento"));
  assert.ok(html.includes('name="acento"'));
  assert.ok(html.includes('id="acentoAzul" value="azul"'));
  assert.ok(html.includes('id="acentoAmbar" value="ambar"'));
  assert.ok(html.indexOf("tituloApariencia") < html.indexOf('name="acento"'));

  assert.match(ajustes, /querySelectorAll\('input\[name="acento"\]'\)/);
  assert.match(ajustes, /radio\.checked = radio\.value === prefs\.acento/);
  assert.match(ajustes, /guardar\(\{ acento: radio\.value \}\)/);
});

test("build:css conserva los tokens de acento en la hoja minificada", () => {
  const min = leer("css/style.min.css");

  assert.match(min, /--acento:#0d6efd/);
  assert.match(min, /--acento-rgb:13 110 253/);
  assert.match(min, /:root\.acento-ambar\{/);
  assert.match(min, /--acento:#b45309/);
  assert.match(min, /rgb\(var\(--acento-rgb\)/);
});
