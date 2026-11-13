"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

function crearHistorial(opciones) {
  return cargar(["js/almacen.js", "js/historial.js"], opciones);
}

test("normaliza espacios y descarta consultas demasiado cortas", () => {
  const { CINEMA } = crearHistorial();
  const historial = CINEMA.historial;

  assert.equal(historial.normalizar("  matrix   reloaded "), "matrix reloaded");
  assert.equal(historial.normalizar(null), "");
  assert.deepEqual(historial.limpiar([" uno ", "UNO", "d", 1, null, "dos"]), ["uno", "dos"]);
  assert.deepEqual(historial.limpiar("no es una lista"), []);
});

test("registrar coloca al principio y no duplica mayúsculas", () => {
  const { CINEMA } = crearHistorial();
  const historial = CINEMA.historial;

  assert.equal(historial.registrar("matrix"), true);
  assert.equal(historial.registrar("alien"), true);
  assert.equal(historial.registrar("MATRIX"), true);
  assert.deepEqual(historial.leer(), ["MATRIX", "alien"]);
  assert.equal(historial.registrar("x"), false);
});

test("respeta el máximo de 8 entradas", () => {
  const { CINEMA } = crearHistorial();
  const historial = CINEMA.historial;

  for (let i = 0; i < 12; i += 1) historial.registrar("consulta " + i);

  assert.equal(historial.leer().length, 8);
  assert.equal(historial.leer()[0], "consulta 11");
  assert.equal(historial.leer()[7], "consulta 4");
});

test("persiste en localStorage y se puede borrar", () => {
  const { CINEMA, almacenamiento } = crearHistorial();

  CINEMA.historial.registrar("dune");
  assert.equal(almacenamiento.getItem("cinema:historial:v1"), '["dune"]');

  assert.equal(CINEMA.historial.borrar(), true);
  assert.equal(almacenamiento.getItem("cinema:historial:v1"), null);
  assert.deepEqual(CINEMA.historial.leer(), []);
});

test("se sincroniza con otra pestaña", () => {
  const { CINEMA, oyentes } = crearHistorial();
  const { emitirStorage } = require("./ayuda.cjs");

  CINEMA.historial.registrar("matrix");
  emitirStorage(oyentes, {
    key: "cinema:historial:v1",
    newValue: '["alien","matrix"]',
  });

  assert.deepEqual(CINEMA.historial.leer(), ["alien", "matrix"]);
});
