/**
 * CINEMA · proxy de OMDb
 * ------------------------------------------------------------
 * Respaldo cuando no hay TMDB. La clave nunca viaja al navegador.
 */
"use strict";

const PARAMS_OMDB = new Set([
  "s",
  "i",
  "t",
  "y",
  "type",
  "page",
  "plot",
  "r",
  "season",
  "episode",
]);

const MAX_VALOR_OMDB = 200;

function crearProxyOmdb({ config, cache }) {
  async function proxyOmdb(searchParams) {
    if (!config.omdb) {
      return {
        status: 503,
        body: {
          Response: "False",
          Error: "OMDb no configurado en el servidor",
          codigo: "OMDB_NO_CONFIGURADO",
        },
      };
    }

    const params = new URLSearchParams();
    for (const [clave, valor] of searchParams.entries()) {
      if (!PARAMS_OMDB.has(clave)) continue;
      if (valor.length > MAX_VALOR_OMDB) continue;
      params.set(clave, valor);
    }
    if (!params.get("r")) params.set("r", "json");
    params.set("apikey", config.omdb);

    const claveCache = params.toString();
    const cacheado = cache.leer("omdb:" + claveCache);
    if (cacheado) return { status: 200, body: cacheado };

    const url = new URL(config.omdbBase);
    for (const [clave, valor] of params.entries()) {
      url.searchParams.set(clave, valor);
    }

    const respuesta = await fetch(url, { headers: { accept: "application/json" } });
    if (!respuesta.ok) {
      return {
        status: respuesta.status,
        body: { Response: "False", Error: "OMDb respondió HTTP " + respuesta.status },
      };
    }

    const json = await respuesta.json();
    cache.escribir("omdb:" + claveCache, json);
    return { status: 200, body: json };
  }

  return proxyOmdb;
}

module.exports = { crearProxyOmdb, PARAMS_OMDB };
