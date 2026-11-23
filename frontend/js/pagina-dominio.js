/**
 * CINEMA · página «Dominio público»
 * Pinta el catálogo local y abre el reproductor sin pedir nada a las APIs.
 * Cada tarjeta muestra el progreso guardado («Continuar», barra y sello
 * de vista) y se actualiza al cerrar el reproductor.
 */
(function () {
  "use strict";

  const { ui, dominioPublico, reproductor } = window.CINEMA;
  const progreso = window.CINEMA.progreso;
  const escapeHtml = ui.escapeHtml;

  const contenedor = document.getElementById("catalogoPublico");
  const contador = document.getElementById("contadorPublico");
  if (!contenedor) return;

  const items = dominioPublico
    .listar()
    .slice()
    .sort((a, b) => Number(a.anio) - Number(b.anio) || a.titulo.localeCompare(b.titulo, "es"));

  if (contador) {
    contador.textContent =
      items.length + (items.length === 1 ? " película disponible" : " películas disponibles");
  }

  function idFicha(item) {
    return "tmdb-movie-" + item.tmdb;
  }

  function guardadoDe(item) {
    return progreso ? progreso.leer(idFicha(item)) : null;
  }

  function tarjeta(item) {
    const titulo = escapeHtml(item.titulo);
    const url = escapeHtml(dominioPublico.url(item));
    const ficha = escapeHtml(dominioPublico.ficha(item));
    const miniatura = escapeHtml(dominioPublico.miniatura(item));
    const detalle = escapeHtml("descripcion.html?id=" + idFicha(item));

    const guardado = guardadoDe(item);
    const visto = Boolean(guardado && guardado.visto);
    const porcentaje = guardado && !visto ? Math.round(progreso.porcentaje(guardado)) : 0;

    return (
      '<article class="pd-card" data-pd-id="' + escapeHtml(idFicha(item)) + '">' +
      '<a class="pd-poster" href="' + detalle + '" tabindex="-1" aria-hidden="true">' +
      '<img src="' + miniatura + '" alt="" loading="lazy" decoding="async" ' +
      'onerror="this.classList.add(\'oculto\')">' +
      '<span class="pd-poster-respaldo"><i class="bi bi-film" aria-hidden="true"></i></span>' +
      '<span class="pd-vista" data-pd-vista' + (visto ? "" : " hidden") + ">Vista</span>" +
      '<span class="pd-progreso" data-pd-progreso aria-hidden="true"' +
      (porcentaje ? "" : " hidden") +
      ">" +
      '<span class="pd-progreso-barra" data-pd-barra style="width: ' + porcentaje + '%"></span>' +
      "</span>" +
      "</a>" +
      '<div class="pd-info">' +
      '<h3 class="pd-titulo"><a href="' + detalle + '">' + titulo + "</a></h3>" +
      '<p class="pd-anio">' + escapeHtml(item.anio) + " · Dominio público</p>" +
      '<div class="pd-acciones">' +
      '<button type="button" class="btn btn-primary pd-boton" data-ver-ahora ' +
      'data-id="' + escapeHtml(idFicha(item)) + '" ' +
      'data-video="' + url + '" data-titulo="' + titulo + '" data-anio="' + escapeHtml(item.anio) + '" ' +
      'data-poster="' + miniatura + '" data-ficha="' + ficha + '" ' +
      'aria-label="Ver ahora ' + titulo + '">' +
      '<i class="bi bi-play-fill" aria-hidden="true"></i> ' +
      '<span data-pd-boton-texto>' + (porcentaje ? "Continuar" : "Ver ahora") + "</span>" +
      "</button>" +
      '<a class="pd-ficha" href="' + ficha + '" target="_blank" rel="noopener noreferrer" ' +
      'aria-label="Ficha de ' + titulo + ' en Internet Archive">' +
      '<i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>' +
      "</a>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function pintar() {
    contenedor.innerHTML = items.map(tarjeta).join("");
    contenedor.setAttribute("aria-busy", "false");
    reproductor.activar();
  }

  /** Actualiza solo la barra, el sello y el texto del botón. */
  function refrescar() {
    if (!progreso) return;

    contenedor.querySelectorAll("[data-pd-id]").forEach((articulo) => {
      const guardado = progreso.leer(articulo.getAttribute("data-pd-id"));
      const visto = Boolean(guardado && guardado.visto);
      const porcentaje = guardado && !visto ? Math.round(progreso.porcentaje(guardado)) : 0;

      const sello = articulo.querySelector("[data-pd-vista]");
      if (sello) sello.hidden = !visto;

      const barra = articulo.querySelector("[data-pd-barra]");
      if (barra) barra.style.width = porcentaje + "%";

      const contenedorBarra = articulo.querySelector("[data-pd-progreso]");
      if (contenedorBarra) contenedorBarra.hidden = porcentaje === 0;

      const texto = articulo.querySelector("[data-pd-boton-texto]");
      if (texto) texto.textContent = porcentaje ? "Continuar" : "Ver ahora";

      const boton = articulo.querySelector("[data-ver-ahora]");
      if (boton) {
        const titulo = boton.getAttribute("data-titulo") || "esta película";
        boton.setAttribute(
          "aria-label",
          porcentaje ? "Continuar " + titulo : "Ver ahora " + titulo
        );
      }
    });
  }

  pintar();

  if (progreso) {
    progreso.alCambiar(refrescar);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refrescar();
    });
  }
})();
