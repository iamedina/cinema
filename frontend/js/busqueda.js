/**
 * CINEMA · página de resultados de búsqueda con paginación real.
 * Si hay filtros activos, se buscan varias páginas de una vez, se filtran
 * en el cliente y se paginan localmente: TMDB no permite combinar
 * `search` con género, año o nota mínima en la misma llamada.
 */
(function () {
  "use strict";

  const { api, ui, buscador, historial } = window.CINEMA;
  const moduloFiltros = window.CINEMA.filtros;

  const resultado = document.getElementById("resultado");
  const chevron = document.getElementById("chevron");
  const anterior = document.getElementById("anterior");
  const siguiente = document.getElementById("siguiente");
  const paginacion = document.getElementById("paginacion");
  const titulo = document.getElementById("tituloResultados");
  const aviso = document.getElementById("avisoBusqueda");

  const MINIMO = (historial && historial.MINIMO) || 2;
  const POR_PAGINA = 12;
  const PAGINAS_A_CONSULTAR = [1, 2, 3];

  const estado = { query: "", page: 1, totalPaginas: 0 };
  let tokenActual = 0;
  let filtrosActivos = moduloFiltros && moduloFiltros.leer ? moduloFiltros.leer() : {};
  let cacheConFiltros = null;

  ui.activarNavegacion(resultado);

  function hayFiltros() {
    return Object.keys(filtrosActivos).length > 0;
  }

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
    ui.pintarPaginacion(paginacion, {
      pagina: estado.page,
      total: estado.totalPaginas,
      alIr: (destino) => ejecutar(estado.query, destino),
    });
  }

  function sincronizarUrl() {
    /* Parte de la URL actual: así se conservan las claves de los filtros
       que escribe filtros.js sin duplicar lógica de replaceState. */
    const params = new URLSearchParams(location.search);
    params.set("query", estado.query);
    if (estado.page > 1) params.set("page", String(estado.page));
    else params.delete("page");
    history.replaceState(null, "", location.pathname + "?" + params.toString());
  }

  /** Aplica los filtros visibles a los títulos ya normalizados por la API. */
  function aplicarFiltros(items, filtros) {
    let salida = (items || []).slice();

    if (filtros.genero) {
      salida = salida.filter((item) =>
        (item.generoIds || []).some((id) => String(id) === String(filtros.genero))
      );
    }
    if (filtros.anio) {
      salida = salida.filter((item) => String(item.anio) === String(filtros.anio));
    }
    if (filtros.nota) {
      salida = salida.filter((item) => Number(item.rating) >= Number(filtros.nota));
    }
    if (filtros.orden === "nota") {
      salida.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (filtros.orden === "novedad") {
      salida.sort((a, b) => String(b.anio).localeCompare(String(a.anio)));
    } else if (filtros.orden === "titulo") {
      salida.sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), "es"));
    }

    return salida;
  }

  /** Busca un bloque de resultados y lo reutiliza mientras no cambien filtros. */
  async function obtenerDatos(texto, page) {
    if (!hayFiltros()) return api.buscar({ query: texto, page });

    const firma = texto + "|" + JSON.stringify(filtrosActivos);
    if (!cacheConFiltros || cacheConFiltros.firma !== firma) {
      const respuestas = await Promise.all(
        PAGINAS_A_CONSULTAR.map((pagina) => api.buscar({ query: texto, page: pagina }))
      );

      const vistos = new Set();
      const todos = [];
      for (const respuesta of respuestas) {
        for (const item of (respuesta && respuesta.items) || []) {
          if (vistos.has(item.id)) continue;
          vistos.add(item.id);
          todos.push(item);
        }
      }

      cacheConFiltros = { firma, items: aplicarFiltros(todos, filtrosActivos) };
    }

    const inicio = (page - 1) * POR_PAGINA;
    return {
      items: cacheConFiltros.items.slice(inicio, inicio + POR_PAGINA),
      total: cacheConFiltros.items.length,
      totalPaginas: Math.max(1, Math.ceil(cacheConFiltros.items.length / POR_PAGINA)),
    };
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

    ui.pintarCargando(resultado, POR_PAGINA);
    if (resultado) resultado.setAttribute("aria-busy", "true");
    if (chevron) chevron.classList.add("oculto");

    try {
      const datos = await obtenerDatos(texto, page);
      if (token !== tokenActual) return;

      estado.totalPaginas = datos.items.length ? datos.totalPaginas : 0;

      if (!datos.items.length) {
        const mensaje = hayFiltros()
          ? "Ningún resultado cumple los filtros elegidos. Prueba a quitar alguno."
          : datos.error === "Too many results."
            ? '"' + texto + '" es un término demasiado común. Prueba con algo más específico.'
            : 'No se encontraron resultados para "' + texto + '".';
        ui.pintarEstado(resultado, mensaje);
      } else {
        ui.pintarTarjetas(resultado, datos.items);
        if (datos.truncado && !hayFiltros()) {
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
      ui.pintarEstado(
        resultado,
        api.esAvisoOmdb(error)
          ? error.message
          : "No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo."
      );
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

  const contenedorFiltros = document.getElementById("filtros");
  if (moduloFiltros && contenedorFiltros) {
    moduloFiltros.init({
      tipo: "todos",
      contenedor: contenedorFiltros,
      alCambiar: (nuevos) => {
        filtrosActivos = nuevos || {};
        cacheConFiltros = null;
        if (estado.query) ejecutar(estado.query, 1, { scroll: false });
      },
    });
  }

  if (queryInicial) {
    ejecutar(queryInicial, pageInicial, { scroll: false });
  } else {
    actualizarControles();
    if (titulo) titulo.textContent = "Buscar";
    ui.pintarEstado(resultado, "Escribe un título arriba para empezar a buscar.");
  }
})();
