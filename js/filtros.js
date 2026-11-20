/**
 * CINEMA · barra de filtros de los listados
 * ------------------------------------------------------------
 * Los filtros viven en la URL (?genero=28&anio=2024&orden=nota&nota=7)
 * para que se puedan compartir y sobrevivir a una recarga.
 *
 * Solo se muestran cuando el catálogo de TMDB está disponible: OMDb
 * no admite filtros.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});
  const api = CINEMA.api;

  const CLAVES = ["genero", "anio", "orden", "nota"];

  const ORDENES = [
    ["popularidad", "Más populares"],
    ["nota", "Mejor valoradas"],
    ["novedad", "Más recientes"],
    ["titulo", "Título (A-Z)"],
  ];

  const NOTAS = [
    ["", "Cualquiera"],
    ["5", "5 o más"],
    ["6", "6 o más"],
    ["7", "7 o más"],
    ["8", "8 o más"],
    ["9", "9 o más"],
  ];

  /* ============================================================
   * URL
   * ========================================================== */

  function leer() {
    const params = new URLSearchParams(location.search);
    const estado = {};
    for (const clave of CLAVES) {
      const valor = params.get(clave);
      if (valor) estado[clave] = valor;
    }
    return estado;
  }

  function escribir(estado) {
    const params = new URLSearchParams(location.search);
    for (const clave of CLAVES) {
      if (estado[clave]) params.set(clave, estado[clave]);
      else params.delete(clave);
    }
    params.delete("page");

    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
  }

  /* ============================================================
   * Marcado
   * ========================================================== */

  function opciones(lista, seleccionado) {
    return lista
      .map(([valor, texto]) => {
        const activo = String(valor) === String(seleccionado || "") ? " selected" : "";
        return '<option value="' + valor + '"' + activo + ">" + texto + "</option>";
      })
      .join("");
  }

  function anios() {
    const actual = new Date().getFullYear();
    const lista = [["", "Cualquiera"]];
    for (let anio = actual; anio >= 1950; anio -= 1) lista.push([String(anio), String(anio)]);
    return lista;
  }

  const ICONOS = {
    genero: "bi-film",
    anio: "bi-calendar3",
    orden: "bi-sort-down",
    nota: "bi-star",
  };

  const NOMBRES = {
    genero: "Género",
    anio: "Año",
    orden: "Orden",
    nota: "Nota mínima",
  };

  function generosDe(tipo) {
    return CINEMA.generos
      .para(tipo)
      .filter((genero) => !(tipo === "anime" && genero.id === "16"));
  }

  /* Etiqueta legible para los chips de filtros activos. */
  function etiquetaFiltro(clave, valor, generos) {
    if (clave === "genero") {
      const encontrado = (generos || []).find((genero) => String(genero.id) === String(valor));
      return encontrado ? encontrado.nombre : String(valor);
    }
    if (clave === "orden") {
      const encontrado = ORDENES.find(([claveOrden]) => claveOrden === valor);
      return encontrado ? encontrado[1] : String(valor);
    }
    if (clave === "nota") return "Nota " + valor + " o más";
    return NOMBRES[clave] ? NOMBRES[clave] + ": " + valor : String(valor);
  }

  function esc(texto) {
    const entidades = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(texto).replace(/[&<>"']/g, (caracter) => entidades[caracter]);
  }

  function campo(nombre, etiqueta, opcionesHtml) {
    return (
      '<label class="filtro">' +
      '<span class="filtro-icono"><i class="bi ' + ICONOS[nombre] + '" aria-hidden="true"></i></span>' +
      '<span class="filtro-texto">' +
      '<span class="filtro-etiqueta">' + etiqueta + "</span>" +
      '<select class="filtro-select" name="' + nombre + '">' + opcionesHtml + "</select>" +
      "</span>" +
      "</label>"
    );
  }

  function construir(tipo, estado) {
    const pares = generosDe(tipo).map((genero) => [genero.id, genero.nombre]);

    const form = document.createElement("form");
    form.className = "barra-filtros";
    form.id = "barraFiltros";
    form.setAttribute("role", "search");
    form.setAttribute("aria-label", "Filtros del catálogo");

    form.innerHTML =
      '<div class="filtros-cabecera">' +
      '<div class="filtros-encabezado">' +
      '<span class="filtros-icono"><i class="bi bi-sliders2" aria-hidden="true"></i></span>' +
      "<div>" +
      '<p class="filtros-eyebrow">CINEMA · Catálogo</p>' +
      '<h3 class="filtros-titulo">Filtrar catálogo</h3>' +
      '<p class="filtros-subtitulo">Afina tu búsqueda</p>' +
      "</div>" +
      "</div>" +
      '<div class="filtros-herramientas">' +
      '<span class="filtros-contador" id="filtrosContador">0 activos</span>' +
      '<button type="button" class="filtro-limpiar" id="limpiarFiltros">' +
      '<i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Limpiar</button>' +
      "</div>" +
      "</div>" +
      '<div class="filtros-atajos" role="group" aria-label="Atajos de género">' +
      pares
        .map(([id, nombre]) => {
          const activo = String(estado.genero) === String(id);
          return (
            '<button type="button" class="chip-genero' +
            (activo ? " activo" : "") +
            '" data-genero="' +
            id +
            '" aria-pressed="' +
            activo +
            '"><i class="bi bi-tag" aria-hidden="true"></i> ' +
            nombre +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="filtros-campos">' +
      campo("genero", "Género", opciones([["", "Todos"], ...pares], estado.genero)) +
      campo("anio", "Año", opciones(anios(), estado.anio)) +
      campo("orden", "Ordenar por", opciones(ORDENES, estado.orden || "popularidad")) +
      campo("nota", "Nota mínima", opciones(NOTAS, estado.nota)) +
      "</div>" +
      '<div class="filtros-activos" id="filtrosActivos" aria-live="polite"></div>';

    return form;
  }

  function leerFormulario(form) {
    const datos = new FormData(form);
    const estado = {};
    for (const clave of CLAVES) {
      const valor = String(datos.get(clave) || "").trim();
      if (valor && !(clave === "orden" && valor === "popularidad")) estado[clave] = valor;
    }
    return estado;
  }

  function actualizarLimpiar(form, generos) {
    if (!form) return;

    const estado = leerFormulario(form);
    const cantidad = Object.keys(estado).length;

    const boton = form.querySelector("#limpiarFiltros");
    if (boton) boton.disabled = cantidad === 0;

    const contador = form.querySelector("#filtrosContador");
    if (contador) contador.textContent = cantidad + (cantidad === 1 ? " activo" : " activos");

    form.querySelectorAll(".filtro").forEach((etiqueta) => {
      const select = etiqueta.querySelector("select");
      const activo = Boolean(select && select.value && !(select.name === "orden" && select.value === "popularidad"));
      if (etiqueta.classList) etiqueta.classList.toggle("activo", activo);
    });

    form.querySelectorAll(".chip-genero").forEach((chip) => {
      const activo = chip.dataset.genero === estado.genero;
      chip.classList.toggle("activo", activo);
      chip.setAttribute("aria-pressed", String(activo));
    });

    const activos = form.querySelector("#filtrosActivos");
    if (activos) {
      activos.innerHTML = Object.keys(estado)
        .map((clave) => {
          const texto = esc(etiquetaFiltro(clave, estado[clave], generos));
          return (
            '<button type="button" class="filtro-activo" data-quitar="' +
            clave +
            '"><span>' +
            texto +
            '</span><i class="bi bi-x" aria-hidden="true"></i>' +
            '<span class="sr-only">Quitar ' +
            texto +
            "</span></button>"
          );
        })
        .join("");
    }
  }

  /* ============================================================
   * Inicialización
   * ========================================================== */

  async function init({ tipo, contenedor, alCambiar }) {
    if (!contenedor || !api || !api.USAR_SERVIDOR) return null;

    let disponible = false;
    try {
      disponible = await api.tmdbListo();
    } catch {
      disponible = false;
    }
    if (!disponible) return null;

    const generos = generosDe(tipo);
    const form = construir(tipo, leer());
    actualizarLimpiar(form, generos);

    const aplicar = (estado) => {
      escribir(estado);
      actualizarLimpiar(form, generos);
      if (typeof alCambiar === "function") alCambiar(estado);
    };

    form.addEventListener("submit", (evento) => evento.preventDefault());

    form.addEventListener("change", () => aplicar(leerFormulario(form)));

    form.querySelectorAll(".chip-genero").forEach((chip) => {
      chip.addEventListener("click", () => {
        const select = form.querySelector('select[name="genero"]');
        const valor = chip.dataset.genero;
        select.value = select.value === valor ? "" : valor;
        aplicar(leerFormulario(form));
      });
    });

    form.addEventListener("click", (evento) => {
      const quitar = evento.target.closest("[data-quitar]");
      if (!quitar) return;
      const select = form.querySelector('select[name="' + quitar.dataset.quitar + '"]');
      if (!select) return;
      select.value = select.name === "orden" ? "popularidad" : "";
      aplicar(leerFormulario(form));
    });

    form.querySelector("#limpiarFiltros").addEventListener("click", () => {
      /* form.reset() volvería a los valores con los que se pintó el
         formulario, así que vaciamos los selects a mano. */
      form.querySelectorAll("select").forEach((select) => {
        select.value = select.name === "orden" ? "popularidad" : "";
      });
      aplicar({});
    });

    contenedor.innerHTML = "";
    contenedor.appendChild(form);

    return { form, estado: leer() };
  }

  CINEMA.filtros = { init, leer, escribir, CLAVES, etiquetaFiltro };
})();
