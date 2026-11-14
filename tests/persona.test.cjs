"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

const UBICACION = {
  protocol: "http:",
  search: "",
  pathname: "/persona.html",
  origin: "http://127.0.0.1:8080",
};

function crearApi(payload) {
  const llamadas = [];

  const api = cargar(["js/api.js"], {
    location: UBICACION,
    fetch: async (url) => {
      const destino = String(url);
      llamadas.push(destino);

      if (destino.includes("/api/health")) {
        return { ok: true, status: 200, json: async () => ({ tmdb: true, omdb: false }) };
      }

      return { ok: true, status: 200, json: async () => payload };
    },
  }).CINEMA.api;

  return { api, llamadas };
}

const PERSONA = {
  id: 287,
  name: "Brad Pitt",
  known_for_department: "Acting",
  biography: "Actor y productor estadounidense.",
  birthday: "1963-12-18",
  deathday: null,
  place_of_birth: "Shawnee, Oklahoma, Estados Unidos",
  profile_path: "/perfil.jpg",
  external_ids: { imdb_id: "nm0000093" },
  combined_credits: {
    cast: [
      {
        id: 550,
        media_type: "movie",
        title: "El club de la lucha",
        release_date: "1999-10-15",
        poster_path: "/club.jpg",
        character: "Tyler Durden",
      },
      {
        id: 1399,
        media_type: "tv",
        name: "Juego de tronos",
        first_air_date: "2011-04-17",
        poster_path: null,
        character: "Invitado",
      },
      {
        id: 550,
        media_type: "movie",
        title: "El club de la lucha",
        release_date: "1999-10-15",
        poster_path: "/club.jpg",
        character: "Tyler Durden",
      },
    ],
    crew: [
      {
        id: 550,
        media_type: "movie",
        title: "El club de la lucha",
        release_date: "1999-10-15",
        job: "Productor",
      },
      {
        id: 603,
        media_type: "movie",
        title: "Matrix",
        release_date: "1999-03-31",
        poster_path: "/matrix.jpg",
        job: "Director",
      },
    ],
  },
};

test("normaliza la ficha de una persona y su filmografía", async () => {
  const { api, llamadas } = crearApi(PERSONA);
  const datos = await api.persona("tmdb-person-287");

  assert.equal(datos.id, "tmdb-person-287");
  assert.equal(datos.nombre, "Brad Pitt");
  assert.equal(datos.departamento, "Acting");
  assert.equal(datos.nacimiento, "1963-12-18");
  assert.equal(datos.fallecimiento, null);
  assert.equal(datos.lugar, "Shawnee, Oklahoma, Estados Unidos");
  assert.equal(datos.foto, "https://image.tmdb.org/t/p/w185/perfil.jpg");
  assert.equal(datos.imdbId, "nm0000093");

  /* La duplicada entre reparto y equipo se cuenta una sola vez. */
  assert.equal(datos.filmografia.length, 3);
  assert.deepEqual(
    datos.filmografia.map((i) => i.titulo),
    ["Juego de tronos", "El club de la lucha", "Matrix"]
  );

  const club = datos.filmografia.find((i) => i.titulo === "El club de la lucha");
  assert.equal(club.id, "tmdb-movie-550");
  assert.equal(club.anio, "1999");
  assert.equal(club.tipo, "movie");
  assert.equal(club.papel, "Tyler Durden");
  assert.equal(club.poster, "https://image.tmdb.org/t/p/w500/club.jpg");

  const serie = datos.filmografia.find((i) => i.titulo === "Juego de tronos");
  assert.equal(serie.id, "tmdb-tv-1399");
  assert.equal(serie.tipo, "series");
  assert.equal(serie.poster, null);

  const peticion = llamadas.find((u) => u.includes("/api/tmdb/person/287"));
  assert.ok(peticion, "debe pedir la persona al proxy");
  assert.match(peticion, /append_to_response=combined_credits,external_ids,images/);
});

test("acepta el id numérico y rechaza ids que no son de persona", async () => {
  const { api } = crearApi(PERSONA);

  assert.equal((await api.persona("287")).nombre, "Brad Pitt");
  assert.equal(await api.persona("tmdb-movie-603"), null);
  assert.equal(await api.persona(""), null);
});

test("devuelve null si TMDB no responde", async () => {
  /* Sin clave de TMDB el proxy responde 503: tmdb() devuelve null. */
  const sinTmdb = cargar(["js/api.js"], {
    location: UBICACION,
    fetch: async (url) =>
      String(url).includes("/api/health")
        ? { ok: true, status: 200, json: async () => ({ tmdb: false, omdb: false }) }
        : { ok: false, status: 503, json: async () => ({}) },
  }).CINEMA.api;

  assert.equal(await sinTmdb.persona("tmdb-person-287"), null);
});
