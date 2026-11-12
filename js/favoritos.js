/**
 * CINEMA · favoritos («Mi lista»)
 * ------------------------------------------------------------
 * Guarda la ficha completa de cada título, no solo el id: así la
 * página de favoritos funciona al instante y sin pedir nada a la API.
 *
 * El corazón de cada tarjeta se pinta desde js/ui.js y este módulo
 * solo se encarga de su estado, del contador y de los cambios.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});
  const almacen = CINEMA.almacen;

  const NOMBRE = "favoritos";
  const VERSION = 1;

  const oyentes = [];

  /* ============================================================
   * Estado
   * ========================================================== */

  function esItemValido(item) {
    return Boolean(item) && typeof item.id === "string" && item.id.length > 0 && typeof item.titulo === "string";
  }

  /** Deja la lista en un estado seguro: sin duplicados y ordenada. */
  function limpiar(valor) {
    if (!Array.isArray(valor)) return [];

    const vistos = new Set();
    const salida = [];

    for (const item of valor) {
      if (!esItemValido(item) || vistos.has(item.id)) continue;
      vistos.add(item.id);
      salida.push({
        id: item.id,
        titulo: item.titulo,
        anio: item.anio || "—",
        tipo: item.tipo || "movie",
        poster: item.poster || null,
        agregado: Number(item.agregado) || 0,
      });
    }

    return salida.sort((a, b) => b.agregado - a.agregado);
  }

  let lista = limpiar(almacen.leer(NOMBRE, [], VERSION));

  function guardar() {
    almacen.escribir(NOMBRE, lista, VERSION);
  }

  function notificar(origen) {
    actualizarContadores();
    for (const callback of oyentes) {
      try {
        callback(origen);
      } catch (error) {
        console.error("CINEMA · error en un oyente de favoritos:", error);
      }
    }
  }

  /* ============================================================
   * Consultas
   * ========================================================== */

  function esFavorito(id) {
    return lista.some((item) => item.id === id);
  }

  function total() {
    return lista.length;
  }

  function listaFavoritos() {
    return lista.map((item) => ({ ...item }));
  }

  /* ============================================================
   * Cambios
   * ========================================================== */

  function agregar(item) {
    if (!esItemValido(item) || esFavorito(item.id)) return false;
    lista.unshift({
      id: item.id,
      titulo: item.titulo,
      anio: item.anio || "—",
      tipo: item.tipo || "movie",
      poster: item.poster || null,
      agregado: Date.now(),
    });
    guardar();
    notificar("local");
    return true;
  }

  function quitar(id) {
    const antes = lista.length;
    lista = lista.filter((item) => item.id !== id);
    if (lista.length === antes) return false;
    guardar();
    notificar("local");
    return true;
  }

  /** Devuelve true si el título queda guardado tras la operación. */
  function alternar(item) {
    if (!esItemValido(item)) return false;
    if (esFavorito(item.id)) {
      quitar(item.id);
      return false;
    }
    agregar(item);
    return true;
  }

  function vaciar() {
    if (!lista.length) return;
    lista = [];
    guardar();
    notificar("local");
  }

  /* ============================================================
   * Botones del corazón
   * ========================================================== */

  function aplicarBoton(boton) {
    const id = boton.dataset.favId;
    const activo = esFavorito(id);
    const titulo = boton.dataset.titulo || "este título";

    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
    boton.setAttribute("aria-label", (activo ? "Quitar " + titulo + " de Mi lista" : "Añadir " + titulo + " a Mi lista"));
    boton.title = activo ? "Quitar de Mi lista" : "Añadir a Mi lista";

    const icono = boton.querySelector("i");
    if (icono) icono.className = activo ? "bi bi-heart-fill" : "bi bi-heart";
  }

  /** Marca todos los corazones dentro de un contenedor (o del documento). */
  function aplicarEstado(raiz) {
    const contenedor = raiz || document;
    contenedor.querySelectorAll(".fav-btn").forEach(aplicarBoton);
  }

  function itemDesdeBoton(boton) {
    return {
      id: boton.dataset.favId,
      titulo: boton.dataset.titulo,
      anio: boton.dataset.anio,
      tipo: boton.dataset.tipo,
      poster: boton.dataset.poster || null,
    };
  }

  function alternarDesdeBoton(boton) {
    alternar(itemDesdeBoton(boton));
    aplicarBoton(boton);
  }

  /* Delegación en captura: el clic en el corazón no debe abrir la ficha. */
  document.addEventListener(
    "click",
    (evento) => {
      const objetivo = evento.target;
      const boton = objetivo && objetivo.closest ? objetivo.closest(".fav-btn") : null;
      if (!boton) return;
      evento.preventDefault();
      evento.stopPropagation();
      alternarDesdeBoton(boton);
    },
    true
  );

  /* ============================================================
   * Contador de la cabecera
   * ========================================================== */

  function actualizarContadores() {
    const elementos = document.querySelectorAll("[data-contador-favoritos]");
    const cantidad = lista.length;
    elementos.forEach((elemento) => {
      elemento.textContent = String(cantidad);
      elemento.hidden = cantidad === 0;
    });
  }

  /* ============================================================
   * Suscripción a cambios
   * ========================================================== */

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
    aplicarEstado(document);
    notificar("storage");
  });

  actualizarContadores();

  CINEMA.favoritos = {
    NOMBRE,
    esFavorito,
    total,
    lista: listaFavoritos,
    agregar,
    quitar,
    alternar,
    vaciar,
    aplicarEstado,
    alCambiar,
  };
})();
