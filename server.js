/**
 * CINEMA · servidor local
 * ------------------------------------------------------------
 * 1. Sirve los archivos estáticos del sitio.
 * 2. Hace de proxy de la API de TMDB metiendo la clave en el
 *    servidor, para que nunca viaje en el JS del navegador.
 * 3. Fusiona varias páginas de TMDB en una sola respuesta, así el
 *    sitio puede mostrar 40 o 60 títulos por página.
 *
 * Uso:
 *   node server.js
 *   http://127.0.0.1:8080
 *
 * Configura tu clave en config.local.js (ver config.example.js)
 * o con la variable de entorno TMDB_API_KEY.
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = parseInt(process.env.PORT, 10) || 8080;
const RAIZ = __dirname;
const TMDB_BASE = process.env.TMDB_BASE || "https://api.themoviedb.org/3";
const OMDB_BASE = process.env.OMDB_BASE || "https://www.omdbapi.com/";
const IDIOMA = process.env.TMDB_LANGUAGE || "es-ES";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PAGINAS_FUSION = 5;
const TAMANO_PAGINA_TMDB = 20;

/* ------------------------------------------------------------
 * Credenciales (nunca se envían al navegador)
 * ---------------------------------------------------------- */

function leerConfig() {
  const config = {
    tmdb: process.env.TMDB_API_KEY || null,
    omdb: process.env.OMDB_API_KEY || null,
  };

  try {
    // eslint-disable-next-line global-require
    const local = require("./config.local");
    if (!config.tmdb && local && local.TMDB_API_KEY) config.tmdb = local.TMDB_API_KEY;
    if (!config.omdb && local && local.OMDB_API_KEY) config.omdb = local.OMDB_API_KEY;
  } catch {
    /* No existe config.local.js */
  }

  return config;
}

const CONFIG = leerConfig();
const TMDB_KEY = CONFIG.tmdb;
const OMDB_KEY = CONFIG.omdb;

/*
 * TMDB acepta dos credenciales:
 *   - API Key v3  -> 32 caracteres, viaja en ?api_key=...
 *   - Read Access Token v4 -> empieza por "eyJ" (JWT), viaja en la
 *     cabecera Authorization: Bearer ...
 * Soportamos las dos para que no haya que elegir.
 */
const TMDB_ES_TOKEN = Boolean(TMDB_KEY && TMDB_KEY.startsWith("eyJ"));

function cabecerasTmdb() {
  const cabeceras = { accept: "application/json" };
  if (TMDB_ES_TOKEN) cabeceras.Authorization = "Bearer " + TMDB_KEY;
  return cabeceras;
}

/* ------------------------------------------------------------
 * Utilidades
 * ---------------------------------------------------------- */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const PREFIJOS_PERMITIDOS = [
  "discover/",
  "search/",
  "trending/",
  "movie/",
  "tv/",
  "genre/",
  "configuration",
  "keyword/",
  "collection/",
  "person/",
  "watch/",
  "find/",
];

function pathSeguro(relativo) {
  const normalizado = path.normalize(relativo).replace(/^(\.\.[/\\])+/, "");
  const absoluto = path.join(RAIZ, normalizado);
  return absoluto.startsWith(RAIZ) ? absoluto : null;
}

const cache = new Map();

function cacheLeer(clave) {
  const entrada = cache.get(clave);
  if (!entrada) return null;
  if (Date.now() - entrada.t > CACHE_TTL_MS) {
    cache.delete(clave);
    return null;
  }
  return entrada.v;
}

function cacheEscribir(clave, valor) {
  if (cache.size > 400) {
    const primero = cache.keys().next().value;
    cache.delete(primero);
  }
  cache.set(clave, { t: Date.now(), v: valor });
}

/* ------------------------------------------------------------
 * Proxy de TMDB
 * ---------------------------------------------------------- */

const ES_LISTA = /^(discover|search|trending)\//;

async function proxyTmdb(pathname, searchParams) {
  if (!TMDB_KEY) {
    return {
      status: 503,
      body: {
        error: "TMDB_NO_CONFIGURADO",
        mensaje:
          "No hay clave de TMDB. Crea config.local.js con tu clave (mira config.example.js) o define TMDB_API_KEY.",
      },
    };
  }

  const paginas = Math.min(
    MAX_PAGINAS_FUSION,
    Math.max(1, parseInt(searchParams.get("paginas"), 10) || 1)
  );

  const params = new URLSearchParams();
  for (const [clave, valor] of searchParams.entries()) {
    if (clave === "paginas" || clave === "api_key" || clave === "api_token") continue;
    params.set(clave, valor);
  }
  if (!params.get("language")) params.set("language", IDIOMA);
  if (!TMDB_ES_TOKEN) params.set("api_key", TMDB_KEY);

  const esLista = ES_LISTA.test(pathname);

  /*
   * Se pide una página extra de TMDB para poder rellenar la vista aunque
   * TMDB repita algún título entre páginas. Sin esto, una vista de 60
   * podía quedarse en 58/59 y dejar la última fila de la rejilla coja.
   */
  const paginasExtra = esLista && paginas >= 3 && paginas < MAX_PAGINAS_FUSION ? 1 : 0;
  const paginasPedidas = paginas + paginasExtra;

  const urls = [];

  /*
   * `page` es la página del sitio (1, 2, 3...). Cada página del sitio
   * consume `paginas` páginas de TMDB, así que la primera página de TMDB
   * que hay que pedir es (page - 1) * paginas + 1. Sin esto, todas las
   * páginas del sitio devolverían los mismos títulos.
   */
  const paginaSitio = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const primeraTmdb = (paginaSitio - 1) * paginas + 1;

  for (let i = 0; i < paginasPedidas; i += 1) {
    const pagina = Math.min(500, primeraTmdb + i);
    const consulta = new URLSearchParams(params);
    if (esLista) consulta.set("page", String(pagina));
    urls.push(TMDB_BASE + "/" + pathname + "?" + consulta.toString());
  }

  const claveCache = urls.join("||");
  const cacheado = cacheLeer(claveCache);
  if (cacheado) return { status: 200, body: cacheado };

  const respuestas = await Promise.all(
    urls.map((url) => fetch(url, { headers: cabecerasTmdb() }))
  );

  const fallida = respuestas.find((r) => !r.ok);
  if (fallida) {
    return {
      status: fallida.status,
      body: { error: "TMDB_ERROR", status: fallida.status },
    };
  }

  const jsons = await Promise.all(respuestas.map((r) => r.json()));

  let cuerpo;
  if (jsons.length === 1) {
    cuerpo = jsons[0];
  } else {
    const primera = jsons[0];
    const resultados = [];
    const vistos = new Set();
    const esBusqueda = pathname.indexOf("search/") === 0;

    for (const json of jsons) {
      for (const item of json.results || []) {
        /* En /search/multi TMDB mezcla personas: no son títulos. */
        if (esBusqueda && item.media_type === "person") continue;
        const clave = item.id + ":" + (item.media_type || item.title || item.name || "");
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        resultados.push(item);
      }
    }

    /*
     * total_results es el total de toda la consulta, igual en cada
     * página de TMDB: no se suma. La página fusionada muestra
     * 20 * paginas títulos, así que el total de páginas del sitio se
     * calcula con ese tamaño.
     */
    const total = primera.total_results || resultados.length;
    const porVista = 20 * paginas;
    const totalPaginas = Math.max(
      1,
      Math.min(Math.floor(500 / paginas), Math.ceil(total / porVista))
    );

    cuerpo = {
      ...primera,
      page: paginaSitio,
      results: resultados.slice(0, porVista),
      total_results: total,
      total_pages: totalPaginas,
      /* TMDB no deja pasar de la página 500: avisamos al cliente. */
      truncado: total > totalPaginas * porVista,
    };
  }

  cacheEscribir(claveCache, cuerpo);
  return { status: 200, body: cuerpo };
}

/* ------------------------------------------------------------
 * Proxy de OMDb
 * ---------------------------------------------------------- */

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

async function proxyOmdb(searchParams) {
  if (!OMDB_KEY) {
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
  params.set("apikey", OMDB_KEY);

  const claveCache = params.toString();
  const cacheado = cacheLeer("omdb:" + claveCache);
  if (cacheado) return { status: 200, body: cacheado };

  const url = new URL(OMDB_BASE);
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
  cacheEscribir("omdb:" + claveCache, json);
  return { status: 200, body: json };
}

/* ------------------------------------------------------------
 * Servidor HTTP
 * ---------------------------------------------------------- */

function responder(res, status, cuerpo, cabeceras = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...cabeceras,
  });
  res.end(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo));
}

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
      tmdb: Boolean(TMDB_KEY),
      omdb: Boolean(OMDB_KEY),
      auth: TMDB_KEY ? (TMDB_ES_TOKEN ? "token-v4" : "key-v3") : null,
      idioma: IDIOMA,
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
  let relativo = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let absoluto = pathSeguro(relativo);

  if (!absoluto) return responder(res, 403, "Prohibido");

  let datos = null;
  try {
    if (fs.existsSync(absoluto) && fs.statSync(absoluto).isFile()) {
      datos = fs.readFileSync(absoluto);
    }
  } catch {
    datos = null;
  }

  if (!datos) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
        "<title>No encontrado | CINEMA</title>" +
        '<meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
        '<body style="background:#000;color:#fff;font-family:sans-serif;display:flex;min-height:100vh;' +
        'align-items:center;justify-content:center;flex-direction:column;gap:16px">' +
        "<h1>404</h1><p>La página que buscas no existe.</p>" +
        '<a style="color:#0d6efd" href="/">Volver al inicio</a></body></html>'
    );
  }

  const tipo = MIME[path.extname(absoluto).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-cache" });
  res.end(datos);
});

function iniciar(puerto) {
  const elegido = puerto === undefined ? PUERTO : puerto;

  return servidor.listen(elegido, "127.0.0.1", () => {
    const real = servidor.address().port;
    console.log(`CINEMA corriendo en http://127.0.0.1:${real}`);

    if (!TMDB_KEY) {
      console.warn(
        "ATENCIÓN: no hay clave de TMDB. El sitio seguirá funcionando con OMDb,"
        + " pero sin catálogo amplio ni tráilers. Crea config.local.js (mira config.example.js)."
      );
    } else {
      console.log("Clave de TMDB detectada. Catálogo amplio y tráilers activados.");
    }

    if (!OMDB_KEY) {
      console.warn(
        "OMDb no tiene clave en el servidor: el navegador usará su clave de respaldo."
        + " Añade OMDB_API_KEY a config.local.js para ocultarla."
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
};
