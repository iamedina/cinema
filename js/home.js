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
      ui.pintarEstado(elemento, "Error al cargar. Inténtalo de nuevo más tarde.");
    }
  }

  Promise.allSettled(RAILS.map(cargarRail));
})();
