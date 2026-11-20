"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const leer = (archivo) => fs.readFileSync(path.join(RAIZ, archivo), "utf8");

global.window = {};
require(path.join(RAIZ, "js/hero.js"));
const { DESTACADOS, INTERVALO } = global.window.CINEMA.heroCine;

const html = leer("index.html");
const css = leer("css/style.css");
const home = leer("js/home.js");
const hero = leer("js/hero.js");

test("el destacado reúne diez títulos muy valorados desde 2000", () => {
  assert.equal(DESTACADOS.length, 10);

  const anioActual = new Date().getFullYear();
  for (const item of DESTACADOS) {
    assert.match(item.id, /^tmdb-movie-\d+$/);
    assert.ok(Number(item.anio) >= 2000 && Number(item.anio) <= anioActual, item.titulo);
    assert.ok(item.rating >= 8, item.titulo + " debería estar muy valorada");
    assert.ok(item.titulo && item.sinopsis && item.generos);
    assert.match(item.backdrop, /^\/.+\.jpg$/);
  }

  const generos = new Set(
    DESTACADOS.flatMap((item) => item.generos.split(",").map((g) => g.trim()))
  );
  assert.ok(generos.size >= 8, "los géneros deben estar variados: " + generos.size);
});

test("el carrusel avanza cada tres segundos y no pide datos a la API", () => {
  assert.equal(INTERVALO, 3000);
  assert.match(hero, /setInterval\([\s\S]*?INTERVALO/);
  assert.doesNotMatch(hero, /\bfetch\s*\(|XMLHttpRequest|\bapi\./);
  assert.match(hero, /image\.tmdb\.org\/t\/p\/w1280/);
});

test("la portada ofrece controles, pausa, puntos y anuncio accesible", () => {
  for (const id of [
    "heroFondoSegundo",
    "heroIndicadores",
    "heroAnterior",
    "heroPausa",
    "heroSiguiente",
    "heroAnuncio",
    "heroProgresoBarra",
  ]) {
    assert.ok(html.includes('id="' + id + '"'), "falta #" + id + " en index.html");
  }

  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-label="Pausar carrusel"/);

  const scripts = [...html.matchAll(/<script\s+src="(js\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(scripts.indexOf("js/hero.js") > -1);
  assert.ok(scripts.indexOf("js/hero.js") < scripts.indexOf("js/home.js"));
  assert.match(home, /CINEMA\.heroCine\.init\(\)/);
  assert.doesNotMatch(home, /tmdb-movie-603/);
});

test("el paso se detiene en hover, foco, pestaña oculta y movimiento reducido", () => {
  for (const fragmento of [
    'addEventListener("mouseenter"',
    'addEventListener("mouseleave"',
    'addEventListener("focusin"',
    'addEventListener("visibilitychange"',
    "matchMedia(\"(prefers-reduced-motion: reduce)\")",
    'evento.key === "ArrowLeft"',
    'evento.key === "ArrowRight"',
  ]) {
    assert.ok(hero.includes(fragmento), "falta en hero.js: " + fragmento);
  }
});

test("el fondo se funde y la barra respeta la pausa", () => {
  assert.match(css, /\.hero-fondo\.activo/);
  assert.match(css, /transition:\s*opacity\s*0\.8s\s*ease/);
  assert.match(css, /animation:\s*hero-barra\s*3s\s*linear\s*forwards/);
  assert.match(css, /\.hero-cine\.hero-pausado\s+\.hero-progreso span/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /\.hero-punto\.activo/);
});
