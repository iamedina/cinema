"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const detalle = fs.readFileSync(path.join(RAIZ, "js/detalle.js"), "utf8");
const css = fs.readFileSync(path.join(RAIZ, "css/style.css"), "utf8");

test("la ficha usa una cabecera con backdrop y chips junto al título", () => {
  for (const fragmento of [
    'class="detalle-hero"',
    'class="detalle-hero-fondo"',
    "fondoHero(datos)",
    "chipsHero(datos)",
    "datos.galeria && datos.galeria[0]",
    '<ul class="detalle-hero-chips">',
  ]) {
    assert.ok(detalle.includes(fragmento), "falta en detalle.js: " + fragmento);
  }

  assert.ok(css.includes(".detalle-hero-fondo"));
  assert.ok(css.includes(".detalle-hero-chip-nota"));
});

test("el botón de play del póster es decorativo y no interactivo", () => {
  assert.match(detalle, /class="play-decorativo" aria-hidden="true"/);
  assert.equal(detalle.includes("<button class=\"play-decorativo\""), false);
  assert.ok(css.includes(".poster-detalle-marco:hover .play-decorativo"));
  assert.ok(css.includes(".play-decorativo::after"));
});

test("los datos van en una lista y las acciones quedan bajo la sinopsis", () => {
  assert.ok(detalle.includes('<ul class="detalle-datos list-unstyled">'));
  assert.equal(detalle.includes("columnaIzquierda"), false);
  assert.ok(detalle.includes('class="detalle-dato-etiqueta"'));

  const sinopsis = detalle.indexOf('<div class="text-start fw-medium detalle-plot">');
  const acciones = detalle.indexOf('<div class="detalle-accion">');

  assert.ok(sinopsis > 0, "falta el bloque de sinopsis");
  assert.ok(acciones > sinopsis, "las acciones deben ir después de la sinopsis");
});

test("el póster mantiene 2:3 y las acciones conservan 16 px de separación", () => {
  const poster = css.slice(css.indexOf(".poster-detalle {"), css.indexOf(".poster-detalle-marco::after"));
  assert.match(poster, /aspect-ratio:\s*2\s*\/\s*3/);

  const acciones = css.slice(css.indexOf(".detalle-accion {"), css.indexOf(".detalle-tipo-texto"));
  assert.match(acciones, /gap:\s*16px/);
});

test("el hover de la galería es suave, sin azul ni cambio de tamaño", () => {
  const galeria = css.slice(css.indexOf(".galeria {"), css.indexOf(".lightbox {"));

  assert.equal(detalle.includes("galeria-zoom"), false);
  assert.equal(galeria.includes("galeria-zoom"), false);
  assert.equal(galeria.includes("scale("), false);
  assert.equal(galeria.includes("translateY("), false);
  assert.equal(galeria.includes("border-color: var(--primario)"), false);
  assert.match(galeria, /transition:\s*box-shadow\s*0\.45s\s*ease/);
  assert.match(galeria, /transition:\s*filter\s*0\.45s\s*ease/);
});

test("el lightbox navega con flechas en pantalla y con el teclado", () => {
  for (const fragmento of [
    'id="lightboxAnterior"',
    'id="lightboxSiguiente"',
    'id="lightboxContador"',
    "bi-chevron-left",
    "bi-chevron-right",
    'evento.key === "ArrowLeft"',
    'evento.key === "ArrowRight"',
    "mover(-1)",
    "mover(1)",
  ]) {
    assert.ok(detalle.includes(fragmento), "falta en detalle.js: " + fragmento);
  }

  assert.ok(css.includes(".lightbox-nav"));
  assert.ok(css.includes(".lightbox-contador"));
});
