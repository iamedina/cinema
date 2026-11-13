"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

const UBICACION_FILE = {
  protocol: "file:",
  search: "",
  pathname: "/descripcion.html",
  origin: "null",
};

function crearApi(fetchStub) {
  return cargar(["js/api.js"], {
    location: UBICACION_FILE,
    fetch: fetchStub,
  }).CINEMA.api;
}

test("detecta el límite diario de OMDb en un 401", async () => {
  const api = crearApi(async () => ({
    ok: false,
    status: 401,
    json: async () => ({ Response: "False", Error: "Request limit reached!" }),
  }));

  let error = null;
  try {
    await api.buscar({ query: "matrix", page: 1 });
  } catch (capturado) {
    error = capturado;
  }

  assert.ok(error, "debe lanzar un error");
  assert.equal(api.esLimiteOmdb(error), true);
  assert.match(error.message, /límite diario/);
  assert.match(error.message, /npm start/);
});

test("detecta el límite aunque llegue como Response False", async () => {
  const api = crearApi(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ Response: "False", Error: "Request limit reached!" }),
  }));

  let error = null;
  try {
    await api.detalle("tt0013442");
  } catch (capturado) {
    error = capturado;
  }

  assert.ok(error, "debe lanzar un error");
  assert.equal(api.esLimiteOmdb(error), true);
});

test("un error de servidor normal no se confunde con el límite", async () => {
  const api = crearApi(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ Response: "False", Error: "Server error" }),
  }));

  let error = null;
  try {
    await api.buscar({ query: "matrix", page: 1 });
  } catch (capturado) {
    error = capturado;
  }

  assert.ok(error, "debe lanzar un error");
  assert.equal(api.esLimiteOmdb(error), false);
  assert.match(error.message, /HTTP 500/);
});
