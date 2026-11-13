"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

test("los filtros se leen de la URL y se escriben sin page", () => {
  const location = { search: "?genero=28&page=3", pathname: "/pelicula.html" };
  const urls = [];
  const history = {
    replaceState(_estado, _titulo, url) {
      urls.push(url);
    },
  };

  const { CINEMA } = cargar(["js/filtros.js"], { location, history });

  assert.deepEqual(CINEMA.filtros.leer(), { genero: "28" });

  CINEMA.filtros.escribir({ genero: "28", orden: "nota" });
  assert.equal(urls[0], "/pelicula.html?genero=28&orden=nota");
});

test("limpiar los filtros deja la URL limpia", () => {
  const location = { search: "?genero=28&anio=2024&page=2", pathname: "/serie.html" };
  const urls = [];
  const history = {
    replaceState(_estado, _titulo, url) {
      urls.push(url);
    },
  };

  const { CINEMA } = cargar(["js/filtros.js"], { location, history });

  CINEMA.filtros.escribir({});
  assert.equal(urls[0], "/serie.html");
});
