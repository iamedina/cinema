"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { cargar } = require("./ayuda.cjs");

test("escapeHtml neutraliza cualquier HTML de la API", () => {
  const { CINEMA } = cargar(["js/ui.js"]);

  assert.equal(
    CINEMA.ui.escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
  );
  assert.equal(CINEMA.ui.escapeHtml("Tom & Jerry"), "Tom &amp; Jerry");
  assert.equal(CINEMA.ui.escapeHtml("'comillas'"), "&#39;comillas&#39;");
  assert.equal(CINEMA.ui.escapeHtml(null), "");
  assert.equal(CINEMA.ui.escapeHtml(undefined), "");
});

test("etiquetaTipo traduce los tipos de la API", () => {
  const { CINEMA } = cargar(["js/ui.js"]);

  assert.equal(CINEMA.ui.etiquetaTipo("movie"), "Película");
  assert.equal(CINEMA.ui.etiquetaTipo("series"), "Serie");
  assert.equal(CINEMA.ui.etiquetaTipo("episode"), "Episodio");
  assert.equal(CINEMA.ui.etiquetaTipo("otro"), "Título");
});

test("el póster de respaldo es un SVG en data URI", () => {
  const { CINEMA } = cargar(["js/ui.js"]);

  assert.match(CINEMA.ui.POSTER_PLACEHOLDER, /^data:image\/svg\+xml;charset=utf-8,/);
});
