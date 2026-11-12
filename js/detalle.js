/**
 * CINEMA · ficha de detalle (descripcion.html?id=...)
 * Datos reales escapados: ficha, tráiler, reparto, plataformas de
 * streaming, galería y títulos similares.
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

  function seccion(titulo, contenido, clase) {
    if (!contenido) return "";
    return (
      '<section class="detalle-seccion' + (clase ? " " + clase : "") + '">' +
      "<h3>" + escapeHtml(titulo) + "</h3>" +
      contenido +
      "</section>"
    );
  }

  /* ============================================================
   * Tráiler
   * ========================================================== */

  function bloqueTrailer(datos) {
    if (datos.trailerKey) {
      return (
        '<section class="detalle-seccion">' +
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
      '<section class="detalle-seccion">' +
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

  /* ============================================================
   * Reparto
   * ========================================================== */

  function bloqueReparto(datos) {
    if (!datos.reparto || !datos.reparto.length) return "";

    const items = datos.reparto
      .map((p) => {
        const foto = p.foto
          ? '<img src="' + escapeHtml(p.foto) + '" alt="Foto de ' + escapeHtml(p.nombre) + '" ' +
            'class="reparto-foto" loading="lazy" decoding="async">'
          : '<span class="reparto-foto reparto-sin-foto"><i class="bi bi-person-fill" aria-hidden="true"></i></span>';

        return (
          '<li class="reparto-item">' +
          foto +
          '<p class="reparto-nombre">' + escapeHtml(p.nombre) + "</p>" +
          (p.personaje ? '<p class="reparto-personaje">' + escapeHtml(p.personaje) + "</p>" : "") +
          "</li>"
        );
      })
      .join("");

    return seccion("Reparto", '<ul class="reparto-lista">' + items + "</ul>");
  }

  /* ============================================================
   * Dónde verla (plataformas de streaming)
   * ========================================================== */

  function bloqueProveedores(datos) {
    const proveedores = datos.proveedores;
    if (!proveedores || !proveedores.items || !proveedores.items.length) return "";

    const items = proveedores.items
      .map((p) => {
        const logo = p.logo
          ? '<img src="' + escapeHtml(p.logo) + '" alt="" class="proveedor-logo" loading="lazy">'
          : "";
        return (
          '<li class="proveedor-item">' +
          logo +
          '<span class="proveedor-nombre">' + escapeHtml(p.nombre) + "</span>" +
          '<span class="proveedor-tipo">' + escapeHtml(p.tipo) + "</span>" +
          "</li>"
        );
      })
      .join("");

    const enlace = proveedores.enlace
      ? '<a class="proveedores-enlace" href="' + escapeHtml(proveedores.enlace) + '" ' +
        'target="_blank" rel="noopener noreferrer">' +
        'Ver todas las opciones <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>'
      : "";

    return seccion(
      "Dónde verla",
      '<ul class="proveedores-lista">' + items + "</ul>" +
        enlace +
        '<p class="proveedores-fuente">Disponibilidades de JustWatch a través de TMDB.</p>'
    );
  }

  /* ============================================================
   * Galería
   * ========================================================== */

  function bloqueGaleria(datos) {
    if (!datos.galeria || !datos.galeria.length) return "";

    const items = datos.galeria
      .map((img, i) => {
        const numero = i + 1;
        return (
          '<li class="galeria-item">' +
          '<button type="button" class="galeria-boton" ' +
          'data-grande="' + escapeHtml(img.grande) + '" ' +
          'aria-label="Ampliar imagen ' + numero + " de " + datos.galeria.length + '">' +
          '<img src="' + escapeHtml(img.url) + '" alt="Imagen de ' + escapeHtml(datos.titulo) + '" ' +
          'loading="lazy" decoding="async">' +
          "</button>" +
          "</li>"
        );
      })
      .join("");

    return seccion("Galería", '<ul class="galeria">' + items + "</ul>");
  }

  function bloqueLightbox() {
    return (
      '<div class="lightbox oculto" id="lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada">' +
      '<button type="button" class="lightbox-cerrar" id="lightboxCerrar" aria-label="Cerrar">' +
      '<i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
      '<img id="lightboxImagen" alt="">' +
      "</div>"
    );
  }

  function activarGaleria() {
    const lightbox = document.getElementById("lightbox");
    const imagen = document.getElementById("lightboxImagen");
    if (!lightbox || !imagen) return;

    const cerrar = document.getElementById("lightboxCerrar");
    const anterior = document.querySelector(".galeria-boton");

    const mostrar = (url, alt) => {
      imagen.src = url;
      imagen.alt = alt;
      lightbox.classList.remove("oculto");
      document.body.classList.add("sin-scroll");
      if (cerrar) cerrar.focus();
    };

    const ocultar = () => {
      lightbox.classList.add("oculto");
      imagen.removeAttribute("src");
      document.body.classList.remove("sin-scroll");
      if (anterior) anterior.focus();
    };

    document.querySelectorAll(".galeria-boton").forEach((boton) => {
      boton.addEventListener("click", () => {
        const miniatura = boton.querySelector("img");
        mostrar(boton.dataset.grande, miniatura ? miniatura.alt : "");
      });
    });

    lightbox.addEventListener("click", (evento) => {
      if (evento.target === lightbox || evento.target.closest("#lightboxCerrar")) ocultar();
    });

    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && !lightbox.classList.contains("oculto")) ocultar();
    });
  }

  /* ============================================================
   * Títulos similares
   * ========================================================== */

  function bloqueSimilares(datos) {
    if (!datos.similares || !datos.similares.length) return "";
    return seccion("Títulos similares", '<div id="similares" class="grid-similares"></div>');
  }

  /* ============================================================
   * Plantilla principal
   * ========================================================== */

  function plantilla(datos) {
    const sinopsis =
      datos.sinopsis && datos.sinopsis !== "N/A" ? datos.sinopsis : "Sin sinopsis disponible.";
    const rating = datos.rating ? "★ " + escapeHtml(datos.rating) + " / 10" : "Sin calificación";
    const botonTrailer = datos.trailerOficial || datos.busquedaTrailer;
    const etiquetaDirector = datos.tipoRaw === "tv" ? "Creador" : "Director";

    const columnaIzquierda = [
      fila("Título original", datos.titulo),
      fila(etiquetaDirector, datos.director),
      fila("Duración", datos.duracion),
      fila("Géneros", datos.generos),
      fila("Idiomas", datos.idiomas),
    ].join("");

    const columnaDerecha = [
      fila("Rating", datos.rating ? datos.rating + " / 10" : null),
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
      bloqueReparto(datos) +
      bloqueProveedores(datos) +
      bloqueGaleria(datos) +
      bloqueSimilares(datos) +
      bloqueLightbox() +
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

      const similares = document.getElementById("similares");
      if (similares) {
        ui.activarNavegacion(similares);
        ui.pintarTarjetas(similares, datos.similares);
      }

      activarGaleria();
    } catch (error) {
      console.error("Error al cargar la ficha:", error);
      mostrarEstado("No pudimos encontrar ese título.", true);
    }
  }

  cargar();
})();
