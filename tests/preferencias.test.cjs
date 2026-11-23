"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar, crearLocalStorage, emitirStorage } = require("./ayuda.cjs");

function crear(opciones) {
  return cargar(["js/preferencias.js"], opciones);
}

function crearDocumento() {
  const clases = new Set();

  return {
    clases,
    document: {
      documentElement: {
        classList: {
          toggle(nombre, activo) {
            if (activo) clases.add(nombre);
            else clases.delete(nombre);
          },
        },
      },
    },
  };
}

test("preferencias arranca con los valores por defecto", () => {
  const { CINEMA } = crear();
  const prefs = CINEMA.preferencias;

  assert.deepEqual(prefs.leer(), {
    reducirAnimaciones: false,
    textoGrande: false,
    acento: "azul",
    ordenTrailer: "latino",
    cargarTrailer: true,
    region: "MX",
    recordarProgreso: true,
    reanudacion: "preguntar",
  });
});

test("guarda cambios parciales y persiste la clave versionada", () => {
  const { CINEMA, almacenamiento } = crear();
  const prefs = CINEMA.preferencias;

  const resultado = prefs.guardar({
    textoGrande: true,
    region: "AR",
    ordenTrailer: "espana",
  });

  assert.equal(resultado.textoGrande, true);
  assert.equal(resultado.region, "AR");
  assert.equal(resultado.ordenTrailer, "espana");
  assert.equal(resultado.reducirAnimaciones, false);

  const guardado = JSON.parse(almacenamiento.getItem("cinema:ajustes:v1"));
  assert.equal(guardado.textoGrande, true);
  assert.equal(guardado.region, "AR");
  assert.equal(guardado.reanudacion, "preguntar");
});

test("normaliza valores inválidos sin romper el resto", () => {
  const { CINEMA } = crear();
  const prefs = CINEMA.preferencias;

  const resultado = prefs.guardar({
    region: "ZZ",
    ordenTrailer: "klingon",
    reanudacion: "telepatia",
    cargarTrailer: "no",
    recordarProgreso: 0,
    acento: "verde",
  });

  assert.equal(resultado.acento, "azul");
  assert.equal(resultado.region, "MX");
  assert.equal(resultado.ordenTrailer, "latino");
  assert.equal(resultado.reanudacion, "preguntar");
  assert.equal(resultado.cargarTrailer, true);
  assert.equal(resultado.recordarProgreso, true);
});

test("tolera JSON roto y almacenamiento bloqueado", () => {
  const almacenamiento = crearLocalStorage();
  almacenamiento.setItem("cinema:ajustes:v1", "{no es json");

  const { CINEMA } = crear({ localStorage: almacenamiento });
  assert.equal(CINEMA.preferencias.leer().region, "MX");

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

  const segundo = crear({ localStorage: bloqueado }).CINEMA.preferencias;
  assert.deepEqual(segundo.leer(), segundo.DEFECTOS);
  assert.doesNotThrow(() => segundo.guardar({ region: "ES" }));
});

test("restablecer vuelve a los valores por defecto", () => {
  const { CINEMA, almacenamiento } = crear();
  const prefs = CINEMA.preferencias;

  prefs.guardar({ textoGrande: true, region: "CL", cargarTrailer: false });
  const resultado = prefs.restablecer();

  assert.deepEqual(resultado, prefs.DEFECTOS);
  assert.deepEqual(prefs.leer(), prefs.DEFECTOS);
  assert.deepEqual(JSON.parse(almacenamiento.getItem("cinema:ajustes:v1")), prefs.DEFECTOS);
});

test("aplica las clases de apariencia al documento", () => {
  const { document, clases } = crearDocumento();
  const { CINEMA } = crear({ document });
  const prefs = CINEMA.preferencias;

  assert.equal(clases.size, 0);

  prefs.guardar({ textoGrande: true, reducirAnimaciones: true });
  assert.ok(clases.has("texto-grande"));
  assert.ok(clases.has("reducir-animaciones"));

  prefs.guardar({ textoGrande: false, reducirAnimaciones: false });
  assert.equal(clases.size, 0);

  prefs.guardar({ acento: "ambar" });
  assert.ok(clases.has("acento-ambar"));

  prefs.guardar({ acento: "azul" });
  assert.equal(clases.has("acento-ambar"), false);
});

test("avisa a los oyentes y permite desuscribirse", () => {
  const { CINEMA } = crear();
  const prefs = CINEMA.preferencias;
  const recibidos = [];

  const quitar = prefs.alCambiar((valor) => recibidos.push(valor));
  prefs.guardar({ region: "PE" });
  quitar();
  prefs.guardar({ region: "US" });

  assert.equal(recibidos.length, 1);
  assert.equal(recibidos[0].region, "PE");
});

test("reacciona a cambios hechos en otra pestaña", () => {
  const { CINEMA, oyentes } = crear();
  const prefs = CINEMA.preferencias;
  const recibidos = [];

  prefs.alCambiar((valor) => recibidos.push(valor));
  emitirStorage(oyentes, {
    key: "cinema:ajustes:v1",
    newValue: JSON.stringify({ region: "CO", textoGrande: true }),
  });

  assert.equal(prefs.leer().region, "CO");
  assert.equal(prefs.leer().textoGrande, true);
  assert.equal(recibidos.length, 1);

  emitirStorage(oyentes, {
    key: "cinema:ajustes:v1",
    newValue: "{roto",
  });
  assert.equal(prefs.leer().region, "MX");

  emitirStorage(oyentes, { key: "otra:clave", newValue: "{}" });
  assert.equal(recibidos.length, 2);
});
