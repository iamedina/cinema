/**
 * CINEMA · perfiles locales
 * ------------------------------------------------------------
 * Varios perfiles en el mismo navegador, sin cuentas ni servidor.
 * Cada perfil tiene su propia Mi lista, historial y progreso; los
 * ajustes (cinema:ajustes:v1) son globales.
 *
 * Claves:
 *   cinema:perfiles:v1            registro de perfiles
 *   cinema:<perfil>:<dato>:v1     datos del perfil
 *
 * Los datos que existían antes de los perfiles se migran al perfil
 * «Principal» la primera vez que se carga el módulo.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  const CLAVE = "cinema:perfiles:v1";
  const VERSION = 1;
  const MAX = 8;
  const MAX_NOMBRE = 20;
  const ID_DEFECTO = "principal";
  const NOMBRE_DEFECTO = "Principal";
  const DATOS = ["favoritos", "historial", "progreso"];
  const CLAVES_GLOBALES = ["cinema:ajustes:v1", CLAVE];

  const COLORES = [
    { id: "azul", nombre: "Azul", hex: "#0d6efd" },
    { id: "verde", nombre: "Verde", hex: "#198754" },
    { id: "ambar", nombre: "Ámbar", hex: "#a16207" },
    { id: "rosa", nombre: "Rosa", hex: "#c2185b" },
    { id: "violeta", nombre: "Violeta", hex: "#6f42c1" },
    { id: "turquesa", nombre: "Turquesa", hex: "#0f766e" },
  ];

  const oyentes = [];
  let registro = null;
  let cajaAvatar = null;
  let recargaSolicitada = false;

  /* ============================================================
   * Utilidades
   * ========================================================== */

  function esObjeto(valor) {
    return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
  }

  function escapeHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => {
      switch (c) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        default: return "&#39;";
      }
    });
  }

  function limpiarNombre(valor) {
    return String(valor ?? "").replace(/\s+/g, " ").trim();
  }

  function recortar(texto, maximo) {
    const puntos = Array.from(texto);
    return puntos.length > maximo ? puntos.slice(0, maximo).join("").trim() : texto;
  }

  /** Primera letra visible del nombre, sin tildes y en mayúscula. */
  function inicial(nombre) {
    const limpio = limpiarNombre(nombre)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const primero = Array.from(limpio)[0];
    return primero ? primero.toLocaleUpperCase("es") : "?";
  }

  function colorValido(id) {
    return COLORES.some((color) => color.id === id) ? id : COLORES[0].id;
  }

  function colorDe(perfil) {
    return COLORES.find((color) => color.id === (perfil && perfil.color)) || COLORES[0];
  }

  function idNuevo() {
    return (
      "p-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 7)
    );
  }

  /* ============================================================
   * Claves
   * ========================================================== */

  function claveCruda(nombre, version) {
    return "cinema:" + nombre + ":v" + (version || 1);
  }

  function clavePerfil(id, nombre, version) {
    return "cinema:" + id + ":" + nombre + ":v" + (version || 1);
  }

  /** Clave real de un dato para el perfil activo (la usa js/almacen.js). */
  function clave(nombre, version) {
    const base = claveCruda(nombre, version);
    if (CLAVES_GLOBALES.indexOf(base) !== -1) return base;

    const activo = registro && registro.activo;
    return activo ? clavePerfil(activo, nombre, version) : base;
  }

  /** true si una clave de localStorage pertenece a este perfil o es global. */
  function aceptaClave(claveReal) {
    if (CLAVES_GLOBALES.indexOf(claveReal) !== -1) return true;

    const activo = registro && registro.activo;
    return Boolean(activo) && claveReal.indexOf("cinema:" + activo + ":") === 0;
  }

  /* ============================================================
   * Persistencia
   * ========================================================== */

  function leerClave(claveReal) {
    try {
      return window.localStorage.getItem(claveReal);
    } catch {
      return null;
    }
  }

  function escribirClave(claveReal, valor) {
    try {
      window.localStorage.setItem(claveReal, valor);
      return true;
    } catch (error) {
      console.warn("CINEMA · no se pudo guardar «" + claveReal + "»:", error.message);
      return false;
    }
  }

  function borrarClave(claveReal) {
    try {
      window.localStorage.removeItem(claveReal);
    } catch {
      /* almacenamiento bloqueado */
    }
  }

  function leerRegistro() {
    try {
      const crudo = window.localStorage.getItem(CLAVE);
      return crudo ? JSON.parse(crudo) : null;
    } catch {
      return null;
    }
  }

  function guardar() {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(registro));
      return true;
    } catch (error) {
      console.warn("CINEMA · no se pudieron guardar los perfiles:", error.message);
      return false;
    }
  }

  function perfilDefecto() {
    return {
      id: ID_DEFECTO,
      nombre: NOMBRE_DEFECTO,
      color: COLORES[0].id,
      creado: Date.now(),
    };
  }

  function normalizar(valor) {
    const base = esObjeto(valor) ? valor : {};
    const lista = [];
    const vistos = new Set();

    for (const bruto of Array.isArray(base.lista) ? base.lista : []) {
      if (!esObjeto(bruto)) continue;

      const id = String(bruto.id || "").trim();
      const nombre = recortar(limpiarNombre(bruto.nombre), MAX_NOMBRE);
      if (!/^[a-z0-9-]+$/.test(id) || !nombre || vistos.has(id)) continue;

      vistos.add(id);
      lista.push({
        id,
        nombre,
        color: colorValido(bruto.color),
        creado: Number(bruto.creado) || 0,
      });

      if (lista.length >= MAX) break;
    }

    if (!lista.length) lista.push(perfilDefecto());

    let activo = String(base.activo || "");
    if (!lista.some((perfil) => perfil.id === activo)) activo = lista[0].id;

    return { version: VERSION, activo, lista };
  }

  /* ============================================================
   * Migración de los datos anteriores a los perfiles
   * ========================================================== */

  function migrarDatosDe(perfil) {
    let copiados = 0;

    for (const dato of DATOS) {
      const legado = claveCruda(dato, 1);
      const destino = clavePerfil(perfil.id, dato, 1);
      const valor = leerClave(legado);

      if (valor === null) continue;
      if (leerClave(destino) !== null) continue;
      if (!escribirClave(destino, valor)) continue;

      borrarClave(legado);
      copiados += 1;
    }

    return copiados;
  }

  function migrar() {
    const guardado = leerRegistro();
    const teniaLista = Boolean(
      guardado && Array.isArray(guardado.lista) && guardado.lista.length
    );

    registro = normalizar(guardado);

    const activo = registro.lista.find((perfil) => perfil.id === registro.activo);
    const copiados = !teniaLista && activo ? migrarDatosDe(activo) : 0;

    guardar();
    return { migrado: !teniaLista, copiados };
  }

  /* ============================================================
   * Consulta y cambios
   * ========================================================== */

  function actual() {
    const perfil =
      registro.lista.find((item) => item.id === registro.activo) || registro.lista[0];
    return { ...perfil };
  }

  function listar() {
    return registro.lista
      .slice()
      .sort((a, b) => a.creado - b.creado)
      .map((perfil) => ({ ...perfil }));
  }

  function buscar(id) {
    return registro.lista.find((perfil) => perfil.id === id) || null;
  }

  function validarNombre(nombre, exceptoId) {
    const limpio = limpiarNombre(nombre);

    if (!limpio) {
      return { ok: false, error: "Escribe un nombre para el perfil." };
    }
    if (Array.from(limpio).length > MAX_NOMBRE) {
      return {
        ok: false,
        error: "El nombre no puede pasar de " + MAX_NOMBRE + " caracteres.",
      };
    }

    const repetido = registro.lista.some(
      (perfil) =>
        perfil.id !== exceptoId &&
        perfil.nombre.toLocaleLowerCase("es") === limpio.toLocaleLowerCase("es")
    );
    if (repetido) {
      return { ok: false, error: "Ya existe un perfil con ese nombre." };
    }

    return { ok: true, nombre: limpio };
  }

  function notificar() {
    for (const callback of oyentes) {
      try {
        callback(actual());
      } catch (error) {
        console.error("CINEMA · error en un oyente de perfiles:", error);
      }
    }
  }

  function recargar() {
    if (recargaSolicitada) return;
    recargaSolicitada = true;

    try {
      if (
        typeof location !== "undefined" &&
        location &&
        typeof location.reload === "function"
      ) {
        location.reload();
      }
    } catch {
      /* sin recarga disponible (pruebas o navegador restringido) */
    }
  }

  function crear(nombre, color) {
    const validado = validarNombre(nombre);
    if (!validado.ok) return validado;

    if (registro.lista.length >= MAX) {
      return {
        ok: false,
        error: "No puedes tener más de " + MAX + " perfiles.",
      };
    }

    const perfil = {
      id: idNuevo(),
      nombre: validado.nombre,
      color: colorValido(color),
      creado: Date.now(),
    };

    registro.lista.push(perfil);
    guardar();
    notificar();
    return { ok: true, perfil: { ...perfil } };
  }

  function renombrar(id, nombre) {
    const perfil = buscar(id);
    if (!perfil) return { ok: false, error: "Ese perfil ya no existe." };

    const validado = validarNombre(nombre, id);
    if (!validado.ok) return validado;

    perfil.nombre = validado.nombre;
    guardar();
    notificar();
    return { ok: true, perfil: { ...perfil } };
  }

  function eliminar(id) {
    const indice = registro.lista.findIndex((perfil) => perfil.id === id);
    if (indice < 0) return { ok: false, error: "Ese perfil ya no existe." };

    if (registro.lista.length === 1) {
      return { ok: false, error: "No puedes borrar el único perfil." };
    }

    const eraActivo = registro.activo === id;
    registro.lista.splice(indice, 1);

    for (const dato of DATOS) borrarClave(clavePerfil(id, dato, 1));

    if (eraActivo) registro.activo = registro.lista[0].id;

    guardar();
    notificar();

    if (eraActivo) recargar();
    return { ok: true, recarga: eraActivo, activo: registro.activo };
  }

  function cambiar(id) {
    const perfil = buscar(id);
    if (!perfil) return { ok: false, error: "Ese perfil ya no existe." };

    if (registro.activo === id) {
      return { ok: true, recarga: false, perfil: { ...perfil } };
    }

    registro.activo = id;
    guardar();
    notificar();
    recargar();
    return { ok: true, recarga: true, perfil: { ...perfil } };
  }

  function alCambiar(callback) {
    if (typeof callback !== "function") return () => {};
    oyentes.push(callback);
    return () => {
      const indice = oyentes.indexOf(callback);
      if (indice >= 0) oyentes.splice(indice, 1);
    };
  }

  /* ============================================================
   * Avatar de la cabecera
   * ========================================================== */

  function cerrarMenu() {
    if (!cajaAvatar) return;
    const menu = cajaAvatar.querySelector("[data-perfil-menu]");
    const boton = cajaAvatar.querySelector("[data-perfil-avatar]");
    if (menu) menu.hidden = true;
    if (boton) boton.setAttribute("aria-expanded", "false");
  }

  function abrirMenu() {
    if (!cajaAvatar) return;
    const menu = cajaAvatar.querySelector("[data-perfil-menu]");
    const boton = cajaAvatar.querySelector("[data-perfil-avatar]");
    if (!menu || !boton) return;

    menu.hidden = false;
    boton.setAttribute("aria-expanded", "true");

    const activo = menu.querySelector(".perfil-menu-item.activo") || menu.querySelector("button");
    if (activo) activo.focus();
  }

  function pintarAvatar() {
    if (!cajaAvatar) return;

    const perfil = actual();
    const color = colorDe(perfil);
    const boton = cajaAvatar.querySelector("[data-perfil-avatar]");
    const menu = cajaAvatar.querySelector("[data-perfil-menu]");
    if (!boton || !menu) return;

    boton.style.setProperty("--perfil-color", color.hex);
    boton.setAttribute("aria-label", "Perfil: " + perfil.nombre + ". Cambiar de perfil");
    boton.setAttribute("title", "Perfil: " + perfil.nombre);

    const letra = boton.querySelector(".perfil-inicial");
    if (letra) letra.textContent = inicial(perfil.nombre);

    menu.innerHTML =
      '<p class="perfil-menu-titulo">Perfiles</p>' +
      registro.lista
        .map((item) => {
          const activo = item.id === perfil.id;
          return (
            '<button type="button" role="menuitem" class="perfil-menu-item' +
            (activo ? " activo" : "") +
            '" data-perfil-id="' +
            escapeHtml(item.id) +
            '"' +
            (activo ? ' aria-current="true"' : "") +
            ">" +
            '<span class="perfil-mini" style="--perfil-color:' +
            colorDe(item).hex +
            '" aria-hidden="true">' +
            escapeHtml(inicial(item.nombre)) +
            "</span>" +
            '<span class="perfil-menu-nombre">' +
            escapeHtml(item.nombre) +
            "</span>" +
            '<i class="bi bi-check2" aria-hidden="true"></i>' +
            "</button>"
          );
        })
        .join("") +
      '<a class="perfil-menu-gestionar" href="ajustes.html#perfiles">' +
      '<i class="bi bi-sliders" aria-hidden="true"></i> Gestionar perfiles</a>';
  }

  function montarAvatar() {
    if (typeof document === "undefined" || !document.querySelector) return null;

    const contenedor = document.querySelector(".login-div");
    if (!contenedor) return null;

    cajaAvatar = contenedor.querySelector("[data-perfil-cabecera]");
    if (!cajaAvatar) {
      cajaAvatar = document.createElement("div");
      cajaAvatar.className = "perfil-cabecera";
      cajaAvatar.setAttribute("data-perfil-cabecera", "");
      cajaAvatar.innerHTML =
        '<button type="button" class="perfil-avatar" data-perfil-avatar ' +
        'aria-haspopup="true" aria-expanded="false">' +
        '<span class="perfil-inicial"></span></button>' +
        '<div class="perfil-menu" data-perfil-menu role="menu" hidden></div>';

      contenedor.insertBefore(cajaAvatar, contenedor.firstChild);

      const boton = cajaAvatar.querySelector("[data-perfil-avatar]");
      const menu = cajaAvatar.querySelector("[data-perfil-menu]");

      boton.addEventListener("click", () => {
        if (menu.hidden) abrirMenu();
        else cerrarMenu();
      });

      menu.addEventListener("click", (evento) => {
        const item = evento.target.closest("[data-perfil-id]");
        if (!item) {
          if (evento.target.closest(".perfil-menu-gestionar")) cerrarMenu();
          return;
        }

        const resultado = cambiar(item.getAttribute("data-perfil-id"));
        if (!resultado.ok) return;
        cerrarMenu();
      });

      cajaAvatar.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
          evento.preventDefault();
          cerrarMenu();
          boton.focus();
        }
      });

      document.addEventListener("click", (evento) => {
        if (!cajaAvatar.contains(evento.target)) cerrarMenu();
      });

      document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && menu && !menu.hidden) cerrarMenu();
      });
    }

    pintarAvatar();
    return cajaAvatar;
  }

  /* ============================================================
   * Cambios hechos en otra pestaña
   * ========================================================== */

  window.addEventListener("storage", (evento) => {
    if (!evento || evento.key !== CLAVE) return;

    const anterior = registro && registro.activo;
    let valor = null;
    try {
      valor = evento.newValue ? JSON.parse(evento.newValue) : null;
    } catch {
      valor = null;
    }

    registro = normalizar(valor);

    if (anterior && registro.activo !== anterior) {
      recargar();
      return;
    }

    pintarAvatar();
    notificar();
  });

  /* ============================================================
   * Arranque
   * ========================================================== */

  migrar();

  CINEMA.perfiles = {
    CLAVE,
    VERSION,
    MAX,
    MAX_NOMBRE,
    COLORES,
    DATOS,
    clave,
    aceptaClave,
    actual,
    listar,
    buscar,
    validarNombre,
    crear,
    renombrar,
    eliminar,
    cambiar,
    inicial,
    colorDe,
    migrar,
    montarAvatar,
    alCambiar,
  };

  montarAvatar();
})();
