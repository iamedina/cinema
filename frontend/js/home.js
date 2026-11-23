/**
 * CINEMA · página de inicio: tres carruseles (películas, series, anime).
 */
(function () {
  "use strict";

  const { api, ui, buscador } = window.CINEMA;

  const RAILS = [
    { contenedor: "resultadoRecientes", tipo: "movie" },
    { contenedor: "resultadoRecientesSeries", tipo: "series" },
    { contenedor: "resultadoRecientesAnime", tipo: "anime" },
  ];

  /* Los carruseles ya piden datos: el Top 10 se construye con ellos,
     sin lanzar peticiones adicionales a la API. */
  const datosPorTipo = {};

  buscador.init();

  /** «Siguiendo viendo»: solo títulos empezados y sin terminar. */
  function cargarSeguimiento() {
    const seccion = document.getElementById("seccionSeguimiento");
    const elemento = document.getElementById("resultadoSeguirViendo");
    const progreso = window.CINEMA.progreso;
    if (!seccion || !elemento || !progreso) return;

    const pintar = () => {
      const items = progreso.enCurso().slice(0, 12);
      if (!items.length) {
        seccion.hidden = true;
        elemento.innerHTML = "";
        return;
      }

      seccion.hidden = false;
      ui.activarNavegacion(elemento);
      elemento.innerHTML = items
        .map((item) => {
          const esc = ui.escapeHtml;
          const id = esc(item.id);
          const titulo = esc(item.titulo);
          const poster = esc(item.poster || ui.POSTER_PLACEHOLDER);
          const anio = esc(item.anio);
          const porcentaje = Math.round(progreso.porcentaje(item));
          const restante = esc(progreso.formatear(progreso.restante(item)));

          return (
            '<article class="pelicula-card seguimiento-card">' +
            '<a class="card-banner" data-id="' + id + '" ' +
            'href="descripcion.html?id=' + encodeURIComponent(item.id) + '" ' +
            'aria-label="Continuar viendo ' + titulo + '">' +
            '<img src="' + poster + '" alt="Póster de ' + titulo + '" ' +
            'class="img-pelicula" loading="lazy" decoding="async">' +
            '<span class="pd-progreso" aria-hidden="true">' +
            '<span class="pd-progreso-barra" style="width: ' + porcentaje + '%"></span>' +
            "</span>" +
            "</a>" +
            '<div class="title-wrapper">' +
            '<h3 class="card-title">' + titulo + "</h3>" +
            '<time class="card-anio">' + anio + "</time>" +
            "</div>" +
            '<p class="seguimiento-restante">' + porcentaje + '% · ' + restante + " restantes</p>" +
            "</article>"
          );
        })
        .join("");
    };

    pintar();
    progreso.alCambiar(pintar);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) pintar();
    });
  }

  cargarSeguimiento();

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
      datosPorTipo[tipo] = items;
    } catch (error) {
      console.error("Error al cargar el carrusel:", tipo, error);
      ui.pintarEstado(
        elemento,
        api.esAvisoOmdb(error)
          ? error.message
          : "Error al cargar. Inténtalo de nuevo más tarde."
      );
    }
  }

  Promise.allSettled(RAILS.map(cargarRail)).then(pintarTop10);

  /** Reordena lo que ya cargaron los carruseles y pinta el bloque destacado. */
  function pintarTop10() {
    const contenedor = document.getElementById("top10");
    if (!contenedor) return;

    contenedor.setAttribute("aria-busy", "true");
    ui.activarNavegacion(contenedor);
    ui.pintarCargando(contenedor, 10);

    const candidatos = [
      ...(datosPorTipo.movie || []),
      ...(datosPorTipo.series || []),
      ...(datosPorTipo.anime || []),
    ];

    if (!candidatos.length) {
      ui.pintarEstado(contenedor, "No se pudo cargar el Top 10 ahora mismo.");
      contenedor.setAttribute("aria-busy", "false");
      return;
    }

    ui.pintarTop10(contenedor, candidatos);
    contenedor.setAttribute("aria-busy", "false");
  }

  /* El destacado es un carrusel autocontenido: hero.js pinta los diez
     títulos y gestiona el paso automático y los controles. */
  if (window.CINEMA.heroCine) window.CINEMA.heroCine.init();
})();
