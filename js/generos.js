/**
 * CINEMA · géneros de TMDB
 * ------------------------------------------------------------
 * Lista fija para no depender de una petición extra (y para que el
 * filtro funcione aunque la red vaya lenta). Los ids son los de TMDB.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  const PELICULAS = [
    [28, "Acción"],
    [12, "Aventura"],
    [16, "Animación"],
    [35, "Comedia"],
    [80, "Crimen"],
    [99, "Documental"],
    [18, "Drama"],
    [10751, "Familia"],
    [14, "Fantasía"],
    [36, "Historia"],
    [27, "Terror"],
    [10402, "Música"],
    [9648, "Misterio"],
    [10749, "Romance"],
    [878, "Ciencia ficción"],
    [10770, "Película de TV"],
    [53, "Suspense"],
    [10752, "Bélica"],
    [37, "Western"],
  ].map(([id, nombre]) => ({ id: String(id), nombre }));

  const SERIES = [
    [10759, "Acción y aventura"],
    [16, "Animación"],
    [35, "Comedia"],
    [80, "Crimen"],
    [99, "Documental"],
    [18, "Drama"],
    [10751, "Familia"],
    [10762, "Infantil"],
    [9648, "Misterio"],
    [10763, "Noticias"],
    [10764, "Reality"],
    [10765, "Ciencia ficción y fantasía"],
    [10766, "Telenovela"],
    [10767, "Talk show"],
    [10768, "Bélica y política"],
    [37, "Western"],
  ].map(([id, nombre]) => ({ id: String(id), nombre }));

  function para(tipo) {
    return tipo === "movie" ? PELICULAS : SERIES;
  }

  CINEMA.generos = { movie: PELICULAS, tv: SERIES, para };
})();
