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

function crearApi(rutas, preferencias) {
  const llamadas = [];

  const { CINEMA } = cargar(["js/preferencias.js", "js/api.js"], {
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
  });

  if (preferencias) CINEMA.preferencias.guardar(preferencias);

  return { api: CINEMA.api, prefs: CINEMA.preferencias, llamadas };
}

function video(extra) {
  return {
    site: "YouTube",
    key: "clave",
    type: "Trailer",
    official: true,
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

test("el orden «España» prefiere el tráiler oficial de España sobre el latino", async () => {
  const { api } = crearApi(
    {
      "/api/tmdb/movie/603": pelicula({
        videos: {
          results: [
            video({ key: "latino", name: "Tráiler oficial latino" }),
            video({ key: "espana", name: "Tráiler oficial" }),
          ],
        },
      }),
    },
    { ordenTrailer: "espana" }
  );

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.trailerKey, "espana");
  assert.equal(datos.trailerEtiqueta, "Tráiler oficial (España)");
});

test("el orden «Inglés» prefiere el tráiler oficial en inglés", async () => {
  const { api } = crearApi(
    {
      "/api/tmdb/movie/603": pelicula({
        videos: {
          results: [
            video({ key: "espana", name: "Tráiler oficial" }),
            video({ key: "ingles", name: "Official trailer", iso_639_1: "en" }),
          ],
        },
      }),
    },
    { ordenTrailer: "ingles" }
  );

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.trailerKey, "ingles");
  assert.equal(datos.trailerEtiqueta, "Tráiler oficial (inglés)");
});

test("«Solo oficiales» descarta los tráilers no oficiales", async () => {
  const { api } = crearApi(
    {
      "/api/tmdb/movie/603": pelicula({
        videos: {
          results: [
            video({ key: "no-oficial", name: "Trailer latino", official: false }),
          ],
        },
      }),
    },
    { ordenTrailer: "solo-oficial" }
  );

  const datos = await api.detalle("tmdb-movie-603");

  assert.equal(datos.trailerKey, null);
  assert.equal(datos.trailerEtiqueta, null);
});

test("la región de Ajustes decide qué plataformas se muestran", async () => {
  const datos = {
    "/api/tmdb/movie/603": pelicula({
      "watch/providers": {
        results: {
          MX: {
            link: "https://www.themoviedb.org/movie/603/watch?locale=MX",
            flatrate: [{ provider_id: 1, provider_name: "Netflix México", logo_path: "/mx.jpg" }],
          },
          ES: {
            link: "https://www.themoviedb.org/movie/603/watch?locale=ES",
            flatrate: [{ provider_id: 2, provider_name: "Netflix España", logo_path: "/es.jpg" }],
          },
        },
      },
    }),
  };

  const mexico = crearApi(datos, { region: "MX" });
  const fichaMexico = await mexico.api.detalle("tmdb-movie-603");
  assert.equal(fichaMexico.proveedores.items[0].nombre, "Netflix México");
  assert.ok(fichaMexico.proveedores.enlace.includes("locale=MX"));

  const espana = crearApi(datos, { region: "ES" });
  const fichaEspana = await espana.api.detalle("tmdb-movie-603");
  assert.equal(fichaEspana.proveedores.items[0].nombre, "Netflix España");
  assert.ok(fichaEspana.proveedores.enlace.includes("locale=ES"));
});

test("si la región elegida no tiene datos se usa España y luego EE. UU.", async () => {
  const datos = {
    "/api/tmdb/movie/603": pelicula({
      "watch/providers": {
        results: {
          ES: {
            link: "https://www.themoviedb.org/movie/603/watch?locale=ES",
            flatrate: [{ provider_id: 2, provider_name: "Netflix España" }],
          },
          US: {
            link: "https://www.themoviedb.org/movie/603/watch?locale=US",
            flatrate: [{ provider_id: 3, provider_name: "Netflix USA" }],
          },
        },
      },
    }),
  };

  const ficha = await crearApi(datos, { region: "CO" }).api.detalle("tmdb-movie-603");
  assert.equal(ficha.proveedores.items[0].nombre, "Netflix España");
  assert.ok(ficha.proveedores.enlace.includes("locale=ES"));
});

test("el enlace de respaldo de JustWatch usa la región elegida", async () => {
  const datos = {
    "/api/tmdb/movie/603": pelicula({
      "watch/providers": {
        results: {
          MX: {
            flatrate: [{ provider_id: 999999, provider_name: "Plataforma local" }],
          },
        },
      },
    }),
  };

  const ficha = await crearApi(datos, { region: "MX" }).api.detalle("tmdb-movie-603");

  assert.equal(
    ficha.proveedores.items[0].enlace,
    "https://www.justwatch.com/mx/buscar?q=Matrix"
  );
});
