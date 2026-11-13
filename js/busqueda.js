/**
 * CINEMA · página de resultados de búsqueda con paginación real.
 */
(function () {
  "use strict";

  const { api, ui, buscador, historial } = window.CINEMA;

  const resultado = document.getElementById("resultado");
  const chevron = document.getElementById("chevron");
  const anterior = document.getElementById("anterior");
  const siguiente = document.getElementById("siguiente");
  const paginacion = document.getElementById("paginacion");
  const titulo = document.getElementById("tituloResultados");
  const aviso = document.getElementById("avisoBusqueda");

  const MINIMO = (historial && historial.MINIMO) || 2;

  const estado = { query: "", page: 1, totalPaginas: 0 };
  let tokenActual = 0;

  ui.activarNavegacion(resultado);

  function mostrarAviso(texto) {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.classList.remove("oculto");
  }

  function ocultarAviso() {
    if (!aviso) return;
    aviso.textContent = "";
    aviso.classList.add("oculto");
  }

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
    const texto = String(query == null ? "" : query).replace(/\s+/g, " ").trim();
    if (!texto) return;

    const token = ++tokenActual;
    estado.query = texto;
    estado.page = page;

    if (texto.length < MINIMO) {
      estado.totalPaginas = 0;
      if (titulo) titulo.textContent = "Buscar";
      document.title = "Buscar | CINEMA";
      mostrarAviso("Escribe al menos " + MINIMO + " letras para buscar.");
      ui.pintarEstado(resultado, "La búsqueda necesita al menos " + MINIMO + " letras.");
      actualizarControles();
      sincronizarUrl();
      if (resultado) resultado.setAttribute("aria-busy", "false");
      return;
    }

    if (historial) historial.registrar(texto);

    if (titulo) titulo.textContent = 'Resultados para "' + texto + '"';
    document.title = 'Resultados para "' + texto + '" | CINEMA';
    ocultarAviso();

    ui.pintarCargando(resultado, 10);
    if (resultado) resultado.setAttribute("aria-busy", "true");
    if (chevron) chevron.classList.add("oculto");

    try {
      const datos = await api.buscar({ query: texto, page });
      if (token !== tokenActual) return;

      estado.totalPaginas = datos.items.length ? datos.totalPaginas : 0;

      if (!datos.items.length) {
        const mensaje =
          datos.error === "Too many results."
            ? '"' + texto + '" es un término demasiado común. Prueba con algo más específico.'
            : 'No se encontraron resultados para "' + texto + '".';
        ui.pintarEstado(resultado, mensaje);
      } else {
        ui.pintarTarjetas(resultado, datos.items);
        if (datos.truncado) {
          mostrarAviso(
            "Hay muchísimos resultados: solo mostramos los primeros. " +
              "Añade más palabras para afinar la búsqueda."
          );
        }
      }
    } catch (error) {
      if (token !== tokenActual) return;
      console.error("Error de búsqueda:", error);
      estado.totalPaginas = 0;
      ocultarAviso();
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
