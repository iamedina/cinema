/**
 * CINEMA · almacenamiento local
 * ------------------------------------------------------------
 * Un único punto de acceso a localStorage para todo el sitio.
 *
 * - Claves versionadas:  cinema:<nombre>:v<versión>
 * - Nunca lanza: si el navegador bloquea el almacenamiento (modo
 *   privado, cuota llena, file:// restringido) devuelve el valor por
 *   defecto y el sitio sigue funcionando.
 * - Avisa de cambios hechos en otras pestañas con el evento storage.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  const PREFIJO = "cinema:";

  let soportado = null;

  /** Comprueba una sola vez si localStorage se puede usar de verdad. */
  function hayAlmacen() {
    if (soportado !== null) return soportado;
    try {
      const prueba = PREFIJO + "__prueba__";
      window.localStorage.setItem(prueba, "1");
      window.localStorage.removeItem(prueba);
      soportado = true;
    } catch {
      soportado = false;
    }
    return soportado;
  }

  function clave(nombre, version) {
    return PREFIJO + nombre + ":v" + (version || 1);
  }

  function leer(nombre, defecto, version) {
    if (!hayAlmacen()) return defecto;
    try {
      const crudo = window.localStorage.getItem(clave(nombre, version));
      if (crudo === null) return defecto;
      const valor = JSON.parse(crudo);
      return valor === null || valor === undefined ? defecto : valor;
    } catch (error) {
      console.warn("CINEMA · no se pudo leer «" + nombre + "»:", error.message);
      return defecto;
    }
  }

  function escribir(nombre, valor, version) {
    if (!hayAlmacen()) return false;
    try {
      window.localStorage.setItem(clave(nombre, version), JSON.stringify(valor));
      return true;
    } catch (error) {
      /* Cuota llena o modo privado: se pierde el guardado, no la página. */
      console.warn("CINEMA · no se pudo guardar «" + nombre + "»:", error.message);
      return false;
    }
  }

  function borrar(nombre, version) {
    if (!hayAlmacen()) return false;
    try {
      window.localStorage.removeItem(clave(nombre, version));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escucha cambios de cualquier clave del sitio hechos en OTRA pestaña.
   * El callback recibe { nombre, version, valor }.
   */
  function alCambiar(callback) {
    if (typeof callback !== "function") return;

    window.addEventListener("storage", (evento) => {
      if (!evento.key || evento.key.indexOf(PREFIJO) !== 0) return;

      const partes = /^cinema:([^:]+):v(\d+)$/.exec(evento.key);
      let valor = null;
      try {
        valor = evento.newValue ? JSON.parse(evento.newValue) : null;
      } catch {
        valor = null;
      }

      callback({
        nombre: partes ? partes[1] : null,
        version: partes ? Number(partes[2]) : 1,
        valor,
      });
    });
  }

  CINEMA.almacen = {
    PREFIJO,
    disponible: hayAlmacen,
    clave,
    leer,
    escribir,
    borrar,
    alCambiar,
  };
})();
