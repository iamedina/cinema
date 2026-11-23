"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { leerCssCompleto } = require("./ayuda.cjs");
const css = leerCssCompleto();

function bloque(selector) {
  const inicio = css.indexOf(selector + " {");
  assert.notEqual(inicio, -1, "falta la regla " + selector);
  const fin = css.indexOf("\n}", inicio);
  return css.slice(inicio, fin + 2);
}

test("todas las tarjetas y pósters tienen transición suave en ida y vuelta", () => {
  const tarjeta = bloque(".pelicula-card");
  assert.match(tarjeta, /transition:\s*0\.4s\s*;/);

  const imagen = bloque(".img-pelicula");
  assert.match(imagen, /transition:\s*opacity\s*0\.6s\s*ease,\s*transform\s*0\.6s\s*ease/);

  const banner = bloque(".pelicula-card .card-banner");
  assert.match(banner, /transition:\s*box-shadow\s*0\.6s\s*ease/);
  assert.equal((banner.match(/transition:/g) || []).length, 1, "no debe haber transition duplicada");
});

test("el zoom del póster se anima: transform está incluido en la transición", () => {
  const imagen = bloque(".img-pelicula");
  const transicion = imagen.match(/transition:([^;]+);/)[1];
  assert.ok(transicion.includes("transform"), "sin transform el scale(1.03) salta de golpe");
  assert.ok(transicion.includes("opacity"));

  const hover = bloque(".pelicula-card:hover .img-pelicula");
  assert.match(hover, /opacity:\s*0\.60/);
  assert.match(hover, /transform:\s*scale\(1\.03\)/);
  assert.match(bloque(".pelicula-card:hover"), /transform:\s*scale\(1\.02\)/);
});

test("no queda código muerto que interfiera en el hover", () => {
  assert.doesNotMatch(css, /\.pelicula-card:hover \.titulo-container/);
  assert.doesNotMatch(css, /translateZ\(0%\)/);
  assert.match(css, /@keyframes tarjeta-aparecer/);
});

test("el fondo del hero de los listados también entra suavemente", () => {
  assert.match(bloque("#heroPosterFondo"), /transition:\s*opacity\s*0\.6s\s*ease/);
});
