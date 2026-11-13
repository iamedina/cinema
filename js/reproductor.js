/**
 * CINEMA · reproductor de cine de dominio público
 *
 * Abre un diálogo con un <video> nativo que carga el MP4 solo al pulsar
 * «Ver ahora». Cierra con Escape, con la X o pulsando el fondo, pausa el
 * vídeo y devuelve el foco al botón que lo abrió.
 *
 * Si la película ya estaba empezada, ofrece «Reanudar» o «Empezar de
 * cero» y guarda la posición para la próxima vez (js/progreso.js).
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});
  const { ui } = CINEMA;
  const escapeHtml = ui.escapeHtml;

  const INTERVALO_GUARDADO = 15000; // ms entre guardados automáticos

  let dialogo = null;
  let video = null;
  let cerrarBoton = null;
  let errorTexto = null;
  let reanudarPanel = null;
  let reanudarTexto = null;
  let botonReanudar = null;
  let botonCero = null;
  let disparador = null;

  let idActual = null;
  let tituloActual = "";
  let anioActual = "";
  let posterActual = "";
  let posicionPendiente = 0;
  let ultimoGuardado = 0;

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
      '<div class="reproductor-reanudar oculto" id="reproductorReanudar">' +
      '<p class="reproductor-reanudar-texto" id="reproductorReanudarTexto"></p>' +
      '<div class="reproductor-reanudar-botones">' +
      '<button type="button" class="btn btn-primary btn-sm fw-semibold" data-reproductor-reanudar>' +
      '<i class="bi bi-play-fill" aria-hidden="true"></i> Reanudar' +
      "</button>" +
      '<button type="button" class="btn btn-outline-light btn-sm" data-reproductor-cero>' +
      "Empezar de cero" +
      "</button>" +
      "</div>" +
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
    reanudarPanel = contenedor.querySelector("#reproductorReanudar");
    reanudarTexto = contenedor.querySelector("#reproductorReanudarTexto");
    botonReanudar = contenedor.querySelector("[data-reproductor-reanudar]");
    botonCero = contenedor.querySelector("[data-reproductor-cero]");

    cerrarBoton.addEventListener("click", cerrar);
    botonReanudar.addEventListener("click", () => reanudar());
    botonCero.addEventListener("click", () => empezarDeCero());

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

      /* Foco encerrado entre los controles visibles del diálogo. */
      const focos = [cerrarBoton];
      if (!reanudarPanel.classList.contains("oculto")) {
        focos.push(botonReanudar, botonCero);
      }
      focos.push(video);

      const indice = focos.indexOf(document.activeElement);
      if (evento.shiftKey && indice <= 0) {
        evento.preventDefault();
        focos[focos.length - 1].focus();
      } else if (!evento.shiftKey && indice === focos.length - 1) {
        evento.preventDefault();
        focos[0].focus();
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

    /* Progreso: se guarda cada 15 s, al pausar y al terminar. */
    video.addEventListener("timeupdate", () => {
      if (video.paused || video.ended) return;
      if (Date.now() - ultimoGuardado < INTERVALO_GUARDADO) return;
      ultimoGuardado = Date.now();
      guardarProgreso();
    });

    video.addEventListener("pause", guardarProgreso);

    video.addEventListener("ended", () => {
      if (!idActual || !CINEMA.progreso) return;
      const duracion = video.duration;
      if (!isFinite(duracion) || duracion <= 0) return;
      CINEMA.progreso.guardar({
        id: idActual,
        titulo: tituloActual,
        anio: anioActual,
        poster: posterActual,
        posicion: duracion,
        duracion,
        visto: true,
      });
    });
  }

  /* ============================================================
   * Reanudar
   * ========================================================== */

  function mostrarReanudar(posicion) {
    if (!reanudarPanel) return;
    posicionPendiente = posicion;
    reanudarTexto.textContent =
      "Lo dejaste en " + CINEMA.progreso.formatear(posicion) + ". ¿Continuar?";
    reanudarPanel.classList.remove("oculto");
  }

  function ocultarReanudar() {
    if (!reanudarPanel) return;
    reanudarPanel.classList.add("oculto");
    posicionPendiente = 0;
  }

  function irAPosicion(segundos) {
    const destino = Math.max(0, Number(segundos) || 0);

    if (video.readyState >= 1) {
      try {
        video.currentTime = destino;
      } catch {
        /* Si el navegador aún no permite buscar, empieza igualmente. */
      }
    } else {
      video.addEventListener(
        "loadedmetadata",
        () => {
          try {
            video.currentTime = destino;
          } catch {
            /* sin búsqueda: se reproduce desde el principio */
          }
        },
        { once: true }
      );
    }

    const intento = video.play();
    if (intento && typeof intento.catch === "function") intento.catch(() => {});
    if (video) video.focus();
  }

  function reanudar() {
    const destino = posicionPendiente;
    ocultarReanudar();
    irAPosicion(destino);
  }

  function empezarDeCero() {
    if (idActual && CINEMA.progreso) CINEMA.progreso.quitar(idActual);
    ocultarReanudar();
    irAPosicion(0);
  }

  function guardarProgreso() {
    if (!idActual || !CINEMA.progreso) return;

    const duracion = video.duration;
    if (!isFinite(duracion) || duracion <= 0) return;

    const posicion = video.currentTime;
    if (!isFinite(posicion) || posicion <= 0) return;

    CINEMA.progreso.guardar({
      id: idActual,
      titulo: tituloActual,
      anio: anioActual,
      poster: posterActual,
      posicion,
      duracion,
    });
  }

  /* ============================================================
   * Abrir / cerrar
   * ========================================================== */

  function abrir(boton) {
    if (!boton) return;
    if (!dialogo) crearDialogo();

    const url = boton.getAttribute("data-video");
    if (!url) return;

    const titulo = boton.getAttribute("data-titulo") || "Película";
    const anio = boton.getAttribute("data-anio") || "";
    const poster = boton.getAttribute("data-poster") || "";
    const ficha = boton.getAttribute("data-ficha") || "";
    const id = boton.getAttribute("data-id") || "";

    disparador = boton;
    idActual = id;
    tituloActual = titulo;
    anioActual = anio;
    posterActual = poster;
    ultimoGuardado = 0;

    dialogo.querySelector("#reproductorTitulo").textContent =
      titulo + (anio ? " (" + anio + ")" : "");

    video.setAttribute("data-ficha", ficha);
    video.setAttribute("aria-label", "Reproduciendo " + titulo);
    if (poster) video.setAttribute("poster", poster);
    else video.removeAttribute("poster");

    errorTexto.classList.add("oculto");
    errorTexto.textContent = "";
    ocultarReanudar();

    dialogo.classList.remove("oculto");
    document.body.classList.add("sin-scroll");

    const guardado = id && CINEMA.progreso ? CINEMA.progreso.leer(id) : null;
    const minimo = CINEMA.progreso ? CINEMA.progreso.MINIMO : 5;
    const reanudable = Boolean(
      guardado &&
        !guardado.visto &&
        guardado.posicion >= minimo &&
        (!guardado.duracion || guardado.posicion < guardado.duracion - 5)
    );

    if (reanudable) {
      video.addEventListener(
        "loadedmetadata",
        () => {
          try {
            video.currentTime = guardado.posicion;
          } catch {
            /* sin búsqueda: se empieza desde el principio */
          }
        },
        { once: true }
      );
    }

    video.src = url;
    video.load();

    if (reanudable) {
      mostrarReanudar(guardado.posicion);
      botonReanudar.focus();
    } else {
      cerrarBoton.focus();
      const intento = video.play();
      if (intento && typeof intento.catch === "function") intento.catch(() => {});
    }
  }

  function cerrar() {
    if (!dialogo || dialogo.classList.contains("oculto")) return;

    guardarProgreso();

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.removeAttribute("poster");
      video.load();
    }

    ocultarReanudar();
    idActual = null;
    ultimoGuardado = 0;

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

  CINEMA.reproductor = {
    abrir,
    cerrar,
    estaAbierto,
    activar,
  };
})();
