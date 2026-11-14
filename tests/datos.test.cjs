"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar, crearLocalStorage } = require("./ayuda.cjs");

function documentoVacio() {
  return {
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  };
}

function crearFavoritos(almacenamiento) {
  return cargar(["js/almacen.js", "js/favoritos.js"], {
    localStorage: almacenamiento,
    document: documentoVacio(),
  });
}

test("favoritos.reemplazar sanea la copia importada y la persiste", () => {
  const almacenamiento = crearLocalStorage();
  const { CINEMA } = crearFavoritos(almacenamiento);
  const favoritos = CINEMA.favoritos;

  favoritos.reemplazar([
    { id: "tmdb-movie-603", titulo: "Matrix", anio: "1999", tipo: "movie", agregado: 2 },
    { id: "tmdb-movie-603", titulo: "Matrix duplicada", agregado: 3 },
    { id: "sin-titulo" },
    null,
  ]);

  assert.equal(favoritos.total(), 1);
  assert.equal(favoritos.lista()[0].titulo, "Matrix");
  assert.deepEqual(
    JSON.parse(almacenamiento.getItem("cinema:favoritos:v1")).map((i) => i.id),
    ["tmdb-movie-603"]
  );
});

test("progreso.reemplazar sanea, ordena y persiste", () => {
  const almacenamiento = crearLocalStorage();
  const { CINEMA } = cargar(["js/almacen.js", "js/progreso.js"], {
    localStorage: almacenamiento,
  });
  const progreso = CINEMA.progreso;

  progreso.reemplazar([
    { id: "a", titulo: "A", posicion: 10, duracion: 100, actualizado: 1 },
    { id: "b", titulo: "B", posicion: 20, duracion: 100, actualizado: 5 },
    { id: "a", titulo: "A repetida", posicion: 30, actualizado: 9 },
    { id: "" },
  ]);

  assert.deepEqual(progreso.lista().map((i) => i.id), ["b", "a"]);
  assert.equal(progreso.leer("a").posicion, 10);
  assert.deepEqual(
    JSON.parse(almacenamiento.getItem("cinema:progreso:v1")).map((i) => i.id),
    ["b", "a"]
  );
});

test("historial.reemplazar normaliza y guarda solo entradas válidas", () => {
  const almacenamiento = crearLocalStorage();
  const { CINEMA } = cargar(["js/almacen.js", "js/historial.js"], {
    localStorage: almacenamiento,
  });
  const historial = CINEMA.historial;

  historial.reemplazar(["  Matrix  ", "matrix", "a", "", "Dune"]);

  assert.deepEqual(historial.leer(), ["Matrix", "Dune"]);
  assert.deepEqual(
    JSON.parse(almacenamiento.getItem("cinema:historial:v1")),
    ["Matrix", "Dune"]
  );
});

test("reemplazar con datos corruptos deja las listas vacías", () => {
  const favoritos = crearFavoritos().CINEMA.favoritos;
  favoritos.reemplazar("no es una lista");
  assert.equal(favoritos.total(), 0);

  const progreso = cargar(["js/almacen.js", "js/progreso.js"]).CINEMA.progreso;
  progreso.reemplazar({ id: "x" });
  assert.deepEqual(progreso.lista(), []);

  const historial = cargar(["js/almacen.js", "js/historial.js"]).CINEMA.historial;
  historial.reemplazar(null);
  assert.deepEqual(historial.leer(), []);
});
