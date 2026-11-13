"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

function escuchar(servidor) {
  return new Promise((resolve) => {
    servidor.listen(0, "127.0.0.1", () => resolve(servidor.address().port));
  });
}

function cerrar(servidor) {
  return new Promise((resolve) => servidor.close(resolve));
}

test("servidor: OMDb por proxy, archivos estáticos y rutas permitidas", async () => {
  const consultas = [];

  const falsoOmdb = http.createServer((req, res) => {
    consultas.push(req.url);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        Response: "True",
        Search: [{ imdbID: "tt0133093", Title: "Matrix", Year: "1999", Type: "movie" }],
      })
    );
  });

  const puertoFalso = await escuchar(falsoOmdb);

  process.env.OMDB_API_KEY = "clave-de-prueba";
  process.env.OMDB_BASE = "http://127.0.0.1:" + puertoFalso + "/";

  delete require.cache[require.resolve("../server.js")];
  const { servidor } = require("../server.js");
  const puerto = await escuchar(servidor);
  const base = "http://127.0.0.1:" + puerto;

  try {
    /* La clave del cliente se ignora y se usa la del servidor. */
    const respuesta = await fetch(base + "/api/omdb?s=matrix&apikey=robar&page=2&r=json&extra=1");
    assert.equal(respuesta.status, 200);

    const json = await respuesta.json();
    assert.equal(json.Response, "True");
    assert.equal(consultas.length, 1);

    const consulta = new URL(consultas[0], "http://x").searchParams;
    assert.equal(consulta.get("apikey"), "clave-de-prueba");
    assert.equal(consulta.get("s"), "matrix");
    assert.equal(consulta.get("page"), "2");
    assert.equal(consulta.get("extra"), null);

    /* La salud anuncia los dos servicios. */
    const salud = await (await fetch(base + "/api/health")).json();
    assert.equal(salud.ok, true);
    assert.equal(salud.omdb, true);

    /* El sitio se sirve y conserva el landmark principal. */
    const inicio = await fetch(base + "/");
    assert.equal(inicio.status, 200);
    const html = await inicio.text();
    assert.match(html, /<main id="contenido"/);

    /* Rutas de TMDB no permitidas. */
    const prohibido = await fetch(base + "/api/tmdb/account");
    assert.equal(prohibido.status, 403);

    /* 404 propio. */
    const noExiste = await fetch(base + "/no-existe.html");
    assert.equal(noExiste.status, 404);
  } finally {
    await cerrar(servidor);
    await cerrar(falsoOmdb);
    delete process.env.OMDB_API_KEY;
    delete process.env.OMDB_BASE;
  }
});
