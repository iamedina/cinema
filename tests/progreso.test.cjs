"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar, emitirStorage } = require("./ayuda.cjs");

function crear(opciones) {
  return cargar(["js/almacen.js", "js/progreso.js"], opciones);
}

test("normaliza la entrada y marca vista al 90 %", () => {
  const p = crear().CINEMA.progreso;

  const visto = p.normalizar({
    id: "tmdb-movie-653",
    titulo: "Nosferatu",
    anio: "1922",
    posicion: 95,
    duracion: 100,
  });
  assert.equal(visto.visto, true);
  assert.equal(visto.posicion, 95);

  const recortado = p.normalizar({ id: "x", posicion: 200, duracion: 100 });
  assert.equal(recortado.posicion, 100);

  assert.equal(p.normalizar({}), null);
  assert.equal(p.normalizar({ id: "" }), null);
  assert.equal(p.normalizar(null), null);
});

test("limpiar deduplica, ordena y limita a 40 entradas", () => {
  const p = crear().CINEMA.progreso;

  const items = p.limpiar([
    { id: "a", posicion: 10, actualizado: 1 },
    { id: "b", posicion: 20, actualizado: 3 },
    { id: "a", posicion: 30, actualizado: 2 },
    null,
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].id, "b");

  const muchos = Array.from({ length: 45 }, (_, i) => ({
    id: "id" + i,
    posicion: 10,
    actualizado: i,
  }));
  assert.equal(p.limpiar(muchos).length, 40);
  assert.deepEqual(p.limpiar("no es una lista"), []);
});

test("guarda, lee y persiste en localStorage", () => {
  const { CINEMA, almacenamiento } = crear();
  const p = CINEMA.progreso;

  assert.equal(
    p.guardar({
      id: "tmdb-movie-653",
      titulo: "Nosferatu",
      anio: "1922",
      posicion: 10,
      duracion: 100,
    }),
    true
  );

  assert.equal(p.leer("tmdb-movie-653").posicion, 10);
  assert.ok(almacenamiento.getItem("cinema:progreso:v1") !== null);

  assert.equal(p.quitar("tmdb-movie-653"), true);
  assert.equal(p.leer("tmdb-movie-653"), null);
});

test("ignora posiciones menores de 5 segundos sin borrar lo guardado", () => {
  const p = crear().CINEMA.progreso;

  assert.equal(p.guardar({ id: "a", posicion: 3, duracion: 100 }), false);
  assert.equal(p.leer("a"), null);

  p.guardar({ id: "a", posicion: 30, duracion: 100 });
  assert.equal(p.guardar({ id: "a", posicion: 2, duracion: 100 }), false);
  assert.equal(p.leer("a").posicion, 30);
});

test("enCurso excluye las vistas y conserva las empezadas", () => {
  const p = crear().CINEMA.progreso;

  p.guardar({ id: "a", posicion: 10, duracion: 100 });
  p.guardar({ id: "b", posicion: 95, duracion: 100 }); // vista
  p.guardar({ id: "c", posicion: 50, duracion: 100 });

  assert.deepEqual(
    p
      .enCurso()
      .map((item) => item.id)
      .sort(),
    ["a", "c"]
  );
});

test("calcula porcentaje, restante y formato de tiempo", () => {
  const p = crear().CINEMA.progreso;

  assert.equal(p.porcentaje({ posicion: 25, duracion: 100 }), 25);
  assert.equal(p.porcentaje({ posicion: 0, duracion: 0 }), 0);
  assert.equal(p.porcentaje(null), 0);

  assert.equal(p.restante({ posicion: 25, duracion: 100 }), 75);
  assert.equal(p.restante({ posicion: 0, duracion: 0 }), 0);

  assert.equal(p.formatear(0), "0:00");
  assert.equal(p.formatear(65), "1:05");
  assert.equal(p.formatear(3725), "1:02:05");
  assert.equal(p.formatear(-10), "0:00");
});

test("vaciar borra todo el progreso", () => {
  const { CINEMA } = crear();
  const p = CINEMA.progreso;

  p.guardar({ id: "a", posicion: 10, duracion: 100 });
  p.guardar({ id: "b", posicion: 20, duracion: 100 });

  p.vaciar();
  assert.deepEqual(p.lista(), []);
  assert.deepEqual(p.enCurso(), []);
});

test("se sincroniza con otra pestaña", () => {
  const { CINEMA, oyentes } = crear();

  emitirStorage(oyentes, {
    key: "cinema:progreso:v1",
    newValue: JSON.stringify([{ id: "z", posicion: 20, duracion: 100 }]),
  });

  assert.equal(CINEMA.progreso.leer("z").posicion, 20);
});
