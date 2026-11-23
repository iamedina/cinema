/**
 * Peticiones a APIs externas con límite de tiempo y un reintento corto.
 * Sin dependencias: usa AbortSignal.timeout de Node 18+.
 */
"use strict";

const TIEMPO_ESPERA_MS = 8000;
const REINTENTO_MS = 250;

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Devuelve la Response de fetch. Reintenta una sola vez si la API tarda
 * demasiado o responde 429/5xx (casos típicos de TMDB y OMDb).
 */
async function fetchConReintento(url, opciones = {}) {
  let ultima = null;

  for (let intento = 0; intento < 2; intento += 1) {
    try {
      const respuesta = await fetch(url, {
        ...opciones,
        signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
      });

      if (intento === 0 && (respuesta.status === 429 || respuesta.status >= 500)) {
        ultima = respuesta;
        await esperar(REINTENTO_MS);
        continue;
      }

      return respuesta;
    } catch (error) {
      if (intento === 0 && error.name === "TimeoutError") {
        await esperar(REINTENTO_MS);
        continue;
      }
      throw error;
    }
  }

  return ultima;
}

module.exports = { fetchConReintento, TIEMPO_ESPERA_MS, REINTENTO_MS };
