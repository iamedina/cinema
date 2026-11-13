/**
 * CINEMA · página «Dominio público»
 * Pinta el catálogo local y abre el reproductor sin pedir nada a las APIs.
 */
(function () {
  "use strict";

  const { ui, dominioPublico, reproductor } = window.CINEMA;
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

  contenedor.innerHTML = items
    .map((item) => {
      const titulo = escapeHtml(item.titulo);
      const url = escapeHtml(dominioPublico.url(item));
      const ficha = escapeHtml(dominioPublico.ficha(item));
      const miniatura = escapeHtml(dominioPublico.miniatura(item));
      const detalle = escapeHtml("descripcion.html?id=tmdb-movie-" + item.tmdb);

      return (
        '<article class="pd-card">' +
        '<a class="pd-poster" href="' + detalle + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + miniatura + '" alt="" loading="lazy" decoding="async" ' +
        'onerror="this.classList.add(\'oculto\')">' +
        '<span class="pd-poster-respaldo"><i class="bi bi-film" aria-hidden="true"></i></span>' +
        "</a>" +
        '<div class="pd-info">' +
        '<h3 class="pd-titulo"><a href="' + detalle + '">' + titulo + "</a></h3>" +
        '<p class="pd-anio">' + escapeHtml(item.anio) + " · Dominio público</p>" +
        '<div class="pd-acciones">' +
        '<button type="button" class="btn btn-primary pd-boton" data-ver-ahora ' +
        'data-video="' + url + '" data-titulo="' + titulo + '" data-anio="' + escapeHtml(item.anio) + '" ' +
        'data-poster="' + miniatura + '" data-ficha="' + ficha + '" ' +
        'aria-label="Ver ahora ' + titulo + '">' +
        '<i class="bi bi-play-fill" aria-hidden="true"></i> Ver ahora' +
        "</button>" +
        '<a class="pd-ficha" href="' + ficha + '" target="_blank" rel="noopener noreferrer" ' +
        'aria-label="Ficha de ' + titulo + ' en Internet Archive">' +
        '<i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>' +
        "</a>" +
        "</div>" +
        "</div>" +
        "</article>"
      );
    })
    .join("");

  contenedor.setAttribute("aria-busy", "false");
  reproductor.activar();
})();
