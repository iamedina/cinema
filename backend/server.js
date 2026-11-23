/**
 * CINEMA · servidor local
 * ------------------------------------------------------------
 * Orquesta las capas del backend:
 *   - config.js            credenciales, rutas y límites
 *   - servicios/cache.js   caché en memoria
 *   - servicios/tmdb.js    proxy y fusión de páginas de TMDB
 *   - servicios/omdb.js    proxy de respaldo OMDb
 *   - estatico.js          archivos públicos de frontend/
 *   - http.js              respuestas y cabeceras comunes
 *
 * Uso:
 *   npm start
 *   http://127.0.0.1:8080
 */
"use strict";

const http = require("http");

const {
  RAIZ,
  leerConfig,
  configuracion,
  cabecerasTmdb,
} = require("./config");
const { crearCache } = require("./servicios/cache");
const { crearProxyTmdb, PREFIJOS_PERMITIDOS } = require("./servicios/tmdb");
const { crearProxyOmdb, PARAMS_OMDB } = require("./servicios/omdb");
const { crearEstatico } = require("./estatico");
const { CABECERAS_SEGURIDAD, responder } = require("./http");

/* Una configuración y una caché por arranque del servidor. */
const config = configuracion();
const cache = crearCache(config.cacheTtlMs);
const proxyTmdb = crearProxyTmdb({ config, cache, cabecerasTmdb });
const proxyOmdb = crearProxyOmdb({ config, cache });
const { pathSeguro, responder404, servirArchivo } = crearEstatico({
  raiz: RAIZ,
  cabecerasSeguridad: CABECERAS_SEGURIDAD,
});

const servidor = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch {
    return responder(res, 400, { error: "URL inválida" });
  }

  const pathname = decodeURIComponent(url.pathname);

  /* --- API --- */
  if (pathname === "/api/health") {
    return responder(res, 200, {
      ok: true,
      tmdb: Boolean(config.tmdb),
      omdb: Boolean(config.omdb),
      auth: config.tmdb ? (config.esToken ? "token-v4" : "key-v3") : null,
      idioma: config.idioma,
    });
  }

  if (pathname === "/api/omdb") {
    try {
      const { status, body } = await proxyOmdb(url.searchParams);
      return responder(res, status, body, status === 200 ? { "Cache-Control": "public, max-age=600" } : {});
    } catch (error) {
      console.error("Error en el proxy OMDb:", error);
      return responder(res, 502, { Response: "False", Error: "No se pudo contactar con OMDb" });
    }
  }

  if (pathname.startsWith("/api/tmdb/")) {
    const destino = decodeURIComponent(pathname.slice("/api/tmdb/".length));
    const permitido = PREFIJOS_PERMITIDOS.some((prefijo) => destino.startsWith(prefijo));

    if (!permitido) return responder(res, 403, { error: "Ruta no permitida" });

    try {
      const { status, body } = await proxyTmdb(destino, url.searchParams);
      return responder(res, status, body, status === 200 ? { "Cache-Control": "public, max-age=600" } : {});
    } catch (error) {
      console.error("Error en el proxy TMDB:", error);
      return responder(res, 502, { error: "No se pudo contactar con TMDB" });
    }
  }

  /* --- Archivos estáticos --- */
  return servirArchivo(res, pathname, responder);
});

function iniciar(puerto) {
  const elegido = puerto === undefined ? config.puerto : puerto;

  return servidor.listen(elegido, "127.0.0.1", () => {
    const real = servidor.address().port;
    console.log(`CINEMA corriendo en http://127.0.0.1:${real}`);

    if (!config.tmdb) {
      console.log(
        "Nota: no hay clave de TMDB. Añade TMDB_API_KEY en config.local.js "
        + "para activar el catálogo amplio y los tráilers (mira config.example.js)."
      );
    } else {
      console.log("Clave de TMDB detectada. Catálogo amplio y tráilers activados.");
    }

    if (!config.omdb) {
      console.log(
        "Nota: OMDb no tiene clave en el servidor, así que el respaldo OMDb "
        + "queda desactivado. Añade OMDB_API_KEY a config.local.js para activarlo."
      );
    }
  });
}

if (require.main === module) iniciar();

module.exports = {
  servidor,
  iniciar,
  proxyTmdb,
  proxyOmdb,
  pathSeguro,
  leerConfig,
  PREFIJOS_PERMITIDOS,
  PARAMS_OMDB,
  responder404,
};
