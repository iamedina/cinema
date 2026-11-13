"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

function catalogo() {
  return cargar(["js/dominio-publico.js"]).CINEMA.dominioPublico;
}

test("el catálogo tiene 24 películas con datos completos", () => {
  const dp = catalogo();
  const items = dp.listar();

  assert.equal(items.length, 24);

  for (const item of items) {
    assert.match(item.tmdb, /^\d+$/, "tmdb de " + item.titulo);
    assert.match(item.imdb, /^tt\d+$/, "imdb de " + item.titulo);
    assert.match(item.anio, /^\d{4}$/, "año de " + item.titulo);
    assert.ok(item.titulo.length > 0, "título vacío");
    assert.ok(item.identificador.length > 0, "identificador vacío");
    assert.match(item.archivo, /\.mp4$/i, "archivo de " + item.titulo);
  }
});

test("no hay identificadores repetidos", () => {
  const items = catalogo().listar();
  const tmdb = new Set(items.map((i) => i.tmdb));
  const imdb = new Set(items.map((i) => i.imdb));
  const archivos = new Set(items.map((i) => i.archivo));

  assert.equal(tmdb.size, items.length);
  assert.equal(imdb.size, items.length);
  assert.equal(archivos.size, items.length);
});

test("las URLs apuntan a Internet Archive y están codificadas", () => {
  const dp = catalogo();

  for (const item of dp.listar()) {
    const url = dp.url(item);
    assert.ok(url.startsWith("https://archive.org/download/"), url);
    assert.equal(url.includes(" "), false, "espacio sin codificar: " + url);
    assert.ok(dp.ficha(item).startsWith("https://archive.org/details/"), dp.ficha(item));
    assert.ok(dp.miniatura(item).startsWith("https://archive.org/services/img/"), dp.miniatura(item));
  }
});

test("busca por id de TMDB y por id de IMDb", () => {
  const dp = catalogo();

  assert.equal(dp.buscar("tmdb-movie-653").titulo, "Nosferatu");
  assert.equal(dp.buscar("tt0013442").titulo, "Nosferatu");
  assert.equal(dp.buscar("tmdb-movie-19").anio, "1927");
  assert.equal(dp.buscar("tt0063350").titulo, "La noche de los muertos vivientes");
  assert.equal(dp.buscar("tmdb-movie-550"), null);
});

test("busca por título y año, ignorando tildes y mayúsculas", () => {
  const dp = catalogo();

  assert.equal(dp.buscar(null, "Metropolis", "1927").titulo, "Metrópolis");
  assert.equal(dp.buscar(null, "metrópolis", 1927).tmdb, "19");
  assert.equal(dp.buscar(null, "EL MAQUINISTA DE LA GENERAL", "1926").tmdb, "961");
  assert.equal(dp.buscar(null, "Metrópolis", "2001"), null);
  assert.equal(dp.buscar(null, "No existe", "1999"), null);
  assert.equal(dp.buscar(null, "", ""), null);
});

test("normaliza títulos para comparar", () => {
  const dp = catalogo();

  assert.equal(dp.normalizar("  ¡Metrópolis!  "), "metropolis");
  assert.equal(dp.normalizar("El gabinete del doctor Caligari"), "el gabinete del doctor caligari");
  assert.equal(dp.normalizar(null), "");
});

test("url y ficha toleran una entrada vacía", () => {
  const dp = catalogo();

  assert.equal(dp.url(null), "");
  assert.equal(dp.ficha(null), "");
  assert.equal(dp.miniatura(null), "");
});
