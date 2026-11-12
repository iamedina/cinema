/**
 * CINEMA · páginas de listado: pelicula.html, serie.html y anime.html.
 * El tipo se lee de <body data-tipo="...">.
 */
(function () {
  "use strict";

  const { api, ui, buscador } = window.CINEMA;

  const tipo = document.body.dataset.tipo || "movie";

  const resultado = document.getElementById("resultado");
  const chevron = document.getElementById("chevron");
  const anterior = document.getElementById("anterior");
  const siguiente = document.getElementById("siguiente");
  const paginacion = document.getElementById("paginacion");

  let page = parseInt(new URLSearchParams(location.search).get("page"), 10) || 1;
  let totalPaginas = 0;
  let tokenActual = 0;

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

  async function cargar(pagina) {
    const token = ++tokenActual;
    page = pagina;

    ui.pintarCargando(resultado, 10);
    if (chevron) chevron.classList.add("oculto");

    try {
      const datos = await api.listar({ tipo, page: pagina });
      if (token !== tokenActual) return;

      totalPaginas = datos.totalPaginas;

      if (!datos.items.length) {
        ui.pintarEstado(resultado, "No hay títulos disponibles ahora mismo.");
      } else {
        ui.pintarTarjetas(resultado, datos.items);
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
        window.scrollTo({ top: 0, behavior: "smooth" });
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

  cargar(page);
})();
