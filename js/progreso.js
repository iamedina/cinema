/**
 * CINEMA · progreso de reproducción («Seguir viendo»)
 * ------------------------------------------------------------
 * Guarda en localStorage dónde se quedó cada película de dominio
 * público: posición, duración, ficha y póster. Así la portada puede
 * ofrecer «Seguir viendo» y el reproductor puede reanudar.
 *
 * - Clave versionada mediante js/almacen.js (cinema:progreso:v1).
 * - Solo se guardan posiciones a partir de 5 segundos.
 * - Al pasar del 90 % la película queda marcada como vista y sale de
 *   «Seguir viendo», pero conserva la posición para la ficha.
 * - Nunca lanza: si el navegador bloquea el almacenamiento, el sitio
 *   sigue funcionando sin recordar el progreso.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});
  const almacen = CINEMA.almacen;

  const NOMBRE = "progreso";
  const VERSION = 1;
  const MINIMO = 5; // segundos: por debajo no merece la pena reanudar
  const UMBRAL_VISTO = 0.9;
  const MAXIMO = 40;

  const oyentes = [];

  /* ============================================================
   * Normalización
   * ========================================================== */

  function texto(valor, defecto) {
    const limpio = String(valor == null ? "" : valor).trim();
    return limpio || defecto;
  }

  function normalizar(item) {
    if (!item || typeof item.id !== "string" || !item.id) return null;

    const duracion = Math.max(0, Number(item.duracion) || 0);
    let posicion = Math.max(0, Number(item.posicion) || 0);
    if (duracion > 0) posicion = Math.min(posicion, duracion);

    const visto =
      item.visto === true || (duracion > 0 && posicion / duracion >= UMBRAL_VISTO);

    return {
      id: item.id,
      titulo: texto(item.titulo, "Título sin nombre"),
      anio: texto(item.anio, "—").slice(0, 4),
      poster: item.poster || null,
      posicion,
      duracion,
      visto,
      actualizado: Number(item.actualizado) || Date.now(),
    };
  }

  /** Lista segura: sin duplicados, ordenada de más reciente a más antigua. */
  function limpiar(valor) {
    if (!Array.isArray(valor)) return [];

    const vistos = new Set();
    const salida = [];

    for (const bruto of valor) {
      const item = normalizar(bruto);
      if (!item || vistos.has(item.id)) continue;
      vistos.add(item.id);
      salida.push(item);
    }

    return salida
      .sort((a, b) => b.actualizado - a.actualizado)
      .slice(0, MAXIMO);
  }

  let lista = limpiar(almacen.leer(NOMBRE, [], VERSION));

  function guardarEnDisco() {
    almacen.escribir(NOMBRE, lista, VERSION);
  }

  function notificar(origen) {
    for (const callback of oyentes) {
      try {
        callback(origen);
      } catch (error) {
        console.error("CINEMA · error en un oyente de progreso:", error);
      }
    }
  }

  /* ============================================================
   * Consultas
   * ========================================================== */

  function leer(id) {
    const encontrado = lista.find((item) => item.id === id);
    return encontrado ? { ...encontrado } : null;
  }

  function listaProgreso() {
    return lista.map((item) => ({ ...item }));
  }

  /** Películas empezadas y no terminadas, la más reciente primero. */
  function enCurso() {
    return lista
      .filter((item) => !item.visto && item.posicion >= MINIMO)
      .map((item) => ({ ...item }));
  }

  function porcentaje(item) {
    if (!item || !item.duracion) return 0;
    return Math.min(100, Math.max(0, (item.posicion / item.duracion) * 100));
  }

  function restante(item) {
    if (!item || !item.duracion) return 0;
    return Math.max(0, item.duracion - item.posicion);
  }

  /** 12:34 o 1:02:03, según la duración. */
  function formatear(segundos) {
    const total = Math.max(0, Math.floor(Number(segundos) || 0));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const segundosRestantes = total % 60;
    const dos = (n) => String(n).padStart(2, "0");

    if (horas > 0) return horas + ":" + dos(minutos) + ":" + dos(segundosRestantes);
    return minutos + ":" + dos(segundosRestantes);
  }

  /* ============================================================
   * Cambios
   * ========================================================== */

  /**
   * Guarda o actualiza una entrada. Devuelve true si se escribió.
   * Las posiciones por debajo de 5 s se ignoran (salvo que ya
   * existiera una entrada, para no borrarla al empezar de cero).
   */
  function guardar(datos) {
    const item = normalizar(datos);
    if (!item) return false;
    if (item.posicion < MINIMO && !item.visto) return false;

    item.actualizado = Date.now();
    const indice = lista.findIndex((existente) => existente.id === item.id);
    if (indice >= 0) lista[indice] = item;
    else lista.unshift(item);

    lista = lista
      .sort((a, b) => b.actualizado - a.actualizado)
      .slice(0, MAXIMO);

    guardarEnDisco();
    notificar("local");
    return true;
  }

  function quitar(id) {
    const antes = lista.length;
    lista = lista.filter((item) => item.id !== id);
    if (lista.length === antes) return false;
    guardarEnDisco();
    notificar("local");
    return true;
  }

  function vaciar() {
    if (!lista.length) return;
    lista = [];
    guardarEnDisco();
    notificar("local");
  }

  function alCambiar(callback) {
    if (typeof callback !== "function") return () => {};
    oyentes.push(callback);
    return () => {
      const indice = oyentes.indexOf(callback);
      if (indice >= 0) oyentes.splice(indice, 1);
    };
  }

  /* Cambios hechos en otra pestaña. */
  almacen.alCambiar(({ nombre, valor }) => {
    if (nombre !== NOMBRE) return;
    lista = limpiar(valor);
    notificar("storage");
  });

  CINEMA.progreso = {
    NOMBRE,
    MINIMO,
    UMBRAL_VISTO,
    normalizar,
    limpiar,
    leer,
    lista: listaProgreso,
    enCurso,
    porcentaje,
    restante,
    formatear,
    guardar,
    quitar,
    vaciar,
    alCambiar,
  };
})();
