/**
 * CINEMA · barra horizontal de filtros de los listados
 * ------------------------------------------------------------
 * Los filtros viven en la URL (?genero=28&anio=2024&orden=nota&nota=7)
 * para que se puedan compartir y sobrevivir a una recarga.
 *
 * Cada filtro es un desplegable propio dentro de una barra visible.
 * El valor real se guarda en un input oculto para que FormData siga
 * devolviendo el estado sin depender de un <select> nativo.
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

  const NOMBRES = {
    genero: "Género",
    anio: "Año",
    orden: "Orden",
    nota: "Nota mínima",
  };

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

  function esc(texto) {
    const entidades = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(texto).replace(/[&<>"']/g, (caracter) => entidades[caracter]);
  }

  function anios() {
    const actual = new Date().getFullYear();
    const lista = [["", "Cualquiera"]];
    for (let anio = actual; anio >= 1950; anio -= 1) lista.push([String(anio), String(anio)]);
    return lista;
  }

  function generosDe(tipo) {
    return CINEMA.generos
      .para(tipo)
      .filter((genero) => !(tipo === "anime" && genero.id === "16"));
  }

  /* Etiqueta legible de un filtro activo. */
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

  function textoDe(lista, valor) {
    const encontrado = lista.find(([opcion]) => String(opcion) === String(valor || ""));
    return encontrado ? encontrado[1] : "";
  }

  function opcionesMenu(lista, seleccionado) {
    return lista
      .map(([valor, texto]) => {
        const activo = String(valor) === String(seleccionado || "");
        return (
          '<button type="button" class="filtro-opcion" role="option" data-valor="' +
          esc(valor) +
          '" aria-selected="' +
          activo +
          '"><span>' +
          esc(texto) +
          "</span></button>"
        );
      })
      .join("");
  }

  function campo(nombre, etiqueta, lista, seleccionado) {
    const valor = nombre === "orden" && !seleccionado ? "popularidad" : seleccionado || "";
    const idMenu = "menu-" + nombre;

    return (
      '<div class="filtro" data-filtro="' + nombre + '">' +
      '<button type="button" class="filtro-disparador" aria-haspopup="listbox" aria-expanded="false" aria-controls="' +
      idMenu +
      '">' +
      '<span class="filtro-texto">' +
      '<span class="filtro-etiqueta">' +
      etiqueta +
      "</span>" +
      '<span class="filtro-valor" data-valor>' +
      esc(textoDe(lista, valor)) +
      "</span>" +
      "</span>" +
      '<span class="filtro-flecha" aria-hidden="true"></span>' +
      "</button>" +
      '<div class="filtro-menu" id="' +
      idMenu +
      '" role="listbox" aria-label="' +
      esc(etiqueta) +
      '" hidden>' +
      opcionesMenu(lista, valor) +
      "</div>" +
      '<input type="hidden" name="' +
      nombre +
      '" value="' +
      esc(valor) +
      '">' +
      "</div>"
    );
  }

  function construir(tipo, estado) {
    const pares = generosDe(tipo).map((genero) => [genero.id, genero.nombre]);

    const form = document.createElement("form");
    form.className = "filtros-barra";
    form.id = "barraFiltros";
    form.setAttribute("role", "search");
    form.setAttribute("aria-label", "Filtros del catálogo");

    form.innerHTML =
      '<div class="filtros-marca">' +
      "<span>" +
      '<span class="filtros-marca-titulo">Explorar</span>' +
      '<span class="filtros-marca-sub">Filtra el catálogo</span>' +
      "</span>" +
      "</div>" +
      '<div class="filtros-controles">' +
      campo("genero", "Género", [["", "Todos"], ...pares], estado.genero) +
      campo("anio", "Año", anios(), estado.anio) +
      campo("orden", "Ordenar por", ORDENES, estado.orden || "popularidad") +
      campo("nota", "Nota mínima", NOTAS, estado.nota) +
      "</div>" +
      '<div class="filtros-acciones">' +
      '<span class="filtros-contador" id="filtrosContador" hidden></span>' +
      '<button type="button" class="filtro-limpiar" id="limpiarFiltros" disabled>Limpiar</button>' +
      "</div>";

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
    if (!form) return;

    const estado = leerFormulario(form);
    const cantidad = Object.keys(estado).length;

    const boton = form.querySelector("#limpiarFiltros");
    if (boton) boton.disabled = cantidad === 0;

    const contador = form.querySelector("#filtrosContador");
    if (contador) {
      contador.textContent = cantidad + (cantidad === 1 ? " activo" : " activos");
      contador.hidden = cantidad === 0;
    }

    form.querySelectorAll(".filtro").forEach((filtro) => {
      const entrada = filtro.querySelector('input[type="hidden"]');
      const valor = entrada ? entrada.value : "";
      const activo = Boolean(valor && !(entrada && entrada.name === "orden" && valor === "popularidad"));

      filtro.classList.toggle("activo", activo);

      const opcion = filtro.querySelector('.filtro-opcion[data-valor="' + valor + '"]');
      const texto = filtro.querySelector("[data-valor]");
      if (texto) texto.textContent = opcion ? opcion.querySelector("span").textContent : valor;

      filtro.querySelectorAll(".filtro-opcion").forEach((item) => {
        item.setAttribute("aria-selected", String(item.dataset.valor === valor));
      });
    });
  }

  function cerrarMenus(form, excepto) {
    form.querySelectorAll(".filtro").forEach((filtro) => {
      if (filtro === excepto) return;
      const menu = filtro.querySelector(".filtro-menu");
      const disparador = filtro.querySelector(".filtro-disparador");
      if (menu) menu.hidden = true;
      if (disparador) disparador.setAttribute("aria-expanded", "false");
      filtro.classList.remove("abierto");
    });
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

    form.querySelectorAll(".filtro").forEach((filtro) => {
      const disparador = filtro.querySelector(".filtro-disparador");
      const menu = filtro.querySelector(".filtro-menu");
      const entrada = filtro.querySelector('input[type="hidden"]');

      disparador.addEventListener("click", () => {
        const abrir = menu.hidden;
        cerrarMenus(form, filtro);
        menu.hidden = !abrir;
        disparador.setAttribute("aria-expanded", String(abrir));
        filtro.classList.toggle("abierto", abrir);
      });

      menu.addEventListener("click", (evento) => {
        const opcion = evento.target.closest(".filtro-opcion");
        if (!opcion) return;
        entrada.value = opcion.dataset.valor;
        cerrarMenus(form);
        aplicar(leerFormulario(form));
      });
    });

    document.addEventListener("click", (evento) => {
      if (!form.contains(evento.target)) cerrarMenus(form);
    });

    document.addEventListener("keydown", (evento) => {
      if (evento.key !== "Escape") return;
      const abierto = form.querySelector(".filtro.abierto");
      if (!abierto) return;
      const disparador = abierto.querySelector(".filtro-disparador");
      cerrarMenus(form);
      if (disparador) disparador.focus();
    });

    form.querySelector("#limpiarFiltros").addEventListener("click", () => {
      form.querySelectorAll('input[type="hidden"]').forEach((entrada) => {
        entrada.value = entrada.name === "orden" ? "popularidad" : "";
      });
      aplicar({});
    });

    contenedor.innerHTML = "";
    contenedor.appendChild(form);

    return { form, estado: leer() };
  }

  CINEMA.filtros = { init, leer, escribir, CLAVES, etiquetaFiltro };
})();
