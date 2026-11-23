/**
 * Utilidades de respuesta HTTP compartidas por todas las capas del backend.
 */
"use strict";

/*
 * Cabeceras comunes a toda respuesta. No cambian el contenido: evitan
 * que el navegador adivine tipos, filtren el Referer y bloquean el
 * encuadre del sitio en otras páginas.
 */
/*
 * La política de contenido permite los recursos propios, los estilos en línea
 * que ya usa la interfaz (atributos style y el color de cada perfil) y los
 * orígenes concretos de pósters, fuentes, vídeo y tráilers. No permite scripts
 * en línea ni objetos incrustados.
 */
const POLITICA_CONTENIDO = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https://image.tmdb.org https://i.ytimg.com https://archive.org https://*.archive.org",
  "media-src 'self' https://archive.org https://*.archive.org",
  "connect-src 'self'",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://archive.org https://*.archive.org",
].join("; ");

const CABECERAS_SEGURIDAD = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": POLITICA_CONTENIDO,
};

function responder(res, status, cuerpo, cabeceras = {}) {
  res.writeHead(status, {
    ...CABECERAS_SEGURIDAD,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...cabeceras,
  });
  res.end(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo));
}

module.exports = { CABECERAS_SEGURIDAD, POLITICA_CONTENIDO, responder };
