/**
 * CINEMA · página de resultados de búsqueda con paginación real.
 */
(function () {
  "use strict";

  const { api, ui, buscador } = window.CINEMA;

  const resultado = document.getElementById("resultado");
  const chevron = document.getElementById("chevron");
  const anterior = document.getElementById("anterior");
  const siguiente = document.getElementById("siguiente");
  const paginacion = document.getElementById("paginacion");
  const titulo = document.getElementById("tituloResultados");

  const estado = { query: "", page: 1, totalPaginas: 0 };
  let tokenActual = 0;

  ui.activarNavegacion(resultado);

  function actualizarControles() {
    if (!chevron) return;
    const hayPaginas = estado.totalPaginas > 1;
    chevron.classList.toggle("oculto", !hayPaginas);
    if (anterior) anterior.disabled = estado.page <= 1;
    if (siguiente) siguiente.disabled = estado.page >= estado.totalPaginas;
    if (paginacion) {
      paginacion.textContent = hayPaginas ? "Página " + estado.page + " de " + estado.totalPaginas : "";
    }
  }

  function sincronizarUrl() {
    const params = new URLSearchParams(location.search);
    params.set("query", estado.query);
    if (estado.page > 1) params.set("page", String(estado.page));
    else params.delete("page");
    history.replaceState(null, "", location.pathname + "?" + params.toString());
  }

  async function ejecutar(query, page = 1, { scroll = true } = {}) {
    if (!query) return;

    const token = ++tokenActual;
    estado.query = query;
    estado.page = page;

    if (titulo) titulo.textContent = 'Resultados para "' + query + '"';

    ui.pintarCargando(resultado, 10);
    if (chevron) chevron.classList.add("oculto");

    try {
      const datos = await api.buscar({ query, page });
      if (token !== tokenActual) return;

      estado.totalPaginas = datos.items.length ? datos.totalPaginas : 0;

      if (!datos.items.length) {
        const mensaje =
          datos.error === "Too many results."
            ? '"' + query + '" es un término demasiado común. Prueba con algo más específico.'
            : 'No se encontraron resultados para "' + query + '".';
        ui.pintarEstado(resultado, mensaje);
      } else {
        ui.pintarTarjetas(resultado, datos.items);
      }
    } catch (error) {
      if (token !== tokenActual) return;
      console.error("Error de búsqueda:", error);
      estado.totalPaginas = 0;
      ui.pintarEstado(resultado, "No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      if (token === tokenActual) {
        actualizarControles();
        sincronizarUrl();
        if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  if (anterior) {
    anterior.addEventListener("click", () => {
      if (estado.page > 1) ejecutar(estado.query, estado.page - 1);
    });
  }

  if (siguiente) {
    siguiente.addEventListener("click", () => {
      if (estado.page < estado.totalPaginas) ejecutar(estado.query, estado.page + 1);
    });
  }

  const buscadorIniciado = buscador.init({ alBuscar: (consulta) => ejecutar(consulta, 1) });

  const params = new URLSearchParams(location.search);
  const queryInicial = params.get("query");
  const pageInicial = parseInt(params.get("page"), 10) || 1;

  if (buscadorIniciado && buscadorIniciado.input && queryInicial) {
    buscadorIniciado.input.value = queryInicial;
  }

  if (queryInicial) {
    ejecutar(queryInicial, pageInicial, { scroll: false });
  } else {
    actualizarControles();
    if (titulo) titulo.textContent = "Buscar";
    ui.pintarEstado(resultado, "Escribe un título arriba para empezar a buscar.");
  }
})();
