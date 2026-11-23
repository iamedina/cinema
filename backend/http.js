/**
 * Utilidades de respuesta HTTP compartidas por todas las capas del backend.
 */
"use strict";

/*
 * Cabeceras comunes a toda respuesta. No cambian el contenido: evitan
 * que el navegador adivine tipos, filtren el Referer y bloquean el
 * encuadre del sitio en otras páginas.
 */
const CABECERAS_SEGURIDAD = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
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

module.exports = { CABECERAS_SEGURIDAD, responder };
