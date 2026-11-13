/**
 * CINEMA · páginas de listado: pelicula.html, serie.html y anime.html.
 * El tipo se lee de <body data-tipo="...">.
 *
 * La paginación numérica se mantiene. Los filtros (género, año, orden
 * y nota) viven en la URL y reinician la lista en la página 1.
 */
(function () {
  "use strict";

  const { api, ui, buscador, filtros: moduloFiltros } = window.CINEMA;

  const tipo = document.body.dataset.tipo || "movie";

  const resultado = document.getElementById("resultado");
  const chevron = document.getElementById("chevron");
  const anterior = document.getElementById("anterior");
  const siguiente = document.getElementById("siguiente");
  const paginacion = document.getElementById("paginacion");
  const resumen = document.getElementById("resumenListado");
  const contenedorFiltros = document.getElementById("filtros");

  let page = parseInt(new URLSearchParams(location.search).get("page"), 10) || 1;
  let totalPaginas = 0;
  let tokenActual = 0;
  let filtros = moduloFiltros ? moduloFiltros.leer() : {};

  ui.activarNavegacion(resultado);
  buscador.init();

  function actualizarControles() {
    if (!chevron) return;
    const hayPaginas = totalPaginas > 1;
    chevron.classList.toggle("oculto", !hayPaginas);
    if (anterior) anterior.disabled = page <= 1;
    if (siguiente) siguiente.disabled = page >= totalPaginas;
    if (paginacion) {
      paginacion.textContent = hayPaginas ? "Página " + page + " de " + totalPaginas : "";
    }
  }

  function sincronizarUrl() {
    const params = new URLSearchParams(location.search);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
  }

  function actualizarResumen(cantidad) {
    if (!resumen) return;
    resumen.textContent = cantidad ? cantidad + " títulos en esta página" : "";
  }

  async function cargar(pagina, { scroll = true } = {}) {
    const token = ++tokenActual;
    page = pagina;

    ui.pintarCargando(resultado, 10);
    if (resultado) resultado.setAttribute("aria-busy", "true");
    if (chevron) chevron.classList.add("oculto");
    actualizarResumen(0);

    try {
      const datos = await api.listar({ tipo, page: pagina, filtros });
      if (token !== tokenActual) return;

      totalPaginas = datos.totalPaginas;

      if (!datos.items.length) {
        const hayFiltros = Object.keys(filtros).length > 0;
        ui.pintarEstado(
          resultado,
          hayFiltros
            ? "No hay títulos con esos filtros. Prueba a quitarlos."
            : "No hay títulos disponibles ahora mismo.",
          hayFiltros
            ? {
                accion: {
                  texto: "Limpiar filtros",
                  alPulsar: () => {
                    const boton = document.getElementById("limpiarFiltros");
                    if (boton) boton.click();
                  },
                },
              }
            : undefined
        );
      } else {
        ui.pintarTarjetas(resultado, datos.items);
        actualizarResumen(datos.items.length);
      }
    } catch (error) {
      if (token !== tokenActual) return;
      console.error("Error al cargar el listado:", error);
      totalPaginas = 0;
      ui.pintarEstado(resultado, "No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      if (token === tokenActual) {
        actualizarControles();
        sincronizarUrl();
        if (resultado) resultado.setAttribute("aria-busy", "false");
        if (scroll) window.scrollTo({ top: 0, behavior: ui.reduceMovimiento() ? "auto" : "smooth" });
      }
    }
  }

  if (anterior) {
    anterior.addEventListener("click", () => {
      if (page > 1) cargar(page - 1);
    });
  }

  if (siguiente) {
    siguiente.addEventListener("click", () => {
      if (page < totalPaginas) cargar(page + 1);
    });
  }

  if (moduloFiltros && contenedorFiltros) {
    moduloFiltros.init({
      tipo,
      contenedor: contenedorFiltros,
      alCambiar: (nuevos) => {
        filtros = nuevos;
        cargar(1);
      },
    });
  }

  cargar(page);
})();
