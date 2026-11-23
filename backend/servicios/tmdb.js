/**
 * CINEMA · proxy de TMDB
 * ------------------------------------------------------------
 * Añade la credencial en el servidor y fusiona varias páginas de TMDB
 * en una sola respuesta para mostrar 40 o 60 títulos por página.
 */
"use strict";

const { fetchConReintento } = require("./red");

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

const ES_LISTA = /^(discover|search|trending)\//;

function crearProxyTmdb({ config, cache, cabecerasTmdb }) {
  async function proxyTmdb(pathname, searchParams) {
    if (!config.tmdb) {
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
      config.maxPaginasFusion,
      Math.max(1, parseInt(searchParams.get("paginas"), 10) || 1)
    );

    const params = new URLSearchParams();
    for (const [clave, valor] of searchParams.entries()) {
      if (clave === "paginas" || clave === "api_key" || clave === "api_token") continue;
      params.set(clave, valor);
    }
    if (!params.get("language")) params.set("language", config.idioma);
    if (!config.esToken) params.set("api_key", config.tmdb);

    const esLista = ES_LISTA.test(pathname);

    /*
     * Se pide una página extra de TMDB para poder rellenar la vista aunque
     * TMDB repita algún título entre páginas. Sin esto, una vista de 60
     * podía quedarse en 58/59 y dejar la última fila de la rejilla coja.
     */
    const paginasExtra = esLista && paginas >= 3 && paginas < config.maxPaginasFusion ? 1 : 0;
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
      urls.push(config.tmdbBase + "/" + pathname + "?" + consulta.toString());
    }

    const claveCache = urls.join("||");
    const cacheado = cache.leer(claveCache);
    if (cacheado) return { status: 200, body: cacheado };

    const respuestas = await Promise.all(
      urls.map((url) => fetchConReintento(url, { headers: cabecerasTmdb(config) }))
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

    cache.escribir(claveCache, cuerpo);
    return { status: 200, body: cuerpo };
  }

  return proxyTmdb;
}

module.exports = { crearProxyTmdb, PREFIJOS_PERMITIDOS };
