/**
 * CINEMA · archivos estáticos
 * ------------------------------------------------------------
 * Solo se sirve lo que hay dentro de frontend/. El backend y sus
 * credenciales quedan fuera de la raíz web.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function crearPathSeguro(raiz) {
  return function pathSeguro(relativo) {
    const normalizado = path.normalize(relativo).replace(/^(\.\.[/\\])+/, "");
    const absoluto = path.join(raiz, normalizado);
    return absoluto.startsWith(raiz) ? absoluto : null;
  };
}

function crearEstatico({ raiz, cabecerasSeguridad }) {
  const pathSeguro = crearPathSeguro(raiz);

  /** 404: sirve la página propia del sitio y, si falta, una respuesta mínima. */
  function responder404(res) {
    let html = null;
    try {
      html = fs.readFileSync(path.join(raiz, "404.html"));
    } catch {
      html = null;
    }

    res.writeHead(404, {
      ...cabecerasSeguridad,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });

    if (html) return res.end(html);

    res.end(
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
        "<title>No encontrado | CINEMA</title>" +
        '<meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
        '<body style="background:#000;color:#fff;font-family:sans-serif;display:flex;min-height:100vh;' +
        'align-items:center;justify-content:center;flex-direction:column;gap:16px">' +
        "<h1>404</h1><p>La página que buscas no existe.</p>" +
        '<a style="color:#0d6efd" href="/">Volver al inicio</a></body></html>'
    );
  }

  function servirArchivo(res, pathname, responder) {
    const relativo = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const absoluto = pathSeguro(relativo);

    if (!absoluto) return responder(res, 403, "Prohibido");

    let datos = null;
    try {
      if (fs.existsSync(absoluto) && fs.statSync(absoluto).isFile()) {
        datos = fs.readFileSync(absoluto);
      }
    } catch {
      datos = null;
    }

    if (!datos) return responder404(res);

    const tipo = MIME[path.extname(absoluto).toLowerCase()] || "application/octet-stream";
    /* Vendor e imágenes locales casi nunca cambian: se cachean con tiempo largo. */
    const cache = /^(vendor|img)\//.test(relativo)
      ? "public, max-age=31536000, immutable"
      : "no-cache";
    res.writeHead(200, { ...cabecerasSeguridad, "Content-Type": tipo, "Cache-Control": cache });
    res.end(datos);
  }

  return { pathSeguro, responder404, servirArchivo, MIME };
}

module.exports = { crearPathSeguro, crearEstatico, MIME };
