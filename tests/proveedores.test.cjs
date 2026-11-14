"use strict";

const test = require("node:test");
const assert = require("node:assert");

const { cargar } = require("./ayuda.cjs");

function crearApi() {
  return cargar(["js/api.js"], {
    location: {
      protocol: "file:",
      search: "",
      pathname: "/",
      origin: "null",
    },
    fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }),
  }).CINEMA.api;
}

test("construye la búsqueda oficial de Netflix con el título codificado", () => {
  const enlace = crearApi().urlProveedor(8, "Nosferatu", "https://justwatch.example");

  assert.equal(enlace, "https://www.netflix.com/search?q=Nosferatu");
  assert.equal(
    crearApi().urlProveedor(8, "La noche de los muertos vivientes", ""),
    "https://www.netflix.com/search?q=La%20noche%20de%20los%20muertos%20vivientes"
  );
});

test("usa el respaldo de JustWatch para plataformas sin mapa", () => {
  const respaldo = "https://www.justwatch.com/es/pelicula/nosferatu";

  assert.equal(crearApi().urlProveedor(999999, "Nosferatu", respaldo), respaldo);
  assert.equal(crearApi().urlProveedor(8, "", respaldo), respaldo);
  assert.equal(crearApi().urlProveedor(null, "Nosferatu", ""), "");
});

test("cubre las plataformas más habituales", () => {
  const api = crearApi();

  assert.ok(api.urlProveedor(337, "Dune", "").startsWith("https://www.disneyplus.com/"));
  assert.ok(api.urlProveedor(384, "Dune", "").startsWith("https://www.max.com/"));
  assert.ok(api.urlProveedor(531, "Dune", "").startsWith("https://www.paramountplus.com/"));
  assert.ok(api.urlProveedor(63, "Dune", "").startsWith("https://www.filmin.es/"));
  assert.ok(api.urlProveedor(149, "Dune", "").startsWith("https://www.movistarplus.es/"));
  assert.ok(api.urlProveedor(283, "Dune", "").startsWith("https://www.crunchyroll.com/"));
});
