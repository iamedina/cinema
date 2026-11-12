/**
 * CINEMA · ficha de detalle (descripcion.html?id=...)
 * Maquetación original del proyecto, con datos reales, escapado y
 * tráiler embebido cuando la API lo proporciona.
 */
(function () {
  "use strict";

  const { api, ui, buscador } = window.CINEMA;
  const escapeHtml = ui.escapeHtml;
  const POSTER_PLACEHOLDER = ui.POSTER_PLACEHOLDER;
  const etiquetaTipo = ui.etiquetaTipo;

  buscador.init();

  const contenedor = document.getElementById("detalles");
  const id = new URLSearchParams(location.search).get("id");

  function mostrarEstado(mensaje, esError = false) {
    if (!contenedor) return;
    contenedor.innerHTML =
      '<p class="estado-vacio' + (esError ? " estado-error" : "") + '">' + escapeHtml(mensaje) + "</p>";
  }

  function fila(etiqueta, valor) {
    if (!valor || valor === "N/A" || valor === "—") return "";
    return '<li class="mb-2"><strong>' + escapeHtml(etiqueta) + ":</strong> <br> " + escapeHtml(valor) + "</li>";
  }

  function bloqueTrailer(datos) {
    if (datos.trailerKey) {
      return (
        '<section class="trailer-seccion">' +
        "<h3>Tráiler</h3>" +
        '<div class="trailer-marco">' +
        '<iframe src="https://www.youtube.com/embed/' +
        escapeHtml(datos.trailerKey) +
        '" title="Tráiler de ' +
        escapeHtml(datos.titulo) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        "</div>" +
        "</section>"
      );
    }

    return (
      '<section class="trailer-seccion">' +
      "<h3>Tráiler</h3>" +
      '<div class="trailer-fallback">' +
      '<p class="mb-3">No hay tráiler disponible en español ni en inglés.</p>' +
      '<a class="btn btn-primary fw-semibold" href="' +
      escapeHtml(datos.busquedaTrailer) +
      '" target="_blank" rel="noopener noreferrer">Buscar en YouTube</a>' +
      "</div>" +
      "</section>"
    );
  }

  function plantilla(datos) {
    const sinopsis =
      datos.sinopsis && datos.sinopsis !== "N/A" ? datos.sinopsis : "Sin sinopsis disponible.";
    const rating = datos.rating ? "★ " + escapeHtml(datos.rating) + " / 10" : "Sin calificación";
    const botonTrailer = datos.trailerOficial || datos.busquedaTrailer;

    const columnaIzquierda = [
      fila("Título original", datos.titulo),
      fila("Rating", datos.rating ? datos.rating + " / 10" : null),
      fila("Duración", datos.duracion),
      fila("Géneros", datos.generos),
      fila("Idiomas", datos.idiomas),
    ].join("");

    const columnaDerecha = [
      fila("Votos", datos.votos),
      fila("Fecha de estreno", datos.estreno),
      fila("País", datos.paises),
      fila("Clasificación", datos.clasificacion),
      fila("Temporadas", datos.temporadas),
    ].join("");

    return (
      '<div class="detalle-pagina">' +
      '<div class="d-flex gap-4 contenedor">' +
      '<article class="articleDetalle">' +
      '<div class="text-white espacio">' +
      '<div class="text-start border-0 ps-3">' +
      '<h2 class="fw-bold">' +
      escapeHtml(datos.titulo) +
      " (" +
      escapeHtml(datos.anio) +
      ")</h2>" +
      '<p class="detalle-tipo-texto">' +
      etiquetaTipo(datos.tipo) +
      "</p>" +
      "</div>" +
      '<div class="container-fluid mt-4">' +
      '<div class="row g-3">' +
      '<div class="col-md-4 text-center text-lg-start">' +
      '<img src="' +
      escapeHtml(datos.poster || POSTER_PLACEHOLDER) +
      '" alt="Póster de ' +
      escapeHtml(datos.titulo) +
      '" class="img-fluid rounded mb-3 poster-detalle" ' +
      "onerror=\"this.onerror=null;this.src='" +
      POSTER_PLACEHOLDER +
      "'\">" +
      "</div>" +
      '<div class="col-md-8">' +
      '<div class="row text-start">' +
      '<ul class="list-unstyled col-6">' +
      columnaIzquierda +
      "</ul>" +
      '<ul class="list-unstyled col-6">' +
      columnaDerecha +
      "</ul>" +
      "</div>" +
      '<div class="clasificacion mb-2">' +
      rating +
      "</div>" +
      '<div class="text-start fw-medium detalle-plot">' +
      escapeHtml(sinopsis) +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>" +
      '<div class="detalle-accion">' +
      '<a class="btn btn-primary fw-semibold" style="padding: 12px 80px;" href="' +
      escapeHtml(botonTrailer) +
      '" target="_blank" rel="noopener noreferrer">Ver trailer</a>' +
      "</div>" +
      "</div>" +
      bloqueTrailer(datos) +
      "</div>"
    );
  }

  async function cargar() {
    if (!contenedor) return;

    if (!id) {
      mostrarEstado("No se indicó qué título mostrar. Vuelve al inicio y elige uno.", true);
      return;
    }

    mostrarEstado("Cargando ficha...");

    try {
      const datos = await api.detalle(id);
      document.title = datos.titulo + " (" + datos.anio + ") | CINEMA";
      contenedor.innerHTML = plantilla(datos);
    } catch (error) {
      console.error("Error al cargar la ficha:", error);
      mostrarEstado("No pudimos encontrar ese título.", true);
    }
  }

  cargar();
})();
