/**
 * Utilidades para las pruebas: carga los scripts clásicos del sitio en
 * un contexto de Node con un `window` mínimo, sin navegador ni red.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.join(__dirname, "..");

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
    const codigo = fs.readFileSync(path.join(RAIZ, archivo), "utf8");
    vm.runInContext(codigo, contexto, { filename: archivo });
  }

  return { contexto, ventana, CINEMA: ventana.CINEMA, almacenamiento, oyentes };
}

function emitirStorage(oyentes, evento) {
  for (const callback of oyentes.storage || []) callback(evento);
}

module.exports = { RAIZ, cargar, crearLocalStorage, emitirStorage };
