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
      ui.pintarEstado(
        elemento,
        api.esAvisoOmdb(error)
          ? error.message
          : "Error al cargar. Inténtalo de nuevo más tarde."
      );
    }
  }

  Promise.allSettled(RAILS.map(cargarRail));

  /** Hero destacado: reutiliza la ficha de un título conocido de TMDB. */
  async function cargarHero() {
    const titulo = document.getElementById("heroTitulo");
    if (!titulo) return;

    try {
      const datos = await api.detalle("tmdb-movie-603");
      const fondo = document.getElementById("heroFondo");
      const meta = document.getElementById("heroMeta");
      const sinopsis = document.getElementById("heroSinopsis");
      const boton = document.getElementById("heroBoton");
      const escapeHtml = ui.escapeHtml;

      titulo.textContent = datos.titulo;
      document.getElementById("heroSubtitulo").textContent =
        "Destacado CINEMA · " + (datos.generos || "Película");

      if (meta) {
        const partes = [datos.anio];
        if (datos.duracion) partes.push(datos.duracion + " min");
        if (datos.clasificacion) partes.push(datos.clasificacion);
        if (datos.rating) partes.push("★ " + Number(datos.rating).toFixed(1));
        meta.innerHTML = partes
          .map((parte) => '<span class="hero-meta-item">' + escapeHtml(parte) + "</span>")
          .join("");
      }

      if (sinopsis) {
        sinopsis.textContent = datos.sinopsis
          ? datos.sinopsis.slice(0, 220) + (datos.sinopsis.length > 220 ? "…" : "")
          : "Una historia imprescindible del catálogo.";
      }

      if (boton) {
        boton.href = "descripcion.html?id=" + encodeURIComponent(datos.id);
      }

      if (fondo && datos.galeria && datos.galeria.length) {
        const url = String(datos.galeria[0].url || "").replace(/["']/g, "");
        if (url) fondo.style.backgroundImage = 'url("' + url + '")';
      }
    } catch (error) {
      console.error("Error al cargar el destacado:", error);
    }
  }

  cargarHero();
})();
