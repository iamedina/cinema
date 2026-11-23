/**
 * Utilidades para las pruebas: carga los scripts clásicos del sitio en
 * un contexto de Node con un `window` mínimo, sin navegador ni red.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.join(__dirname, "..");
const FRONT = path.join(RAIZ, "frontend");
const BACK = path.join(RAIZ, "backend");

/** Resuelve una ruta del proyecto según la capa a la que pertenece. */
function resolver(relativo) {
  if (/^(js|css|img|vendor)\//.test(relativo) || relativo.endsWith(".html")) {
    return path.join(FRONT, relativo);
  }
  if (relativo.startsWith("frontend/") || relativo.startsWith("backend/")) {
    return path.join(RAIZ, relativo);
  }
  return path.join(RAIZ, relativo);
}

/**
 * Devuelve el CSS completo tal como lo ve el navegador: la hoja de entrada
 * más sus @import locales, en el mismo orden. El @import de Google Fonts
 * se ignora porque no aporta reglas que revisiones aquí.
 */
function leerCssCompleto() {
  const visitados = new Set();

  function expandir(relativo) {
    const absoluto = resolver(relativo);
    if (visitados.has(absoluto)) return "";
    visitados.add(absoluto);

    const texto = fs.readFileSync(absoluto, "utf8");
    const imports = [...texto.matchAll(/@import\s+url\("([^"]+)"\)\s*;/g)];
    const locales = imports
      .map((m) => m[1])
      .filter((ruta) => !/^https?:\/\//i.test(ruta));

    const base = texto.replace(/@import\s+url\("[^"]+"\)\s*;\s*/g, "");
    return locales.reduce((acc, ruta) => {
      const relativoImport = path.posix.join(path.posix.dirname(relativo), ruta);
      return acc + expandir(relativoImport);
    }, base);
  }

  return expandir("css/style.css");
}

function crearLocalStorage() {
  const datos = new Map();

  return {
    getItem(clave) {
      return datos.has(clave) ? datos.get(clave) : null;
    },
    setItem(clave, valor) {
      datos.set(clave, String(valor));
    },
    removeItem(clave) {
      datos.delete(clave);
    },
    clear() {
      datos.clear();
    },
    key(indice) {
      return [...datos.keys()][indice] ?? null;
    },
    get length() {
      return datos.size;
    },
    _datos: datos,
  };
}

function cargar(archivos, opciones = {}) {
  const almacenamiento = opciones.localStorage || crearLocalStorage();
  const oyentes = {};

  const location = opciones.location || {
    protocol: "http:",
    search: "",
    pathname: "/",
    origin: "http://127.0.0.1:8080",
  };

  const ventana = {
    localStorage: almacenamiento,
    location,
    addEventListener(tipo, callback) {
      oyentes[tipo] = oyentes[tipo] || [];
      oyentes[tipo].push(callback);
    },
    removeEventListener() {},
    matchMedia: opciones.matchMedia || (() => ({ matches: false })),
  };
  ventana.window = ventana;

  const contexto = vm.createContext({
    window: ventana,
    document: opciones.document,
    console,
    location,
    history: opciones.history,
    fetch: opciones.fetch,
    sessionStorage: opciones.sessionStorage,
    FormData: opciones.FormData,
    URL,
    URLSearchParams,
    AbortSignal,
    setTimeout,
    clearTimeout,
    encodeURIComponent,
    decodeURIComponent,
  });

  for (const archivo of archivos) {
    const codigo = fs.readFileSync(resolver(archivo), "utf8");
    vm.runInContext(codigo, contexto, { filename: archivo });
  }

  return { contexto, ventana, CINEMA: ventana.CINEMA, almacenamiento, oyentes };
}

function emitirStorage(oyentes, evento) {
  for (const callback of oyentes.storage || []) callback(evento);
}

module.exports = {
  RAIZ,
  FRONT,
  BACK,
  resolver,
  leerCssCompleto,
  cargar,
  crearLocalStorage,
  emitirStorage,
};
