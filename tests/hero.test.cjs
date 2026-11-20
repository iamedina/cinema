"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const leer = (archivo) => fs.readFileSync(path.join(RAIZ, archivo), "utf8");

global.window = {};
require(path.join(RAIZ, "js/hero.js"));
const { DESTACADOS, INTERVALO, TRANSICION } = global.window.CINEMA.heroCine;

const html = leer("index.html");
const css = leer("css/style.css");
const home = leer("js/home.js");
const hero = leer("js/hero.js");

test("el destacado reúne diez estrenos recientes, bien valorados y de categorías distintas", () => {
  assert.equal(DESTACADOS.length, 10);

  const categorias = new Set();
  for (const item of DESTACADOS) {
    assert.match(item.id, /^tmdb-movie-\d+$/);
    assert.ok(Number(item.anio) >= 2019, item.titulo + " debería ser reciente");
    assert.ok(item.rating >= 7, item.titulo + " debería estar bien valorada");
    assert.ok(item.titulo && item.sinopsis);
    assert.match(item.backdrop, /^\/.+\.jpg$/);
    categorias.add(item.generos.split(",")[0].trim());
  }

  assert.equal(categorias.size, 10, "una película por categoría: " + [...categorias].join(", "));
});

test("el carrusel avanza cada tres segundos con fundido y sin pedir datos", () => {
  assert.equal(INTERVALO, 3000);
  assert.equal(TRANSICION, 450);
  assert.match(hero, /setInterval\([\s\S]*?INTERVALO/);
  assert.match(hero, /classList\.remove\("hero-cambiando"\)/);
  assert.match(hero, /aplicar\(destino, anunciar\)/);
  assert.match(hero, /classList\.add\("hero-cambiando"\)/);
  assert.doesNotMatch(hero, /setTimeout/);
  assert.doesNotMatch(hero, /\bfetch\s*\(|XMLHttpRequest|\bapi\./);
  assert.match(hero, /image\.tmdb\.org\/t\/p\/w1280/);
});

test("la portada conserva los puntos y elimina solo los tres botones de control", () => {
  for (const id of ["heroIndicadores", "heroContenidoDinamico", "heroAnuncio", "heroProgresoBarra"]) {
    assert.ok(html.includes('id="' + id + '"'), "falta #" + id + " en index.html");
  }

  for (const id of ["heroAnterior", "heroPausa", "heroSiguiente"]) {
    assert.doesNotMatch(html, new RegExp('id="' + id + '"'), "sobra #" + id);
    assert.doesNotMatch(hero, new RegExp('getElementById\\("' + id + '"\\)'));
  }

  assert.doesNotMatch(css, /\.hero-control|\.hero-controles|\.hero-carrusel/);

  const scripts = [...html.matchAll(/<script\s+src="(js\/[^"]+)"/g)].map((m) => m[1]);
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

test("el hero mide 650 px en escritorio y se adapta en pantallas pequeñas", () => {
  const heroCss = css.slice(css.indexOf(".hero-cine {"), css.indexOf(".hero-capa {"));
  assert.match(heroCss, /width:\s*100%/);
  assert.match(heroCss, /height:\s*650px/);
  assert.doesNotMatch(heroCss, /min-height/);

  const inicioMovil = css.indexOf(".hero-cine", css.indexOf(".hero-sinopsis"));
  const movil = css.slice(inicioMovil, css.indexOf(".hero-titulo", inicioMovil));
  assert.match(movil, /height:\s*540px/);
  const pequeno = css.slice(css.indexOf("@media (max-width: 480px)"), css.indexOf(".cabecera-seccion"));
  assert.match(pequeno, /height:\s*500px/);
});

test("el fondo se ve claro y fondo y texto cambian en un solo relevo", () => {
  const capa = css.slice(css.indexOf(".hero-fondo {"), css.indexOf(".hero-capa {"));
  assert.match(capa, /brightness\(1\.12\)/);
  assert.match(capa, /opacity:\s*0\.9/);
  assert.match(capa, /transition:\s*opacity\s*0\.45s\s*ease/);
  assert.doesNotMatch(css, /\.hero-fondo\.siguiente/);

  const texto = css.slice(css.indexOf(".hero-contenido-dinamico {"), css.indexOf(".hero-subtitulo {"));
  assert.match(texto, /\.hero-cine\.hero-cambiando \.hero-contenido-dinamico/);
  assert.match(texto, /animation:\s*hero-texto-entrar\s*0\.45s\s*ease\s*both/);
  assert.match(css, /@keyframes hero-texto-entrar/);
  assert.match(texto, /from\s*\{\s*opacity:\s*0/);
  assert.match(texto, /to\s*\{\s*opacity:\s*1/);

  // Ambas duraciones coinciden: 0.45s en el fondo y 0.45s en el texto.
  assert.equal((capa.match(/0\.45s/g) || []).length, (texto.match(/0\.45s/g) || []).length);
  assert.match(hero, /prepararFondo\(destino\)/);
  assert.match(css, /\.hero-punto\.activo/);
  assert.match(css, /animation:\s*hero-barra\s*3s\s*linear\s*forwards/);
});
