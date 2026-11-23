/**
 * CINEMA · configuración del servidor
 * ------------------------------------------------------------
 * Credenciales, rutas y límites. Nada de esto se envía al navegador.
 * `configuracion()` se llama al cargar el servidor, así que las variables
 * de entorno se leen frescas en cada arranque.
 */
"use strict";

const path = require("path");

/* Raíz web: el contenido público vive en frontend/, separado del backend. */
const RAIZ = path.join(__dirname, "..", "frontend");

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PAGINAS_FUSION = 5;
const TAMANO_PAGINA_TMDB = 20;

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

function configuracion() {
  const credenciales = leerConfig();

  return {
    puerto: parseInt(process.env.PORT, 10) || 8080,
    raiz: RAIZ,
    tmdb: credenciales.tmdb,
    omdb: credenciales.omdb,
    esToken: Boolean(credenciales.tmdb && credenciales.tmdb.startsWith("eyJ")),
    tmdbBase: process.env.TMDB_BASE || "https://api.themoviedb.org/3",
    omdbBase: process.env.OMDB_BASE || "https://www.omdbapi.com/",
    idioma: process.env.TMDB_LANGUAGE || "es-ES",
    cacheTtlMs: CACHE_TTL_MS,
    maxPaginasFusion: MAX_PAGINAS_FUSION,
    tamanoPaginaTmdb: TAMANO_PAGINA_TMDB,
  };
}

/*
 * TMDB acepta dos credenciales:
 *   - API Key v3  -> 32 caracteres, viaja en ?api_key=...
 *   - Read Access Token v4 -> empieza por "eyJ" (JWT), viaja en la
 *     cabecera Authorization: Bearer ...
 */
function cabecerasTmdb(config) {
  const cabeceras = { accept: "application/json" };
  if (config.esToken) cabeceras.Authorization = "Bearer " + config.tmdb;
  return cabeceras;
}

module.exports = {
  RAIZ,
  CACHE_TTL_MS,
  MAX_PAGINAS_FUSION,
  TAMANO_PAGINA_TMDB,
  leerConfig,
  configuracion,
  cabecerasTmdb,
};
