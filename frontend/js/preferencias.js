/**
 * CINEMA · preferencias del sitio
 * ------------------------------------------------------------
 * Guarda los ajustes del usuario en localStorage, con valores por
 * defecto seguros. No depende de js/almacen.js para poder cargarse
 * en el <head> y aplicar el tamaño de texto antes del primer pintado.
 *
 * - Clave global (no va por perfil): cinema:ajustes:v1
 * - Nunca lanza: si el navegador bloquea el almacenamiento, se usan
 *   los valores por defecto durante esa visita.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  const CLAVE = "cinema:ajustes:v1";
  const VERSION = 1;

  const REGIONES = [
    { id: "MX", nombre: "México" },
    { id: "ES", nombre: "España" },
    { id: "AR", nombre: "Argentina" },
    { id: "CO", nombre: "Colombia" },
    { id: "CL", nombre: "Chile" },
    { id: "PE", nombre: "Perú" },
    { id: "US", nombre: "Estados Unidos" },
  ];

  const ORDENES = [
    { id: "latino", nombre: "Latino → España → Inglés" },
    { id: "espana", nombre: "España → Latino → Inglés" },
    { id: "ingles", nombre: "Inglés → Latino → España" },
    { id: "solo-oficial", nombre: "Solo tráilers oficiales" },
  ];

  const REANUDACIONES = [
    { id: "preguntar", nombre: "Preguntar al abrir" },
    { id: "automatica", nombre: "Reanudar automáticamente" },
    { id: "inicio", nombre: "Empezar desde el inicio" },
  ];

  const DEFECTOS = Object.freeze({
    reducirAnimaciones: false,
    textoGrande: false,
    ordenTrailer: "latino",
    cargarTrailer: true,
    region: "MX",
    recordarProgreso: true,
    reanudacion: "preguntar",
  });

  const oyentes = [];
  let memoria = null;

  function esObjeto(valor) {
    return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
  }

  function opcionValida(lista, valor, defecto) {
    return lista.some((opcion) => opcion.id === valor) ? valor : defecto;
  }

  /** Deja cualquier entrada en un estado seguro y completo. */
  function normalizar(valor) {
    const base = esObjeto(valor) ? valor : {};

    return {
      reducirAnimaciones: base.reducirAnimaciones === true,
      textoGrande: base.textoGrande === true,
      ordenTrailer: opcionValida(ORDENES, base.ordenTrailer, DEFECTOS.ordenTrailer),
      cargarTrailer: base.cargarTrailer !== false,
      region: opcionValida(REGIONES, base.region, DEFECTOS.region),
      recordarProgreso: base.recordarProgreso !== false,
      reanudacion: opcionValida(REANUDACIONES, base.reanudacion, DEFECTOS.reanudacion),
    };
  }

  function leerCrudo() {
    try {
      const crudo = window.localStorage.getItem(CLAVE);
      return crudo ? JSON.parse(crudo) : null;
    } catch {
      return null;
    }
  }

  function leer() {
    if (!memoria) memoria = normalizar(leerCrudo());
    return { ...memoria };
  }

  /** Aplica al <html> las clases que cambian el aspecto. */
  function aplicar(valor) {
    if (typeof document === "undefined" || !document.documentElement) return;

    const prefs = normalizar(valor);
    const raiz = document.documentElement;
    raiz.classList.toggle("texto-grande", prefs.textoGrande);
    raiz.classList.toggle("reducir-animaciones", prefs.reducirAnimaciones);
  }

  function notificar(valor) {
    const copia = { ...valor };
    for (const callback of oyentes) {
      try {
        callback(copia);
      } catch (error) {
        console.error("CINEMA · error en un oyente de preferencias:", error);
      }
    }
  }

  /** Guarda solo las claves indicadas y devuelve el estado completo. */
  function guardar(parcial) {
    const prefs = normalizar({ ...leer(), ...(esObjeto(parcial) ? parcial : {}) });
    memoria = prefs;

    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(prefs));
    } catch (error) {
      console.warn("CINEMA · no se pudieron guardar los ajustes:", error.message);
    }

    aplicar(prefs);
    notificar(prefs);
    return { ...prefs };
  }

  function restablecer() {
    return guardar(DEFECTOS);
  }

  /** Vuelve a leer de localStorage (por ejemplo, tras importar datos). */
  function recargar() {
    memoria = normalizar(leerCrudo());
    aplicar(memoria);
    notificar(memoria);
    return { ...memoria };
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
  window.addEventListener("storage", (evento) => {
    if (!evento || evento.key !== CLAVE) return;

    let valor = null;
    try {
      valor = evento.newValue ? JSON.parse(evento.newValue) : null;
    } catch {
      valor = null;
    }

    memoria = normalizar(valor);
    aplicar(memoria);
    notificar(memoria);
  });

  CINEMA.preferencias = {
    CLAVE,
    VERSION,
    DEFECTOS,
    REGIONES,
    ORDENES,
    REANUDACIONES,
    normalizar,
    leer,
    guardar,
    restablecer,
    recargar,
    aplicar,
    alCambiar,
  };

  /* Aplica el tamaño de texto y el movimiento antes de pintar. */
  aplicar(leer());
})();
