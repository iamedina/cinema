"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

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

test("etiquetaFiltro describe los filtros activos", () => {
  const { CINEMA } = cargar(["js/filtros.js"]);
  const generos = [{ id: "28", nombre: "Acción" }];

  assert.equal(CINEMA.filtros.etiquetaFiltro("genero", "28", generos), "Acción");
  assert.equal(CINEMA.filtros.etiquetaFiltro("orden", "nota", generos), "Mejor valoradas");
  assert.equal(CINEMA.filtros.etiquetaFiltro("nota", "7", generos), "Nota 7 o más");
  assert.equal(CINEMA.filtros.etiquetaFiltro("anio", "2024", generos), "Año: 2024");
});

test("los listados conservan los controles y los nombres de los selects", () => {
  const raiz = path.join(__dirname, "..");

  for (const pagina of ["pelicula.html", "serie.html", "anime.html"]) {
    const html = fs.readFileSync(path.join(raiz, pagina), "utf8");
    for (const id of ["tituloListado", "resumenListado", "destacados", "filtros", "resultado", "chevron"]) {
      assert.ok(html.includes('id="' + id + '"'), pagina + " necesita #" + id);
    }
  }

  const codigo = fs.readFileSync(path.join(raiz, "js/filtros.js"), "utf8");
  for (const control of ['campo("genero"', 'campo("anio"', 'campo("orden"', 'campo("nota"', 'id="limpiarFiltros"']) {
    assert.ok(codigo.includes(control), "falta " + control);
  }
});
