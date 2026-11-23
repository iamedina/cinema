/**
 * CINEMA · service worker (solo origen propio).
 * ------------------------------------------------------------
 * · El HTML se busca primero en la red para no mostrar páginas obsoletas.
 * · CSS, JS, fuentes, iconos e imágenes se sirven desde caché y se
 *   actualizan en segundo plano (cache-first con revalidación).
 * · Nunca se cachean las respuestas /api/*: son datos cambiantes y
 *   además contendrían la respuesta del proxy con claves del servidor.
 */
"use strict";

const CACHE = "cinema-v2";
const NUCLEO = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/preferencias.js",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(NUCLEO))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves
            .filter((clave) => clave.startsWith("cinema-") && clave !== CACHE)
            .map((clave) => caches.delete(clave))
        )
      )
      .then(() => self.clients.claim())
  );
});

function guardar(solicitud, respuesta) {
  if (!respuesta || !respuesta.ok || respuesta.type === "opaque") return;
  const copia = respuesta.clone();
  caches.open(CACHE).then((cache) => cache.put(solicitud, copia));
}

self.addEventListener("fetch", (evento) => {
  const solicitud = evento.request;
  if (solicitud.method !== "GET") return;

  const url = new URL(solicitud.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (solicitud.mode === "navigate") {
    evento.respondWith(
      fetch(solicitud)
        .then((respuesta) => {
          guardar(solicitud, respuesta);
          return respuesta;
        })
        .catch(() =>
          caches.match(solicitud).then((guardada) => guardada || caches.match("/index.html"))
        )
    );
    return;
  }

  evento.respondWith(
    caches.match(solicitud).then((guardada) => {
      const fresca = fetch(solicitud)
        .then((respuesta) => {
          guardar(solicitud, respuesta);
          return respuesta;
        })
        .catch(() => guardada);

      return guardada || fresca;
    })
  );
});
