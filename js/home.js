/**
 * CINEMA · página de inicio: tres carruseles (películas, series, anime)
 * y, si hay algo empezado, un carrusel «Seguir viendo».
 */
(function () {
  "use strict";

  const { api, ui, buscador, dominioPublico, progreso, reproductor } = window.CINEMA;

  const RAILS = [
    { contenedor: "resultadoRecientes", tipo: "movie" },
    { contenedor: "resultadoRecientesSeries", tipo: "series" },
    { contenedor: "resultadoRecientesAnime", tipo: "anime" },
  ];

  buscador.init();

  async function cargarRail({ contenedor, tipo }) {
    const elemento = document.getElementById(contenedor);
    if (!elemento) return;

    ui.activarNavegacion(elemento);
    ui.pintarCargando(elemento, 12);

    try {
      const items = await api.recientes({
        tipo,
        semillas: api.SEMILLAS_HOME[tipo],
        limite: 12,
      });

      if (!items.length) {
        ui.pintarEstado(elemento, "No se pudieron cargar títulos ahora mismo.");
        return;
      }

      ui.pintarTarjetas(elemento, items);
    } catch (error) {
      console.error("Error al cargar el carrusel:", tipo, error);
      ui.pintarEstado(
        elemento,
        api.esLimiteOmdb(error)
          ? error.message
          : "Error al cargar. Inténtalo de nuevo más tarde."
      );
    }
  }

  /* ============================================================
   * Seguir viendo
   * ========================================================== */

  function tarjetaProgreso(entrada, item) {
    const titulo = ui.escapeHtml(entrada.titulo);
    const porcentaje = Math.round(progreso.porcentaje(entrada));
    const restante = progreso.formatear(progreso.restante(entrada));
    const detalle = ui.escapeHtml("descripcion.html?id=" + entrada.id);

    return (
      '<article class="pd-card pd-card-progreso">' +
      '<a class="pd-poster" href="' + detalle + '" tabindex="-1" aria-hidden="true">' +
      '<img src="' + ui.escapeHtml(dominioPublico.miniatura(item)) + '" alt="" ' +
      'loading="lazy" decoding="async" onerror="this.classList.add(\'oculto\')">' +
      '<span class="pd-poster-respaldo"><i class="bi bi-film" aria-hidden="true"></i></span>' +
      '<span class="pd-progreso" aria-hidden="true">' +
      '<span class="pd-progreso-barra" style="width: ' + porcentaje + '%"></span>' +
      "</span>" +
      "</a>" +
      '<div class="pd-info">' +
      '<h3 class="pd-titulo"><a href="' + detalle + '">' + titulo + "</a></h3>" +
      '<p class="pd-anio">' + ui.escapeHtml(entrada.anio) + " · Quedan " + restante + "</p>" +
      '<div class="pd-acciones">' +
      '<button type="button" class="btn btn-primary pd-boton" data-ver-ahora ' +
      'data-id="' + ui.escapeHtml(entrada.id) + '" ' +
      'data-video="' + ui.escapeHtml(dominioPublico.url(item)) + '" ' +
      'data-titulo="' + titulo + '" data-anio="' + ui.escapeHtml(entrada.anio) + '" ' +
      'data-poster="' + ui.escapeHtml(entrada.poster || dominioPublico.miniatura(item)) + '" ' +
      'data-ficha="' + ui.escapeHtml(dominioPublico.ficha(item)) + '" ' +
      'aria-label="Continuar ' + titulo + '">' +
      '<i class="bi bi-play-fill" aria-hidden="true"></i> Continuar' +
      "</button>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function pintarSeguirViendo() {
    const seccion = document.getElementById("seccionSeguirViendo");
    const contenedor = document.getElementById("seguirViendo");
    if (!seccion || !contenedor) return;

    if (!progreso || !dominioPublico) {
      seccion.hidden = true;
      return;
    }

    const filas = progreso
      .enCurso()
      .map((entrada) => ({
        entrada,
        item: dominioPublico.buscar(entrada.id, entrada.titulo, entrada.anio),
      }))
      .filter((fila) => fila.item)
      .slice(0, 6);

    if (!filas.length) {
      contenedor.innerHTML = "";
      seccion.hidden = true;
      return;
    }

    contenedor.innerHTML = filas.map((fila) => tarjetaProgreso(fila.entrada, fila.item)).join("");
    seccion.hidden = false;
    reproductor.activar();
  }

  pintarSeguirViendo();

  if (progreso) {
    progreso.alCambiar(pintarSeguirViendo);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) pintarSeguirViendo();
    });
  }

  Promise.allSettled(RAILS.map(cargarRail));
})();
