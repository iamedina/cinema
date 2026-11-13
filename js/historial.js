/**
 * CINEMA · historial de búsquedas
 * ------------------------------------------------------------
 * Guarda las últimas búsquedas en localStorage para que el usuario
 * pueda repetirlas desde la cabecera.
 *
 * - Máximo 8 entradas, sin duplicados (sin distinguir mayúsculas).
 * - Las consultas de menos de 2 letras no se guardan.
 * - Nunca lanza: si el almacenamiento está bloqueado, el historial
 *   simplemente no persiste.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});
  const almacen = CINEMA.almacen;

  const NOMBRE = "historial";
  const VERSION = 1;
  const MAXIMO = 8;
  const MINIMO = 2;

  function normalizar(valor) {
    return String(valor == null ? "" : valor)
      .replace(/\s+/g, " ")
      .trim();
  }

  function claveDe(texto) {
    return texto.toLocaleLowerCase("es");
  }

  /** Deja cualquier lista en un estado seguro: válida, sin duplicados. */
  function limpiar(valor) {
    if (!Array.isArray(valor)) return [];

    const vistos = new Set();
    const salida = [];

    for (const bruto of valor) {
      const texto = normalizar(bruto);
      if (texto.length < MINIMO) continue;

      const clave = claveDe(texto);
      if (vistos.has(clave)) continue;

      vistos.add(clave);
      salida.push(texto);

      if (salida.length >= MAXIMO) break;
    }

    return salida;
  }

  let lista = limpiar(almacen.leer(NOMBRE, [], VERSION));

  function guardar() {
    almacen.escribir(NOMBRE, lista, VERSION);
  }

  function leer() {
    return lista.slice();
  }

  /** Guarda una consulta al principio. Devuelve true si se guardó. */
  function registrar(consulta) {
    const texto = normalizar(consulta);
    if (texto.length < MINIMO) return false;

    const clave = claveDe(texto);
    lista = [texto, ...lista.filter((item) => claveDe(item) !== clave)].slice(0, MAXIMO);
    guardar();
    return true;
  }

  function borrar() {
    if (!lista.length) return false;
    lista = [];
    almacen.borrar(NOMBRE, VERSION);
    return true;
  }

  /* Cambios hechos en otra pestaña. */
  almacen.alCambiar(({ nombre, valor }) => {
    if (nombre === NOMBRE) lista = limpiar(valor);
  });

  CINEMA.historial = {
    NOMBRE,
    VERSION,
    MINIMO,
    MAXIMO,
    normalizar,
    limpiar,
    leer,
    registrar,
    borrar,
  };
})();
