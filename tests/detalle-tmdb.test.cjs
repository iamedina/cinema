"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

const UBICACION = {
  protocol: "http:",
  search: "",
  pathname: "/descripcion.html",
  origin: "http://127.0.0.1:8080",
};

function crearApi(rutas) {
  const llamadas = [];

  const api = cargar(["js/api.js"], {
    location: UBICACION,
    fetch: async (url) => {
      const destino = String(url);
      llamadas.push(destino);

      if (destino.includes("/api/health")) {
        return { ok: true, status: 200, json: async () => ({ tmdb: true, omdb: false }) };
      }

      for (const [fragmento, payload] of Object.entries(rutas)) {
        if (destino.includes(fragmento)) {
          if (payload === null) {
            return { ok: false, status: 404, json: async () => ({}) };
          }
          return { ok: true, status: 200, json: async () => payload };
        }
      }

      return { ok: false, status: 404, json: async () => ({}) };
    },
  }).CINEMA.api;

  return { api, llamadas };
}

function video(extra) {
  return {
    site: "YouTube",
    key: "clave",
    type: "Trailer",
    official: false,
    iso_639_1: "es",
    name: "Trailer",
    ...extra,
  };
}

function pelicula(extra) {
  return {
    id: 603,
    title: "Matrix",
    release_date: "1999-03-31",
    poster_path: "/matrix.jpg",
    videos: { results: [] },
    credits: { cast: [], crew: [] },
    similar: { results: [] },
    recommendations: { results: [] },
    images: { backdrops: [] },
    ...extra,
  };
}

test("prioriza tráiler oficial latino y, si no hay, el oficial de España", async () => {
  const { api } = crearApi({
    "/api/tmdb/movie/603": pelicula({
      videos: {
        results: [
          video({ key: "latino-no-oficial", name: "Trailer latino", official: false }),
          video({ key: "espana-oficial", name: "Tráiler oficial español", official: true }),
          video({ key: "latino-oficial", name: "Teaser oficial latino", official: true, type: "Teaser" }),
          video({ key: "ingles-oficial", name: "Official trailer", official: true, iso_639_1: "en" }),
        ],
      },
    }),
  });

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.trailerKey, "latino-oficial");
  assert.equal(datos.trailerEtiqueta, "Tráiler oficial (latino)");
});

test("sin opción latina usa el tráiler oficial de España antes que uno no oficial", async () => {
  const { api } = crearApi({
    "/api/tmdb/movie/603": pelicula({
      videos: {
        results: [
          video({ key: "latino-no-oficial", name: "Trailer latino", official: false }),
          video({ key: "espana-oficial", name: "Tráiler oficial", official: true }),
        ],
      },
    }),
  });

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.trailerKey, "espana-oficial");
  assert.equal(datos.trailerEtiqueta, "Tráiler oficial (España)");
});

test("penaliza los tráilers subtitulados y etiqueta el inglés", async () => {
  const { api } = crearApi({
    "/api/tmdb/movie/603": pelicula({
      videos: {
        results: [
          video({ key: "subtitulado", name: "Trailer subtitulado", official: true }),
          video({ key: "audio", name: "Trailer", official: true }),
        ],
      },
    }),
  });

  assert.equal((await api.detalle("tmdb-movie-603")).trailerKey, "audio");

  const ingles = crearApi({
    "/api/tmdb/movie/603": pelicula({
      videos: {
        results: [video({ key: "en", name: "Official trailer", official: true, iso_639_1: "en" })],
      },
    }),
  }).api;

  const datos = await ingles.detalle("tmdb-movie-603");
  assert.equal(datos.trailerKey, "en");
  assert.equal(datos.trailerEtiqueta, "Tráiler oficial (inglés)");
});

test("prefiere un tráiler oficial en inglés antes que uno español no oficial", async () => {
  const { api } = crearApi({
    "/api/tmdb/movie/603": pelicula({
      videos: {
        results: [
          video({ key: "es-no-oficial", name: "TRAILER Matrix", official: false }),
          video({ key: "en-oficial", name: "Official 4K Trailer", official: true, iso_639_1: "en" }),
        ],
      },
    }),
  });

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.trailerKey, "en-oficial");
  assert.equal(datos.trailerEtiqueta, "Tráiler oficial (inglés)");
});

test("pide los vídeos en español, inglés y sin idioma al detalle", async () => {
  const { api, llamadas } = crearApi({ "/api/tmdb/movie/603": pelicula() });

  await api.detalle("tmdb-movie-603");

  assert.ok(
    llamadas.some((u) => u.includes("include_video_language=es,en,null")),
    "debe pedir vídeos en es, en y null"
  );
});

test("coloca primero la saga o trilogía y luego recomendaciones sin duplicados", async () => {
  const { api, llamadas } = crearApi({
    "/api/tmdb/collection/2344": {
      id: 2344,
      name: "The Matrix Collection",
      parts: [
        { id: 606, title: "Matrix Resurrections", release_date: "2021-12-22" },
        { id: 603, title: "Matrix", release_date: "1999-03-31" },
        { id: 605, title: "Matrix Revolutions", release_date: "2003-11-05" },
        { id: 604, title: "Matrix Reloaded", release_date: "2003-05-15" },
      ],
    },
    "/api/tmdb/movie/603": pelicula({
      belongs_to_collection: { id: 2344, name: "The Matrix Collection" },
      recommendations: {
        results: [
          { id: 27205, title: "Origen", release_date: "2010-07-16", media_type: "movie" },
          { id: 604, title: "Matrix Reloaded", release_date: "2003-05-15", media_type: "movie" },
        ],
      },
      similar: {
        results: [
          { id: 155, title: "El caballero oscuro", release_date: "2008-07-16", media_type: "movie" },
          { id: 603, title: "Matrix", release_date: "1999-03-31", media_type: "movie" },
        ],
      },
    }),
  });

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.saga, "The Matrix Collection");
  assert.deepEqual(
    datos.similares.map((i) => i.titulo),
    ["Matrix Reloaded", "Matrix Revolutions", "Matrix Resurrections", "Origen", "El caballero oscuro"]
  );
  assert.ok(
    llamadas.some((u) => u.includes("/api/tmdb/collection/2344")),
    "debe pedir la colección al proxy"
  );
});

test("si la colección falla, la ficha sigue con recomendaciones", async () => {
  const { api } = crearApi({
    "/api/tmdb/collection/2344": null,
    "/api/tmdb/movie/603": pelicula({
      belongs_to_collection: { id: 2344, name: "The Matrix Collection" },
      recommendations: {
        results: [{ id: 27205, title: "Origen", release_date: "2010-07-16" }],
      },
    }),
  });

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.saga, null);
  assert.deepEqual(datos.similares.map((i) => i.titulo), ["Origen"]);
});

test("normaliza las temporadas de una serie", async () => {
  const { api } = crearApi({
    "/api/tmdb/tv/1399": {
      id: 1399,
      name: "Juego de tronos",
      first_air_date: "2011-04-17",
      number_of_seasons: 2,
      videos: { results: [] },
      credits: { cast: [], crew: [] },
      similar: { results: [] },
      recommendations: { results: [] },
      images: { backdrops: [] },
      seasons: [
        { season_number: 2, name: "Temporada 2", episode_count: 10, air_date: "2012-04-01", poster_path: "/t2.jpg" },
        { season_number: 0, name: "Especiales", episode_count: 2, air_date: "2010-12-05", poster_path: null },
        { season_number: 1, name: "Temporada 1", episode_count: 10, air_date: "2011-04-17", poster_path: "/t1.jpg" },
      ],
    },
  });

  const datos = await api.detalle("tmdb-tv-1399");

  assert.equal(datos.numeroTemporadas, 2);
  assert.deepEqual(datos.temporadas.map((t) => t.numero), [0, 1, 2]);
  assert.deepEqual(datos.temporadas.map((t) => t.nombre), ["Especiales", "Temporada 1", "Temporada 2"]);
  assert.equal(datos.temporadas[1].episodios, 10);
  assert.equal(datos.temporadas[1].poster, "https://image.tmdb.org/t/p/w500/t1.jpg");
});

test("carga y normaliza los episodios de una temporada", async () => {
  const { api, llamadas } = crearApi({
    "/api/tmdb/tv/1399/season/1": {
      season_number: 1,
      name: "Temporada 1",
      overview: "La primera temporada.",
      episodes: [
        {
          episode_number: 1,
          name: "Winter Is Coming",
          overview: "Ned Stark recibe una visita.",
          air_date: "2011-04-17",
          runtime: 62,
          still_path: "/still1.jpg",
          vote_average: 8.1,
        },
        {
          episode_number: 2,
          name: "The Kingsroad",
          overview: null,
          air_date: null,
          runtime: null,
          still_path: null,
          vote_average: 0,
        },
      ],
    },
  });

  const temporada = await api.temporada("tmdb-tv-1399", 1);

  assert.equal(temporada.numero, 1);
  assert.equal(temporada.episodios.length, 2);
  assert.equal(temporada.episodios[0].titulo, "Winter Is Coming");
  assert.equal(temporada.episodios[0].still, "https://image.tmdb.org/t/p/w300/still1.jpg");
  assert.equal(temporada.episodios[0].duracion, 62);
  assert.equal(temporada.episodios[0].rating, 8.1);
  assert.equal(temporada.episodios[1].still, null);
  assert.ok(
    llamadas.some((u) => u.includes("/api/tmdb/tv/1399/season/1")),
    "debe pedir la temporada al proxy"
  );
});

test("rechaza temporadas de títulos que no son series o con número inválido", async () => {
  const { api } = crearApi({});

  assert.equal(await api.temporada("tmdb-movie-603", 1), null);
  assert.equal(await api.temporada("tmdb-tv-1399", -1), null);
  assert.equal(await api.temporada("tmdb-tv-1399", "uno"), null);
  assert.equal(await api.temporada("", 1), null);
});

test("la galería solo incluye backdrops, nunca pósters ni duplicados", async () => {
  const { api } = crearApi({
    "/api/tmdb/movie/603": pelicula({
      images: {
        backdrops: [
          { file_path: "/bd1.jpg" },
          { file_path: "/bd2.jpg" },
          { file_path: "/bd1.jpg" },
        ],
        posters: [{ file_path: "/poster1.jpg" }],
      },
    }),
  });

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.galeria.length, 2);
  assert.ok(datos.galeria.every((img) => img.url.includes("bd") && !img.url.includes("poster")));
  assert.equal(new Set(datos.galeria.map((img) => img.url)).size, datos.galeria.length);
});
