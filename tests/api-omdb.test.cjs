"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

const UBICACION = {
  protocol: "http:",
  search: "",
  pathname: "/",
  origin: "http://127.0.0.1:8080",
};

/**
 * Stub de fetch: responde /api/health con la disponibilidad indicada y
 * delega el resto en `respuestaOmdb`. Guarda las URLs pedidas en `urls`.
 */
function crearApi({ tmdb = false, omdb = true, respuestaOmdb, urls } = {}) {
  const fetchStub = async (url) => {
    if (urls) urls.push(String(url));

    if (String(url).includes("/api/health")) {
      return { ok: true, status: 200, json: async () => ({ tmdb, omdb }) };
    }

    return respuestaOmdb();
  };

  return cargar(["js/api.js"], {
    location: UBICACION,
    fetch: fetchStub,
  }).CINEMA.api;
}

test("detecta el límite diario de OMDb en un 401", async () => {
  const api = crearApi({
    respuestaOmdb: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ Response: "False", Error: "Request limit reached!" }),
    }),
  });

  let error = null;
  try {
    await api.buscar({ query: "matrix", page: 1 });
  } catch (capturado) {
    error = capturado;
  }

  assert.ok(error, "debe lanzar un error");
  assert.equal(api.esLimiteOmdb(error), true);
  assert.equal(api.esAvisoOmdb(error), true);
  assert.match(error.message, /límite diario/);
  assert.match(error.message, /npm start/);
});

test("detecta el límite aunque llegue como Response False", async () => {
  const api = crearApi({
    respuestaOmdb: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ Response: "False", Error: "Request limit reached!" }),
    }),
  });

  let error = null;
  try {
    await api.detalle("tt0013442");
  } catch (capturado) {
    error = capturado;
  }

  assert.ok(error, "debe lanzar un error");
  assert.equal(api.esLimiteOmdb(error), true);
  assert.equal(api.esAvisoOmdb(error), true);
});

test("un error de servidor normal no se confunde con el límite", async () => {
  const api = crearApi({
    respuestaOmdb: async () => ({
      ok: false,
      status: 500,
      json: async () => ({ Response: "False", Error: "Server error" }),
    }),
  });

  let error = null;
  try {
    await api.buscar({ query: "matrix", page: 1 });
  } catch (capturado) {
    error = capturado;
  }

  assert.ok(error, "debe lanzar un error");
  assert.equal(api.esLimiteOmdb(error), false);
  assert.equal(api.esAvisoOmdb(error), false);
  assert.match(error.message, /HTTP 500/);
});

test("sin OMDb en el servidor no llama a OMDb y muestra un aviso claro", async () => {
  const urls = [];
  const api = crearApi({
    tmdb: false,
    omdb: false,
    urls,
    respuestaOmdb: async () => {
      throw new Error("no debería llamarse a OMDb");
    },
  });

  let error = null;
  try {
    await api.buscar({ query: "matrix", page: 1 });
  } catch (capturado) {
    error = capturado;
  }

  assert.ok(error, "debe lanzar un error");
  assert.equal(api.esAvisoOmdb(error), true);
  assert.equal(api.esLimiteOmdb(error), false);
  assert.match(error.message, /OMDb no está configurado/);
  assert.match(error.message, /config\.local\.js/);
  assert.equal(
    urls.some((url) => url.includes("omdbapi.com")),
    false,
    "el cliente no debe llamar a OMDb directamente"
  );
  assert.deepEqual(urls, ["/api/health"]);
});

test("con proxy disponible la petición va a /api/omdb y sin apikey", async () => {
  const urls = [];
  const api = crearApi({
    urls,
    respuestaOmdb: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ Response: "True", Search: [] }),
    }),
  });

  await api.buscar({ query: "matrix", page: 1 });

  const llamada = urls.find((url) => url.includes("/api/omdb"));
  assert.ok(llamada, "debe llamar al proxy");
  assert.equal(llamada.includes("apikey"), false, "la clave no viaja desde el cliente");
  assert.equal(llamada.includes("omdbapi.com"), false);
});
