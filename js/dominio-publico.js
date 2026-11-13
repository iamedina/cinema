/**
 * CINEMA · catálogo de cine de dominio público
 *
 * Solo películas cuya copia es de dominio público y que están alojadas
 * (y verificadas) en Internet Archive. El reproductor nunca pide nada a
 * TMDB: usa el identificador de TMDB o de IMDb para reconocer la ficha.
 *
 * Cada entrada tiene:
 *   tmdb        id de TMDB (para enlaces tmdb-movie-<id>)
 *   imdb        id de IMDb (para las fichas de OMDb / file://)
 *   titulo      título original
 *   anio        año de estreno
 *   identificador  ítem de archive.org
 *   archivo     ruta del MP4 dentro del ítem
 */
(function () {
  "use strict";

  const BASE = "https://archive.org/download/";
  const FICHA = "https://archive.org/details/";
  const MINIATURA = "https://archive.org/services/img/";

  const CATALOGO = [
    {
      tmdb: "653",
      imdb: "tt0013442",
      titulo: "Nosferatu",
      anio: "1922",
      identificador: "nosferatu-1922_202510",
      archivo: "nosferatu-1922_202510/Nosferatu (1922).mp4",
    },
    {
      tmdb: "10331",
      imdb: "tt0063350",
      titulo: "La noche de los muertos vivientes",
      anio: "1968",
      identificador: "night_of_the_living_dead_ipod",
      archivo: "night_of_the_living_dead_ipod/night_of_the_living_dead_512kb.mp4",
    },
    {
      tmdb: "19",
      imdb: "tt0017136",
      titulo: "Metrópolis",
      anio: "1927",
      identificador: "metropolis-1927_202511",
      archivo: "metropolis-1927_202511/Metropolis 1927.mp4",
    },
    {
      tmdb: "961",
      imdb: "tt0017925",
      titulo: "El maquinista de La General",
      anio: "1926",
      identificador: "TheGeneral1926",
      archivo: "TheGeneral1926/The_General_1926_720p_512kb.mp4",
    },
    {
      tmdb: "234",
      imdb: "tt0010323",
      titulo: "El gabinete del doctor Caligari",
      anio: "1920",
      identificador: "bedford-The_Cabinet_of_Dr_Caligari",
      archivo: "bedford-The_Cabinet_of_Dr_Caligari/The_Cabinet_of_Dr_Caligari.mp4",
    },
    {
      tmdb: "10513",
      imdb: "tt0052077",
      titulo: "Plan 9 del espacio exterior",
      anio: "1957",
      identificador: "plan-9-from-outer-space_202009",
      archivo: "plan-9-from-outer-space_202009/Plan 9 from Outer Space.mp4",
    },
    {
      tmdb: "16093",
      imdb: "tt0055830",
      titulo: "El carnaval de las almas",
      anio: "1962",
      identificador: "carnival-of-souls-1962-restored",
      archivo: "carnival-of-souls-1962-restored/Carnival Of Souls (1962) Public Domain Movie(1).mp4",
    },
    {
      tmdb: "4808",
      imdb: "tt0056923",
      titulo: "Charada",
      anio: "1963",
      identificador: "charade-1963-cary-grant-audrey-hepburn-comedy-mystery-romance-thriller-full-movie",
      archivo: "charade-1963-cary-grant-audrey-hepburn-comedy-mystery-romance-thriller-full-movie/Charade_READY.mp4",
    },
    {
      tmdb: "3085",
      imdb: "tt0032599",
      titulo: "Luna nueva",
      anio: "1940",
      identificador: "HisGirlFriday1940_201309",
      archivo: "HisGirlFriday1940_201309/His Girl Friday - 1940.mp4",
    },
    {
      tmdb: "20367",
      imdb: "tt0037638",
      titulo: "Desvío",
      anio: "1945",
      identificador: "Detour",
      archivo: "Detour/Detour_512kb.mp4",
    },
    {
      tmdb: "18995",
      imdb: "tt0042369",
      titulo: "Con las horas contadas",
      anio: "1949",
      identificador: "d.-o.-a.-1950",
      archivo: "d.-o.-a.-1950/D.O.A. (1949).mp4",
    },
    {
      tmdb: "24452",
      imdb: "tt0054033",
      titulo: "La pequeña tienda de los horrores",
      anio: "1960",
      identificador: "TheLittleShopOfHorrorswithSpanishSubtitles",
      archivo: "TheLittleShopOfHorrorswithSpanishSubtitles/The_Little_Shop_of_Horrors_512kb_sub.mp4",
    },
    {
      tmdb: "992",
      imdb: "tt0015324",
      titulo: "El moderno Sherlock Holmes",
      anio: "1924",
      identificador: "sherlock.-jr..-1924.1080p.-blu-ray.x-264-yts.-am",
      archivo: "sherlock.-jr..-1924.1080p.-blu-ray.x-264-yts.-am/Sherlock.Jr..1924.1080p.BluRay.x264-[YTS.AM].mp4",
    },
    {
      tmdb: "643",
      imdb: "tt0015648",
      titulo: "El acorazado Potemkin",
      anio: "1925",
      identificador: "battle-1",
      archivo: "battle-1/BATTLE~1.mp4",
    },
    {
      tmdb: "964",
      imdb: "tt0016220",
      titulo: "El fantasma de la ópera",
      anio: "1925",
      identificador: "ThePhantomOfTheOpera1929",
      archivo: "ThePhantomOfTheOpera1929/thepaantomoftheopera1929_512kb.mp4",
    },
    {
      tmdb: "260",
      imdb: "tt0026029",
      titulo: "39 escalones",
      anio: "1935",
      identificador: "the_39_steps_1935",
      archivo: "the_39_steps_1935/the_39_steps_1935.mp4",
    },
    {
      tmdb: "32574",
      imdb: "tt0033891",
      titulo: "Juan Nadie",
      anio: "1941",
      identificador: "MeetJohnDoeHD",
      archivo: "MeetJohnDoeHD/Meet John Doe.mp4",
    },
    {
      tmdb: "17058",
      imdb: "tt0038057",
      titulo: "Perversidad",
      anio: "1945",
      identificador: "scarlet-street-1945-restored-movie-720p-hd",
      archivo: "scarlet-street-1945-restored-movie-720p-hd/scarlet street-1945-restored movie-720p-hd.mp4",
    },
    {
      tmdb: "21296",
      imdb: "tt0044789",
      titulo: "El cuarto hombre",
      anio: "1952",
      identificador: "KansasCityConfidential1952",
      archivo: "KansasCityConfidential1952/Kansas City Confidential (1952).mp4",
    },
    {
      tmdb: "41462",
      imdb: "tt0045877",
      titulo: "El autoestopista",
      anio: "1953",
      identificador: "TheHitchHiker1953_201901",
      archivo: "TheHitchHiker1953_201901/The Hitch-Hiker (1953).mp4",
    },
    {
      tmdb: "18398",
      imdb: "tt0047542",
      titulo: "De repente",
      anio: "1954",
      identificador: "Suddenly1954",
      archivo: "Suddenly1954/Suddenly_1954.mp4",
    },
    {
      tmdb: "22342",
      imdb: "tt0047878",
      titulo: "Agente especial",
      anio: "1955",
      identificador: "The_Big_Combo_1955",
      archivo: "The_Big_Combo_1955/Big_Combo_1955.mp4",
    },
    {
      tmdb: "2981",
      imdb: "tt0016039",
      titulo: "El mundo perdido",
      anio: "1925",
      identificador: "TheLostWorld1925",
      archivo: "TheLostWorld1925/TheLostWorld1925_512.mp4",
    },
    {
      tmdb: "22596",
      imdb: "tt0014429",
      titulo: "El hombre mosca",
      anio: "1923",
      identificador: "SafetyLastHaroldLloyd1923.FullMovieexcellentQuality.",
      archivo:
        "SafetyLastHaroldLloyd1923.FullMovieexcellentQuality./Safety Last - Harold Lloyd 1923. Full movie,excellent quality..mp4",
    },
  ];

  /** Minúsculas, sin tildes y sin signos: para comparar títulos. */
  function normalizar(valor) {
    return String(valor || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function rutaCodificada(item) {
    return item.archivo.split("/").map(encodeURIComponent).join("/");
  }

  /** URL reproducible del MP4. */
  function url(item) {
    if (!item) return "";
    return BASE + rutaCodificada(item);
  }

  /** Página del ítem en Internet Archive (fuente y descarga). */
  function ficha(item) {
    if (!item) return "";
    return FICHA + encodeURIComponent(item.identificador);
  }

  /** Miniatura que sirve Internet Archive para el ítem. */
  function miniatura(item) {
    if (!item) return "";
    return MINIATURA + encodeURIComponent(item.identificador);
  }

  /**
   * Busca la copia de dominio público de una ficha.
   * Prioriza el id exacto (TMDB o IMDb) y, si no hay, título + año.
   */
  function buscar(id, titulo, anio) {
    const clave = String(id || "").trim();
    if (clave) {
      const exacto = CATALOGO.find(
        (item) => "tmdb-movie-" + item.tmdb === clave || item.imdb === clave
      );
      if (exacto) return exacto;
    }

    const nombre = normalizar(titulo);
    if (!nombre) return null;

    const anyo = String(anio || "").trim().slice(0, 4);
    return (
      CATALOGO.find(
        (item) => normalizar(item.titulo) === nombre && (!anyo || item.anio === anyo)
      ) || null
    );
  }

  function listar() {
    return CATALOGO.slice();
  }

  window.CINEMA = window.CINEMA || {};
  window.CINEMA.dominioPublico = {
    buscar,
    listar,
    normalizar,
    url,
    ficha,
    miniatura,
  };
})();
