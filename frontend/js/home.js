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
