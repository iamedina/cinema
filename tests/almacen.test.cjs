"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar, crearLocalStorage, emitirStorage } = require("./ayuda.cjs");

test("almacen guarda, lee y borra con clave versionada", () => {
  const { CINEMA, almacenamiento } = cargar(["js/almacen.js"]);
  const almacen = CINEMA.almacen;

  assert.deepEqual(almacen.leer("favoritos", []), []);
  assert.equal(almacen.escribir("favoritos", [{ id: "1" }], 1), true);
  assert.deepEqual(almacen.leer("favoritos", []), [{ id: "1" }]);
  assert.equal(almacenamiento.getItem("cinema:favoritos:v1"), '[{"id":"1"}]');
  assert.equal(almacen.borrar("favoritos", 1), true);
  assert.deepEqual(almacen.leer("favoritos", []), []);
});

test("almacen tolera JSON roto", () => {
  const almacenamiento = crearLocalStorage();
  almacenamiento.setItem("cinema:roto:v1", "{no es json");

  const { CINEMA } = cargar(["js/almacen.js"], { localStorage: almacenamiento });
  assert.deepEqual(CINEMA.almacen.leer("roto", ["defecto"], 1), ["defecto"]);
});

test("almacen no lanza si el navegador bloquea localStorage", () => {
  const bloqueado = {
    getItem() {
      throw new Error("bloqueado");
    },
    setItem() {
      throw new Error("bloqueado");
    },
    removeItem() {
      throw new Error("bloqueado");
    },
  };

  const { CINEMA } = cargar(["js/almacen.js"], { localStorage: bloqueado });
  assert.equal(CINEMA.almacen.disponible(), false);
  assert.deepEqual(CINEMA.almacen.leer("x", [1]), [1]);
  assert.equal(CINEMA.almacen.escribir("x", [2]), false);
  assert.equal(CINEMA.almacen.borrar("x"), false);
});

test("almacen avisa de cambios hechos en otra pestaña", () => {
  const { CINEMA, oyentes } = cargar(["js/almacen.js"]);
  const recibidos = [];

  CINEMA.almacen.alCambiar((cambio) => recibidos.push(cambio));
  emitirStorage(oyentes, { key: "cinema:historial:v1", newValue: '["matrix"]' });

  assert.deepEqual(recibidos, [{ nombre: "historial", version: 1, valor: ["matrix"] }]);
});
