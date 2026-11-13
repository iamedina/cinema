/**
 * CINEMA · reproductor de cine de dominio público
 *
 * Abre un diálogo con un <video> nativo que carga el MP4 solo al pulsar
 * «Ver ahora». Cierra con Escape, con la X o pulsando el fondo, pausa el
 * vídeo y devuelve el foco al botón que lo abrió.
 */
(function () {
  "use strict";

  const { ui } = window.CINEMA;
  const escapeHtml = ui.escapeHtml;

  let dialogo = null;
  let video = null;
  let cerrarBoton = null;
  let errorTexto = null;
  let disparador = null;

  function crearDialogo() {
    const contenedor = document.createElement("div");
    contenedor.className = "reproductor oculto";
    contenedor.id = "reproductor";
    contenedor.setAttribute("role", "dialog");
    contenedor.setAttribute("aria-modal", "true");
    contenedor.setAttribute("aria-labelledby", "reproductorTitulo");
    contenedor.innerHTML =
      '<div class="reproductor-caja">' +
      '<div class="reproductor-cabecera">' +
      '<p class="reproductor-titulo" id="reproductorTitulo">Reproductor</p>' +
      '<button type="button" class="reproductor-cerrar" data-reproductor-cerrar ' +
      'aria-label="Cerrar reproductor">' +
      '<i class="bi bi-x-lg" aria-hidden="true"></i>' +
      "</button>" +
      "</div>" +
      '<video class="reproductor-video" id="reproductorVideo" controls playsinline ' +
      'preload="none" aria-label="Vídeo"></video>' +
      '<p class="reproductor-error oculto" id="reproductorError" role="alert"></p>' +
      '<p class="reproductor-pie">' +
      'Película de dominio público alojada en <a href="https://archive.org" ' +
      'target="_blank" rel="noopener noreferrer">Internet Archive</a>. ' +
      "CINEMA no aloja el vídeo." +
      "</p>" +
      "</div>";

    document.body.appendChild(contenedor);

    dialogo = contenedor;
    video = contenedor.querySelector("#reproductorVideo");
    cerrarBoton = contenedor.querySelector("[data-reproductor-cerrar]");
    errorTexto = contenedor.querySelector("#reproductorError");

    cerrarBoton.addEventListener("click", cerrar);

    dialogo.addEventListener("click", (evento) => {
      if (evento.target === dialogo) cerrar();
    });

    dialogo.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }

      if (evento.key !== "Tab") return;

      /* Foco encerrado entre la X y los controles del vídeo. */
      const focos = [cerrarBoton, video];
      const indice = focos.indexOf(document.activeElement);
      if (evento.shiftKey && (indice <= 0)) {
        evento.preventDefault();
        video.focus();
      } else if (!evento.shiftKey && indice === focos.length - 1) {
        evento.preventDefault();
        cerrarBoton.focus();
      }
    });

    video.addEventListener("error", () => {
      errorTexto.innerHTML =
        "No se pudo cargar el vídeo. Comprueba tu conexión o " +
        '<a href="' +
        escapeHtml(video.getAttribute("data-ficha") || "https://archive.org") +
        '" target="_blank" rel="noopener noreferrer">ábrelo en Internet Archive</a>.';
      errorTexto.classList.remove("oculto");
    });

    video.addEventListener("playing", () => {
      errorTexto.classList.add("oculto");
    });
  }

  function abrir(boton) {
    if (!boton) return;
    if (!dialogo) crearDialogo();

    const url = boton.getAttribute("data-video");
    if (!url) return;

    const titulo = boton.getAttribute("data-titulo") || "Película";
    const anio = boton.getAttribute("data-anio") || "";
    const poster = boton.getAttribute("data-poster") || "";
    const ficha = boton.getAttribute("data-ficha") || "";

    disparador = boton;
    dialogo.querySelector("#reproductorTitulo").textContent =
      titulo + (anio ? " (" + anio + ")" : "");

    video.setAttribute("data-ficha", ficha);
    video.setAttribute("aria-label", "Reproduciendo " + titulo);
    if (poster) video.setAttribute("poster", poster);
    else video.removeAttribute("poster");

    errorTexto.classList.add("oculto");
    errorTexto.textContent = "";

    dialogo.classList.remove("oculto");
    document.body.classList.add("sin-scroll");

    video.src = url;
    video.load();
    if (cerrarBoton) cerrarBoton.focus();

    const intento = video.play();
    if (intento && typeof intento.catch === "function") intento.catch(() => {});
  }

  function cerrar() {
    if (!dialogo || dialogo.classList.contains("oculto")) return;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.removeAttribute("poster");
      video.load();
    }

    dialogo.classList.add("oculto");
    document.body.classList.remove("sin-scroll");

    if (disparador) {
      disparador.focus();
      disparador = null;
    }
  }

  function estaAbierto() {
    return Boolean(dialogo && !dialogo.classList.contains("oculto"));
  }

  /**
   * Delegación: cualquier [data-ver-ahora] de la página abre el reproductor.
   * Se puede llamar varias veces sin duplicar oyentes.
   */
  function activar() {
    if (activar.activo) return;
    activar.activo = true;

    document.addEventListener("click", (evento) => {
      const boton = evento.target.closest("[data-ver-ahora]");
      if (!boton) return;
      evento.preventDefault();
      abrir(boton);
    });
  }

  window.CINEMA.reproductor = {
    abrir,
    cerrar,
    estaAbierto,
    activar,
  };
})();
