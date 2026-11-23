/**
 * CINEMA · ficha de persona (persona.html?id=tmdb-person-...)
 * Biografía, datos personales y filmografía con paginación local.
 */
(function () {
  "use strict";

  const { api, ui, buscador } = window.CINEMA;
  const escapeHtml = ui.escapeHtml;

  const contenedor = document.getElementById("persona");
  const parametros = new URLSearchParams(location.search);
  const id = parametros.get("id");

  const POR_PAGINA = 24;
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  let filmografia = [];
  let pagina = Math.max(1, parseInt(parametros.get("page"), 10) || 1);
  let rejilla = null;
  let controles = null;
  let anterior = null;
  let siguiente = null;
  let paginacion = null;

  buscador.init();

  function mostrarEstado(mensaje, esError) {
    if (!contenedor) return;
    contenedor.innerHTML =
      '<p class="estado-vacio' + (esError ? " estado-error" : "") + '" role="status">' +
      escapeHtml(mensaje) +
      "</p>";
  }

  function fecha(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor || "");
    if (!partes) return valor || "";
    const mes = MESES[parseInt(partes[2], 10) - 1];
    return parseInt(partes[3], 10) + " de " + mes + " de " + partes[1];
  }

  function fotoGrande(url) {
    return url ? url.replace("/w185/", "/h632/") : null;
  }

  function metadatos(datos) {
    const filas = [];

    if (datos.nacimiento) {
      filas.push(
        '<li><i class="bi bi-cake2" aria-hidden="true"></i> ' + escapeHtml(fecha(datos.nacimiento)) + "</li>"
      );
    }
    if (datos.fallecimiento) {
      filas.push(
        '<li><i class="bi bi-flower1" aria-hidden="true"></i> Fallecimiento: ' +
          escapeHtml(fecha(datos.fallecimiento)) +
          "</li>"
      );
    }
    if (datos.lugar) {
      filas.push(
        '<li><i class="bi bi-geo-alt" aria-hidden="true"></i> ' + escapeHtml(datos.lugar) + "</li>"
      );
    }
    if (datos.departamento) {
      filas.push(
        '<li><i class="bi bi-person-badge" aria-hidden="true"></i> ' +
          escapeHtml(datos.departamento) +
          "</li>"
      );
    }

    return filas.length ? '<ul class="persona-meta">' + filas.join("") + "</ul>" : "";
  }

  function biografia(texto) {
    if (!texto) return "";
    const larga = texto.length > 700;
    return (
      '<div class="persona-bio">' +
      '<p id="personaBioTexto"' + (larga ? ' class="persona-bio-larga"' : "") + ">" +
      escapeHtml(texto) +
      "</p>" +
      (larga
        ? '<button type="button" class="persona-bio-toggle" id="personaBioToggle" aria-expanded="false">Leer más</button>'
        : "") +
      "</div>"
    );
  }

  function plantilla(datos) {
    const foto = fotoGrande(datos.foto);
    const retrato = foto
      ? '<img src="' + escapeHtml(foto) + '" alt="Foto de ' + escapeHtml(datos.nombre) + '" ' +
        'class="persona-foto" fetchpriority="high" decoding="async">'
      : '<span class="persona-foto persona-sin-foto" aria-hidden="true"><i class="bi bi-person-fill"></i></span>';

    const total = datos.filmografia.length;

    return (
      '<div class="persona-pagina">' +
      '<div class="persona-cabecera">' +
      '<div class="persona-retrato">' + retrato + "</div>" +
      '<div class="persona-datos">' +
      '<p class="section-subtitle">CINEMA · Personas</p>' +
      (datos.departamento
        ? '<p class="persona-departamento">' + escapeHtml(datos.departamento) + "</p>"
        : "") +
      "<h1>" + escapeHtml(datos.nombre) + "</h1>" +
      metadatos(datos) +
      biografia(datos.biografia) +
      "</div>" +
      "</div>" +
      '<section class="persona-filmografia" aria-labelledby="tituloFilmografia">' +
      '<h2 id="tituloFilmografia">Filmografía' +
      (total ? ' <span class="persona-cuenta">(' + total + ")</span>" : "") +
      "</h2>" +
      (total
        ? '<div id="filmografia" class="grid-persona" aria-busy="false"></div>' +
          '<section id="chevron" class="oculto">' +
          '<button type="button" id="anterior" aria-label="Página anterior">' +
          '<i class="bi bi-chevron-left" aria-hidden="true"></i></button>' +
          '<p id="paginacion" aria-live="polite"></p>' +
          '<button type="button" id="siguiente" aria-label="Página siguiente">' +
          '<i class="bi bi-chevron-right" aria-hidden="true"></i></button>' +
          "</section>"
        : '<p class="estado-vacio">No hay títulos registrados para esta persona.</p>') +
      "</section>" +
      "</div>"
    );
  }

  function actualizarUrl() {
    const params = new URLSearchParams(location.search);
    if (pagina > 1) params.set("page", String(pagina));
    else params.delete("page");
    history.replaceState(null, "", location.pathname + "?" + params.toString());
  }

  function pintarPagina() {
    if (!rejilla) return;

    const totalPaginas = Math.max(1, Math.ceil(filmografia.length / POR_PAGINA));
    if (pagina > totalPaginas) pagina = totalPaginas;

    const inicio = (pagina - 1) * POR_PAGINA;
    ui.pintarTarjetas(rejilla, filmografia.slice(inicio, inicio + POR_PAGINA));

    const hayPaginas = totalPaginas > 1;
    if (controles) controles.classList.toggle("oculto", !hayPaginas);
    if (anterior) anterior.disabled = pagina <= 1;
    if (siguiente) siguiente.disabled = pagina >= totalPaginas;
    ui.pintarPaginacion(paginacion, {
      pagina,
      total: totalPaginas,
      alIr: (destino) => irAPagina(destino),
    });
  }

  function irAPagina(destino) {
    const total = Math.max(1, Math.ceil(filmografia.length / POR_PAGINA));
    if (destino < 1 || destino > total || destino === pagina) return;
    pagina = destino;
    actualizarUrl();
    pintarPagina();
    const titulo = document.getElementById("tituloFilmografia");
    if (titulo) {
      titulo.scrollIntoView({ behavior: ui.reduceMovimiento() ? "auto" : "smooth" });
    }
  }

  function activarControles() {
    rejilla = document.getElementById("filmografia");
    controles = document.getElementById("chevron");
    anterior = document.getElementById("anterior");
    siguiente = document.getElementById("siguiente");
    paginacion = document.getElementById("paginacion");

    if (rejilla) ui.activarNavegacion(rejilla);

    if (anterior) {
      anterior.addEventListener("click", () => {
        if (pagina <= 1) return;
        pagina -= 1;
        actualizarUrl();
        pintarPagina();
        document.getElementById("tituloFilmografia").scrollIntoView({ behavior: ui.reduceMovimiento() ? "auto" : "smooth" });
      });
    }

    if (siguiente) {
      siguiente.addEventListener("click", () => {
        const totalPaginas = Math.max(1, Math.ceil(filmografia.length / POR_PAGINA));
        if (pagina >= totalPaginas) return;
        pagina += 1;
        actualizarUrl();
        pintarPagina();
        document.getElementById("tituloFilmografia").scrollIntoView({ behavior: ui.reduceMovimiento() ? "auto" : "smooth" });
      });
    }

    const botonBio = document.getElementById("personaBioToggle");
    const textoBio = document.getElementById("personaBioTexto");
    if (botonBio && textoBio) {
      botonBio.addEventListener("click", () => {
        const abierta = botonBio.getAttribute("aria-expanded") === "true";
        botonBio.setAttribute("aria-expanded", String(!abierta));
        textoBio.classList.toggle("persona-bio-abierta", !abierta);
        botonBio.textContent = abierta ? "Leer más" : "Leer menos";
      });
    }
  }

  async function cargar() {
    if (!contenedor) return;

    if (!id) {
      mostrarEstado("No se indicó qué persona mostrar. Vuelve a una ficha y pulsa su nombre.", true);
      return;
    }

    mostrarEstado("Cargando ficha...");

    try {
      const datos = await api.persona(id);
      if (!datos) {
        mostrarEstado(
          api.USAR_SERVIDOR
            ? "No pudimos encontrar esa persona."
            : "Las fichas de personas necesitan TMDB. Abre el sitio con «npm start».",
          true
        );
        return;
      }

      document.title = datos.nombre + " | CINEMA";
      filmografia = datos.filmografia;
      contenedor.innerHTML = plantilla(datos);
      activarControles();
      pintarPagina();
    } catch (error) {
      console.error("Error al cargar la persona:", error);
      mostrarEstado("No pudimos cargar esa persona. Inténtalo de nuevo más tarde.", true);
    }
  }

  cargar();
})();
