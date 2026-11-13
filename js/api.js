/**
 * CINEMA · capa de datos
 * ------------------------------------------------------------
 * Fuentes, en orden de preferencia:
 *   1. TMDB a través del servidor local (/api/tmdb/*) — la clave
 *      nunca se expone en el navegador. Catálogo amplio, español,
 *      tráilers y 60 resultados por página.
 *   2. OMDb directo — respaldo si no hay servidor o no hay clave.
 *
 * Todo se normaliza al mismo objeto interno, así que la UI no
 * cambia según la fuente.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  const IDIOMA = "es-ES";
  const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
  const PERFIL_BASE = "https://image.tmdb.org/t/p/w185";
  const LOGO_BASE = "https://image.tmdb.org/t/p/w92";
  const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
  const BACKDROP_ORIGINAL = "https://image.tmdb.org/t/p/original";
  /* TMDB devuelve 20 por página: fusionamos 3 para mostrar 60. */
  const PAGINAS_POR_VISTA = 3;
  const TIMEOUT_MS = 15000;

  /* Solo usamos el servidor si la página no se abrió con doble clic. */
  const USAR_SERVIDOR = location.protocol !== "file:";

  /* ============================================================
   * Caché y límite de concurrencia (compartidos)
   * ========================================================== */

  const TTL_MS = 6 * 60 * 60 * 1000;
  const CACHE_PREFIX = "cinema:v2:";
  const CONCURRENCIA = 4;
  const memoria = new Map();
  const enVuelo = new Map();

  function cacheLeer(clave) {
    if (memoria.has(clave)) return memoria.get(clave);
    try {
      const crudo = sessionStorage.getItem(CACHE_PREFIX + clave);
      if (!crudo) return null;
      const { t, v } = JSON.parse(crudo);
      if (Date.now() - t > TTL_MS) {
        sessionStorage.removeItem(CACHE_PREFIX + clave);
        return null;
      }
      memoria.set(clave, v);
      return v;
    } catch {
      return null;
    }
  }

  function cacheEscribir(clave, valor) {
    memoria.set(clave, valor);
    try {
      sessionStorage.setItem(CACHE_PREFIX + clave, JSON.stringify({ t: Date.now(), v: valor }));
    } catch {
      /* Cuota llena: seguimos solo con memoria. */
    }
  }

  let activas = 0;
  const cola = [];

  function despachar() {
    while (activas < CONCURRENCIA && cola.length > 0) {
      const { tarea, resolve, reject } = cola.shift();
      activas += 1;
      tarea()
        .then(resolve, reject)
        .finally(() => {
          activas -= 1;
          despachar();
        });
    }
  }

  function limitar(tarea) {
    return new Promise((resolve, reject) => {
      cola.push({ tarea, resolve, reject });
      despachar();
    });
  }

  /* ============================================================
   * TMDB (a través del servidor)
   * ========================================================== */

  let avisoSinClave = false;
  let saludPromesa = null;

  /**
   * Pregunta una sola vez al servidor qué servicios tiene configurados.
   * Así, sin clave no se lanzan peticiones que acabarían en 503 y
   * ensuciarían la consola del navegador.
   */
  function salud() {
    if (!USAR_SERVIDOR) return Promise.resolve({});
    if (!saludPromesa) {
      saludPromesa = fetch("/api/health", { signal: AbortSignal.timeout(5000) })
        .then((res) => (res.ok ? res.json() : {}))
        .catch(() => ({}));
    }
    return saludPromesa;
  }

  async function tmdbDisponible() {
    return Boolean((await salud()).tmdb);
  }

  async function omdbDisponible() {
    return Boolean((await salud()).omdb);
  }

  /**
   * Devuelve el JSON de TMDB o null si no se puede usar el servidor
   * (sin clave, sin conexión o archivo abierto con doble clic).
   */
  async function tmdb(pathname) {
    if (!USAR_SERVIDOR) return null;
    if (!(await tmdbDisponible())) {
      if (!avisoSinClave) {
        avisoSinClave = true;
        console.warn(
          "TMDB no está configurado en el servidor; se usa OMDb como respaldo. " +
            "Crea config.local.js con tu clave para activar el catálogo amplio."
        );
      }
      return null;
    }

    const cacheado = cacheLeer("tmdb:" + pathname);
    if (cacheado) return cacheado;

    try {
      const res = await fetch("/api/tmdb" + pathname, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.status === 503) {
        return null;
      }

      if (!res.ok) {
        console.warn("TMDB respondió " + res.status + " en " + pathname);
        return null;
      }

      const json = await res.json();
      cacheEscribir("tmdb:" + pathname, json);
      return json;
    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("No se pudo llamar al servidor TMDB:", error.message);
      }
      return null;
    }
  }

  function esSerie(item) {
    return item.media_type === "tv" || Boolean(item.first_air_date) || Boolean(item.name && !item.title);
  }

  function normalizarTmdb(item) {
    const serie = esSerie(item);
    return {
      id: "tmdb-" + (serie ? "tv" : "movie") + "-" + item.id,
      tmdbId: item.id,
      origen: "tmdb",
      tipoRaw: serie ? "tv" : "movie",
      titulo: item.title || item.name || "Sin título",
      anio: String(item.release_date || item.first_air_date || "").slice(0, 4) || "—",
      tipo: serie ? "series" : "movie",
      poster: item.poster_path ? POSTER_BASE + item.poster_path : null,
    };
  }

  function elegirTrailer(videos) {
    if (!Array.isArray(videos) || !videos.length) return null;

    const deYoutube = videos.filter((v) => v.site === "YouTube");
    const espanol = deYoutube.filter((v) => v.iso_639_1 === "es");
    const ingles = deYoutube.filter((v) => v.iso_639_1 === "en");

    return (
      espanol.find((v) => v.type === "Trailer") ||
      espanol.find((v) => v.type === "Teaser") ||
      ingles.find((v) => v.type === "Trailer") ||
      ingles.find((v) => v.type === "Teaser") ||
      deYoutube[0] ||
      null
    );
  }

  function certificacionTmdb(json) {
    const listas = [
      ...((json.content_ratings && json.content_ratings.results) || []),
      ...((json.release_dates && json.release_dates.results) || []),
    ];

    for (const pais of ["ES", "US"]) {
      const encontrada = listas.find((item) => item.iso_3166_1 === pais);
      if (encontrada && encontrada.rating) return encontrada.rating;
      if (encontrada && encontrada.certification) return encontrada.certification;
    }

    return null;
  }

  function repartoTmdb(json) {
    const cast = (json.credits && json.credits.cast) || [];
    return cast.slice(0, 12).map((p) => ({
      id: p.id,
      nombre: p.name,
      personaje: p.character || null,
      foto: p.profile_path ? PERFIL_BASE + p.profile_path : null,
    }));
  }

  function directorTmdb(json) {
    const serie = Boolean(json.name && !json.title);
    if (serie) {
      const creadores = (json.created_by || []).map((p) => p.name).filter(Boolean);
      return creadores.length ? creadores.join(", ") : null;
    }
    const equipo = (json.credits && json.credits.crew) || [];
    const directores = equipo.filter((p) => p.job === "Director").map((p) => p.name);
    return directores.length ? directores.join(", ") : null;
  }

  function proveedoresTmdb(json) {
    const bloque = json["watch/providers"] && json["watch/providers"].results;
    if (!bloque) return null;
    /* España primero; si no hay, el catálogo de EE. UU. como referencia. */
    const region = bloque.ES || bloque.US || Object.values(bloque)[0];
    if (!region) return null;

    const grupos = [
      ["flatrate", "Suscripción"],
      ["free", "Gratis"],
      ["ads", "Con anuncios"],
      ["rent", "Alquiler"],
      ["buy", "Compra"],
    ];
    const items = [];
    const vistos = new Set();

    for (const [clave, etiqueta] of grupos) {
      const lista = region[clave];
      if (!Array.isArray(lista)) continue;
      for (const p of lista) {
        if (!p || !p.provider_name) continue;
        if (vistos.has(p.provider_id)) continue;
        vistos.add(p.provider_id);
        items.push({
          id: p.provider_id,
          nombre: p.provider_name,
          logo: p.logo_path ? LOGO_BASE + p.logo_path : null,
          tipo: etiqueta,
        });
      }
    }

    if (!items.length) return null;
    return { enlace: region.link || null, items };
  }

  function similaresTmdb(json) {
    const lista =
      (json.similar && json.similar.results) ||
      (json.recommendations && json.recommendations.results) ||
      [];
    return lista.filter((i) => i && i.media_type !== "person").slice(0, 12).map(normalizarTmdb);
  }

  function galeriaTmdb(json) {
    const imagenes = (json.images && json.images.backdrops) || [];
    const lista = imagenes.length ? imagenes : ((json.images && json.images.posters) || []);
    return lista.slice(0, 12).map((img) => ({
      url: BACKDROP_BASE + img.file_path,
      grande: BACKDROP_ORIGINAL + img.file_path,
    }));
  }

  function normalizarDetalleTmdb(json) {
    const serie = Boolean(json.name && !json.title);
    const trailer = elegirTrailer(json.videos && json.videos.results);
    const titulo = json.title || json.name || "Sin título";
    const fecha = json.release_date || json.first_air_date || "";

    return {
      id: "tmdb-" + (serie ? "tv" : "movie") + "-" + json.id,
      origen: "tmdb",
      tipoRaw: serie ? "tv" : "movie",
      titulo,
      anio: fecha.slice(0, 4) || "—",
      tipo: serie ? "series" : "movie",
      poster: json.poster_path ? POSTER_BASE + json.poster_path : null,
      rating: json.vote_average || null,
      votos: json.vote_count ? json.vote_count.toLocaleString("es-ES") : null,
      duracion: json.runtime || (json.episode_run_time && json.episode_run_time[0]) || null,
      generos: (json.genres || []).map((g) => g.name).join(", ") || null,
      idiomas: (json.spoken_languages || []).map((l) => l.name).join(", ") || null,
      paises: (json.production_countries || []).map((c) => c.name).join(", ") || null,
      estreno: fecha || null,
      sinopsis: json.overview || null,
      clasificacion: certificacionTmdb(json),
      temporadas: json.number_of_seasons || null,
      trailerKey: trailer ? trailer.key : null,
      trailerTipo: trailer ? trailer.type : null,
      trailerOficial: trailer
        ? "https://www.youtube.com/watch?v=" + trailer.key
        : null,
      busquedaTrailer:
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(titulo + " " + fecha.slice(0, 4) + " trailer"),
      imdbId: (json.external_ids && json.external_ids.imdb_id) || null,
      reparto: repartoTmdb(json),
      director: directorTmdb(json),
      proveedores: proveedoresTmdb(json),
      similares: similaresTmdb(json),
      galeria: galeriaTmdb(json),
    };
  }

  /* Órdenes admitidos por la barra de filtros. */
  const ORDENES = {
    popularidad: { movie: "popularity.desc", tv: "popularity.desc" },
    nota: { movie: "vote_average.desc", tv: "vote_average.desc" },
    novedad: { movie: "primary_release_date.desc", tv: "first_air_date.desc" },
    titulo: { movie: "original_title.asc", tv: "original_name.asc" },
  };

  function sortTmdb(tipo, orden) {
    const grupo = ORDENES[orden] || ORDENES.popularidad;
    return tipo === "movie" ? grupo.movie : grupo.tv;
  }

  function pathDescubrir(tipo, page, filtros) {
    const f = filtros || {};
    const esTv = tipo !== "movie";

    const partes = [
      "page=" + page,
      "paginas=" + PAGINAS_POR_VISTA,
      "sort_by=" + sortTmdb(tipo, f.orden),
    ];

    const generos = [];
    if (tipo === "anime") generos.push("16");
    if (f.genero && /^\d+$/.test(String(f.genero)) && String(f.genero) !== "16") {
      generos.push(String(f.genero));
    }
    if (generos.length) partes.push("with_genres=" + generos.join(","));

    if (f.anio && /^\d{4}$/.test(String(f.anio))) {
      partes.push((esTv ? "first_air_date_year=" : "primary_release_year=") + f.anio);
    }

    if (f.nota && /^\d+(\.\d+)?$/.test(String(f.nota))) {
      partes.push("vote_average.gte=" + f.nota);
    }

    /* Ordenar por nota sin un mínimo de votos llena la página de rarezas. */
    if (f.orden === "nota") partes.push("vote_count.gte=200");

    if (tipo === "anime") partes.push("with_origin_country=JP");

    return "/discover/" + (esTv ? "tv" : "movie") + "?" + partes.join("&");
  }

  function pathTrending(tipo) {
    if (tipo === "anime") {
      return "/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=1&paginas=1";
    }
    if (tipo === "series") return "/trending/tv/week";
    return "/trending/movie/week";
  }

  async function buscarTmdb({ query, page, tipo }) {
    const json = await tmdb(
      "/search/multi?query=" + encodeURIComponent(query) + "&page=" + page + "&paginas=" + PAGINAS_POR_VISTA
    );
    if (!json) return null;

    let items = (json.results || [])
      .filter((item) => item.media_type !== "person")
      .map(normalizarTmdb);

    if (tipo === "movie") items = items.filter((i) => i.tipoRaw === "movie");
    if (tipo === "series" || tipo === "anime") items = items.filter((i) => i.tipoRaw === "tv");

    return {
      items,
      page,
      total: json.total_results || items.length,
      totalPaginas: json.total_pages || 1,
      truncado: Boolean(json.truncado),
    };
  }

  async function listarTmdb({ tipo, page, filtros }) {
    const json = await tmdb(pathDescubrir(tipo, page, filtros));
    if (!json) return null;

    return {
      items: (json.results || []).map(normalizarTmdb),
      page,
      total: json.total_results || 0,
      totalPaginas: json.total_pages || 1,
      truncado: Boolean(json.truncado),
    };
  }

  async function recientesTmdb({ tipo, limite }) {
    const json = await tmdb(pathTrending(tipo));
    if (!json) return null;

    return (json.results || []).map(normalizarTmdb).slice(0, limite);
  }

  async function detalleTmdb(id) {
    const coincidencia = /^tmdb-(movie|tv)-(\d+)$/.exec(id);
    if (!coincidencia) return null;

    const json = await tmdb(
      "/" +
        coincidencia[1] +
        "/" +
        coincidencia[2] +
        "?append_to_response=videos,external_ids,content_ratings,release_dates,credits,similar,recommendations,images,watch/providers&include_image_language=es,en,null"
    );
    if (!json) return null;

    return normalizarDetalleTmdb(json);
  }

  /* ============================================================
   * OMDb (respaldo)
   * ========================================================== */

  const API_OMDB = "https://www.omdbapi.com/";
  /*
   * Clave de respaldo: solo se usa al abrir el sitio con doble clic
   * (file://) o si el servidor no tiene OMDB_API_KEY configurada.
   * Con el servidor en marcha, la clave viaja desde el servidor y el
   * navegador nunca la ve.
   */
  const API_KEY_OMDB = "a069f13a";

  /** Error claro cuando OMDb agota su cuota diaria (401 / «limit»). */
  function errorLimiteOmdb() {
    const error = new Error(
      "OMDb alcanzó su límite diario de peticiones. Abre el sitio con «npm start» " +
        "para usar el catálogo de TMDB, que no depende de OMDb."
    );
    error.codigo = "omdb-limite";
    return error;
  }

  function esLimiteOmdb(error) {
    return Boolean(error && error.codigo === "omdb-limite");
  }

  async function pedirOmdb(params) {
    const clave = JSON.stringify(params);
    const cacheado = cacheLeer("omdb:" + clave);
    if (cacheado) return cacheado;
    if (enVuelo.has(clave)) return enVuelo.get(clave);

    const usarProxy = await omdbDisponible();

    const promesa = limitar(async () => {
      const url = usarProxy ? new URL("/api/omdb", location.origin) : new URL(API_OMDB);
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
      }
      if (!usarProxy) url.searchParams.set("apikey", API_KEY_OMDB);

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
      const json = await res.json().catch(() => null);
      const detalle = json && json.Error ? String(json.Error) : "";

      if (!res.ok || !json) {
        if (res.status === 401 || /limit/i.test(detalle)) throw errorLimiteOmdb();
        throw new Error("OMDb respondió HTTP " + res.status);
      }

      if (json.Response === "False" && /limit/i.test(detalle)) throw errorLimiteOmdb();

      cacheEscribir("omdb:" + clave, json);
      return json;
    }).finally(() => enVuelo.delete(clave));

    enVuelo.set(clave, promesa);
    return promesa;
  }

  function normalizarOmdb(item) {
    return {
      id: item.imdbID,
      origen: "omdb",
      tipoRaw: item.Type === "series" ? "tv" : "movie",
      titulo: item.Title || "Sin título",
      anio: String(item.Year || "").slice(0, 4) || "—",
      tipo: item.Type || "movie",
      poster: item.Poster && item.Poster !== "N/A" ? item.Poster : null,
    };
  }

  const SEMILLAS_HOME = {
    movie: ["love", "life", "night", "dark", "dream"],
    series: ["love", "dark", "night", "city", "lost"],
    anime: ["naruto", "one piece", "attack on titan", "demon slayer", "dragon ball"],
  };

  const SEMILLAS_LISTADO = {
    movie: ["love", "man", "life", "batman", "star", "war", "night", "king", "dark", "fire", "city", "dream"],
    series: ["love", "man", "life", "dark", "king", "war", "night", "city", "dream", "lost", "girl", "home"],
    anime: [
      "naruto",
      "one piece",
      "attack on titan",
      "death note",
      "fullmetal",
      "bleach",
      "dragon ball",
      "my hero academia",
      "tokyo ghoul",
      "demon slayer",
      "jujutsu",
      "evangelion",
    ],
  };

  const RUIDO =
    /reaction|abridged|minecraft|review|podcast|behind the scenes|parody|recap|fan made|fan film|explained/i;

  function tipoOmdb(tipo) {
    return tipo === "anime" ? "series" : tipo;
  }

  async function buscarOmdb({ query, page, tipo }) {
    const params = { s: query, page };
    if (tipo) params.type = tipoOmdb(tipo);

    const datos = await pedirOmdb(params);

    if (datos.Response === "False") {
      return { items: [], page, total: 0, totalPaginas: 0, error: datos.Error || "Sin resultados" };
    }

    const items = (datos.Search || []).map(normalizarOmdb);
    const total = parseInt(datos.totalResults, 10) || items.length;

    return {
      items,
      page,
      total,
      totalPaginas: Math.min(100, Math.max(1, Math.ceil(total / 10))),
      truncado: total > Math.min(100, Math.max(1, Math.ceil(total / 10))) * 10,
    };
  }

  async function listarOmdb({ tipo, page }) {
    if (tipo === "anime") return listarAnimeOmdb(page);

    const semillas = SEMILLAS_LISTADO[tipo] || SEMILLAS_LISTADO.movie;
    const totalPaginas = semillas.length;
    const indice = (((page - 1) % totalPaginas) + totalPaginas) % totalPaginas;

    const datos = await pedirOmdb({ s: semillas[indice], page: 1, type: tipoOmdb(tipo) });

    if (datos.Response === "False") {
      return { items: [], page, totalPaginas, error: datos.Error || "Sin resultados" };
    }

    const items = (datos.Search || [])
      .map(normalizarOmdb)
      .sort((a, b) => (parseInt(b.anio, 10) || 0) - (parseInt(a.anio, 10) || 0));

    return { items, page, totalPaginas };
  }

  async function listarAnimeOmdb(page) {
    const semillas = SEMILLAS_LISTADO.anime;
    const porPagina = 3;
    const totalPaginas = Math.ceil(semillas.length / porPagina);
    const indice = (((page - 1) % totalPaginas) + totalPaginas) % totalPaginas;
    const grupo = semillas.slice(indice * porPagina, indice * porPagina + porPagina);

    const respuestas = await Promise.allSettled(
      grupo.map((semilla) => pedirOmdb({ s: semilla, page: 1, type: "series" }))
    );

    const listas = respuestas.map((respuesta) => {
      if (respuesta.status !== "fulfilled") return [];
      const datos = respuesta.value;
      if (datos.Response !== "True" || !Array.isArray(datos.Search)) return [];
      return datos.Search.map(normalizarOmdb)
        .filter((item) => !RUIDO.test(item.titulo))
        .slice(0, 3);
    });

    const items = [];
    const vistos = new Set();
    const maximo = listas.reduce((max, lista) => Math.max(max, lista.length), 0);

    for (let i = 0; i < maximo; i += 1) {
      for (const lista of listas) {
        const item = lista[i];
        if (!item || vistos.has(item.id)) continue;
        vistos.add(item.id);
        items.push(item);
      }
    }

    return { items, page, totalPaginas };
  }

  async function recientesOmdb({ tipo, semillas, limite }) {
    const lista = semillas || SEMILLAS_HOME[tipo] || SEMILLAS_HOME.movie;
    const type = tipoOmdb(tipo);

    const respuestas = await Promise.allSettled(
      lista.map((semilla) => pedirOmdb({ s: semilla, page: 1, type }))
    );

    const porSemilla = respuestas.map((respuesta) => {
      if (respuesta.status !== "fulfilled") return [];
      const datos = respuesta.value;
      if (datos.Response !== "True" || !Array.isArray(datos.Search)) return [];
      return datos.Search
        .filter((item) => item.imdbID)
        .map(normalizarOmdb)
        .filter((item) => !(tipo === "anime" && RUIDO.test(item.titulo)));
    });

    if (tipo === "anime") {
      const items = [];
      const vistos = new Set();
      const maximo = porSemilla.reduce((max, l) => Math.max(max, l.length), 0);

      for (let i = 0; i < maximo && items.length < limite; i += 1) {
        for (const listaSemilla of porSemilla) {
          const item = listaSemilla[i];
          if (!item || vistos.has(item.id)) continue;
          vistos.add(item.id);
          items.push(item);
          if (items.length >= limite) break;
        }
      }
      return items;
    }

    const unicos = new Map();
    for (const listaSemilla of porSemilla) {
      for (const item of listaSemilla) {
        if (!unicos.has(item.id)) unicos.set(item.id, item);
      }
    }

    return [...unicos.values()]
      .sort((a, b) => (parseInt(b.anio, 10) || 0) - (parseInt(a.anio, 10) || 0))
      .slice(0, limite);
  }

  async function detalleOmdb(id) {
    const datos = await pedirOmdb({ i: id, plot: "full" });

    if (datos.Response === "False") {
      throw new Error(datos.Error || "Título no encontrado");
    }

    const numero = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };

    return {
      id: datos.imdbID,
      origen: "omdb",
      tipoRaw: datos.Type === "series" ? "tv" : "movie",
      titulo: datos.Title || "Sin título",
      anio: datos.Year || "—",
      tipo: datos.Type || "movie",
      poster: datos.Poster && datos.Poster !== "N/A" ? datos.Poster : null,
      rating: datos.imdbRating && datos.imdbRating !== "N/A" ? datos.imdbRating : null,
      votos: datos.imdbVotes,
      duracion: datos.Runtime,
      generos: datos.Genre,
      idiomas: datos.Language,
      paises: datos.Country,
      estreno: datos.Released,
      sinopsis: datos.Plot,
      clasificacion: datos.Rated,
      temporadas: numero(datos.totalSeasons),
      trailerKey: null,
      trailerTipo: null,
      trailerOficial: null,
      busquedaTrailer:
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent((datos.Title || "") + " " + (datos.Year || "") + " trailer"),
      imdbId: datos.imdbID,
      reparto: (datos.Actors && datos.Actors !== "N/A" ? datos.Actors.split(", ") : []).map((nombre, i) => ({
        id: "omdb-" + i,
        nombre,
        personaje: null,
        foto: null,
      })),
      director: datos.Director && datos.Director !== "N/A" ? datos.Director : null,
      proveedores: null,
      similares: [],
      galeria: [],
    };
  }

  /* ============================================================
   * API pública: TMDB primero, OMDb como respaldo
   * ========================================================== */

  async function buscar(params) {
    const tmdbResultado = await buscarTmdb(params);
    return tmdbResultado || buscarOmdb(params);
  }

  async function listar(params) {
    const tmdbResultado = await listarTmdb(params);
    return tmdbResultado || listarOmdb(params);
  }

  async function recientes(params) {
    const tmdbResultado = await recientesTmdb(params);
    return tmdbResultado || recientesOmdb(params);
  }

  async function detalle(id) {
    if (id.startsWith("tmdb-")) {
      const tmdbResultado = await detalleTmdb(id);
      if (tmdbResultado) return tmdbResultado;
      throw new Error("No se pudo cargar la ficha desde el servidor.");
    }
    return detalleOmdb(id);
  }

  CINEMA.api = {
    buscar,
    listar,
    recientes,
    detalle,
    esLimiteOmdb,
    tmdbListo: tmdbDisponible,
    SEMILLAS_HOME,
    SEMILLAS_LISTADO,
    USAR_SERVIDOR,
  };
})();
