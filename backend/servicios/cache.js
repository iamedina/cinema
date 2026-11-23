/**
 * Caché en memoria compartida por los dos proxies.
 * Se crea una instancia por arranque del servidor.
 */
"use strict";

function crearCache(ttlMs) {
  const datos = new Map();

  return {
    leer(clave) {
      const entrada = datos.get(clave);
      if (!entrada) return null;
      if (Date.now() - entrada.t > ttlMs) {
        datos.delete(clave);
        return null;
      }
      return entrada.v;
    },

    escribir(clave, valor) {
      if (datos.size > 400) {
        const primero = datos.keys().next().value;
        datos.delete(primero);
      }
      datos.set(clave, { t: Date.now(), v: valor });
    },
  };
}

module.exports = { crearCache };
