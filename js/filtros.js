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

  function construir(tipo, estado) {
    const generos = CINEMA.generos
      .para(tipo)
      .filter((genero) => !(tipo === "anime" && genero.id === "16"))
      .map((genero) => [genero.id, genero.nombre]);

    const form = document.createElement("form");
    form.className = "barra-filtros";
    form.id = "barraFiltros";
    form.setAttribute("role", "search");
    form.setAttribute("aria-label", "Filtros del catálogo");

    form.innerHTML =
      '<label class="filtro">' +
      '<span class="filtro-etiqueta">Género</span>' +
      '<select class="filtro-select" name="genero">' +
      opciones([["", "Todos"], ...generos], estado.genero) +
      "</select>" +
      "</label>" +
      '<label class="filtro">' +
      '<span class="filtro-etiqueta">Año</span>' +
      '<select class="filtro-select" name="anio">' +
      opciones(anios(), estado.anio) +
      "</select>" +
      "</label>" +
      '<label class="filtro">' +
      '<span class="filtro-etiqueta">Ordenar por</span>' +
      '<select class="filtro-select" name="orden">' +
      opciones(ORDENES, estado.orden || "popularidad") +
      "</select>" +
      "</label>" +
      '<label class="filtro">' +
      '<span class="filtro-etiqueta">Nota mínima</span>' +
      '<select class="filtro-select" name="nota">' +
      opciones(NOTAS, estado.nota) +
      "</select>" +
      "</label>" +
      '<button type="button" class="filtro-limpiar" id="limpiarFiltros">Limpiar</button>';

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

  function actualizarLimpiar(form) {
    const boton = form.querySelector("#limpiarFiltros");
    if (!boton) return;
    boton.disabled = Object.keys(leerFormulario(form)).length === 0;
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

    const form = construir(tipo, leer());
    actualizarLimpiar(form);

    const aplicar = (estado) => {
      escribir(estado);
      actualizarLimpiar(form);
      if (typeof alCambiar === "function") alCambiar(estado);
    };

    form.addEventListener("submit", (evento) => evento.preventDefault());

    form.addEventListener("change", () => aplicar(leerFormulario(form)));

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

  CINEMA.filtros = { init, leer, escribir, CLAVES };
})();
