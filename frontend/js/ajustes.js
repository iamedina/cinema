/**
 * CINEMA · página de Ajustes (ajustes.html)
 * ------------------------------------------------------------
 * Conecta los controles con js/preferencias.js y muestra el estado
 * de los datos guardados. Todo ocurre en el navegador: no hay cuenta
 * ni se envía nada al servidor salvo la consulta de estado.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});
  const { preferencias, favoritos, historial, progreso, buscador, perfiles, ui } = CINEMA;

  const form = document.getElementById("formAjustes");
  if (!form || !preferencias) return;

  if (buscador) buscador.init();

  const escapeHtml = ui ? ui.escapeHtml : (valor) => String(valor ?? "");
  const estado = document.getElementById("ajustesEstado");
  const reducirAnimaciones = document.getElementById("reducirAnimaciones");
  const cargarTrailer = document.getElementById("cargarTrailer");
  const ordenTrailer = document.getElementById("ordenTrailer");
  const region = document.getElementById("region");
  const recordarProgreso = document.getElementById("recordarProgreso");
  const reanudacion = document.getElementById("reanudacion");
  const radiosTexto = Array.from(document.querySelectorAll('input[name="textoGrande"]'));
  const botonesBorrar = Array.from(document.querySelectorAll("[data-borrar]"));
  const exportar = document.getElementById("exportarDatos");
  const importar = document.getElementById("importarArchivo");
  const restablecer = document.getElementById("restablecerAjustes");
  const listaPerfiles = document.getElementById("listaPerfiles");
  const nuevoPerfil = document.getElementById("nuevoPerfil");
  const crearPerfil = document.getElementById("crearPerfil");
  const coloresPerfil = Array.from(document.querySelectorAll('input[name="colorPerfil"]'));
  const notaPerfilDatos = document.getElementById("notaPerfilDatos");

  let temporizadorAviso = 0;

  /* ============================================================
   * Avisos
   * ========================================================== */

  function avisar(mensaje, esError = false) {
    if (!estado) return;

    window.clearTimeout(temporizadorAviso);
    estado.textContent = mensaje;
    estado.classList.toggle("ajustes-aviso-error", esError);
    estado.hidden = false;

    temporizadorAviso = window.setTimeout(() => {
      estado.hidden = true;
    }, 4500);
  }

  /* ============================================================
   * Controles
   * ========================================================== */

  function sincronizarControles() {
    const prefs = preferencias.leer();

    if (reducirAnimaciones) reducirAnimaciones.checked = prefs.reducirAnimaciones;
    if (cargarTrailer) cargarTrailer.checked = prefs.cargarTrailer;
    if (ordenTrailer) ordenTrailer.value = prefs.ordenTrailer;
    if (region) region.value = prefs.region;
    if (recordarProgreso) recordarProgreso.checked = prefs.recordarProgreso;
    if (reanudacion) reanudacion.value = prefs.reanudacion;

    for (const radio of radiosTexto) {
      radio.checked = radio.value === (prefs.textoGrande ? "grande" : "normal");
    }
  }

  function guardar(parcial) {
    preferencias.guardar(parcial);
  }

  if (reducirAnimaciones) {
    reducirAnimaciones.addEventListener("change", () => {
      guardar({ reducirAnimaciones: reducirAnimaciones.checked });
    });
  }

  if (cargarTrailer) {
    cargarTrailer.addEventListener("change", () => {
      guardar({ cargarTrailer: cargarTrailer.checked });
    });
  }

  if (ordenTrailer) {
    ordenTrailer.addEventListener("change", () => {
      guardar({ ordenTrailer: ordenTrailer.value });
    });
  }

  if (region) {
    region.addEventListener("change", () => {
      guardar({ region: region.value });
    });
  }

  if (recordarProgreso) {
    recordarProgreso.addEventListener("change", () => {
      guardar({ recordarProgreso: recordarProgreso.checked });
    });
  }

  if (reanudacion) {
    reanudacion.addEventListener("change", () => {
      guardar({ reanudacion: reanudacion.value });
    });
  }

  for (const radio of radiosTexto) {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      guardar({ textoGrande: radio.value === "grande" });
    });
  }

  /* ============================================================
   * Contadores y borrado
   * ========================================================== */

  function contar() {
    return {
      favoritos: favoritos ? favoritos.total() : 0,
      historial: historial ? historial.leer().length : 0,
      progreso: progreso ? progreso.lista().length : 0,
    };
  }

  function actualizarContadores() {
    const totales = contar();

    document.querySelectorAll("[data-contador]").forEach((elemento) => {
      const clave = elemento.getAttribute("data-contador");
      elemento.textContent = String(totales[clave] || 0);
    });

    for (const boton of botonesBorrar) {
      const clave = boton.getAttribute("data-borrar");
      boton.disabled = !totales[clave];
    }
  }

  const ACCIONES = {
    favoritos: {
      nombre: "Mi lista",
      borrar: () => favoritos && favoritos.vaciar(),
    },
    historial: {
      nombre: "el historial de búsqueda",
      borrar: () => historial && historial.borrar(),
    },
    progreso: {
      nombre: "el progreso de reproducción",
      borrar: () => progreso && progreso.vaciar(),
    },
  };

  for (const boton of botonesBorrar) {
    boton.addEventListener("click", () => {
      const clave = boton.getAttribute("data-borrar");
      const accion = ACCIONES[clave];
      if (!accion) return;

      if (!contar()[clave]) {
        avisar("No hay nada que borrar en " + accion.nombre + ".");
        return;
      }

      const confirmado = window.confirm("¿Borrar " + accion.nombre + "? Esta acción no se puede deshacer.");
      if (!confirmado) return;

      accion.borrar();
      actualizarContadores();
      avisar("Se borró " + accion.nombre + ".");
    });
  }

  if (favoritos) favoritos.alCambiar(actualizarContadores);
  if (progreso) progreso.alCambiar(actualizarContadores);

  /* ============================================================
   * Perfiles locales
   * ========================================================== */

  function colorSeleccionado() {
    const marcado = coloresPerfil.find((radio) => radio.checked);
    return marcado ? marcado.value : "azul";
  }

  function actualizarNotaPerfil() {
    if (!notaPerfilDatos || !perfiles) return;
    notaPerfilDatos.textContent =
      "Estás viendo los datos del perfil «" + perfiles.actual().nombre + "».";
  }

  function pintarPerfiles() {
    if (!listaPerfiles || !perfiles) return;

    const actual = perfiles.actual();
    const lista = perfiles.listar();

    listaPerfiles.innerHTML = lista
      .map((perfil) => {
        const activo = perfil.id === actual.id;
        const color = perfiles.colorDe(perfil);

        return (
          '<div class="perfil-fila' + (activo ? " perfil-fila-activo" : "") + '">' +
          '<span class="perfil-mini" style="--perfil-color:' +
          color.hex +
          '" aria-hidden="true">' +
          escapeHtml(perfiles.inicial(perfil.nombre)) +
          "</span>" +
          '<span class="perfil-fila-texto"><strong>' +
          escapeHtml(perfil.nombre) +
          "</strong><small>" +
          (activo ? "Perfil activo" : "Cambiar a este perfil") +
          "</small></span>" +
          (activo
            ? '<span class="perfil-activo-pastilla">Activo</span>'
            : '<button type="button" class="btn btn-outline-light btn-sm" data-perfil-cambiar="' +
              escapeHtml(perfil.id) +
              '">Usar</button>') +
          '<button type="button" class="btn btn-outline-light btn-sm" data-perfil-renombrar="' +
          escapeHtml(perfil.id) +
          '" aria-label="Renombrar ' +
          escapeHtml(perfil.nombre) +
          '"><i class="bi bi-pencil" aria-hidden="true"></i></button>' +
          '<button type="button" class="btn btn-outline-danger btn-sm" data-perfil-eliminar="' +
          escapeHtml(perfil.id) +
          '" aria-label="Eliminar ' +
          escapeHtml(perfil.nombre) +
          '"' +
          (lista.length <= 1 ? " disabled" : "") +
          '><i class="bi bi-trash" aria-hidden="true"></i></button>' +
          "</div>"
        );
      })
      .join("");

    actualizarNotaPerfil();
  }

  function crearPerfilDesdeFormulario() {
    if (!perfiles || !nuevoPerfil) return;

    const resultado = perfiles.crear(nuevoPerfil.value, colorSeleccionado());
    if (!resultado.ok) {
      avisar(resultado.error, true);
      nuevoPerfil.focus();
      return;
    }

    nuevoPerfil.value = "";
    pintarPerfiles();
    avisar("Perfil «" + resultado.perfil.nombre + "» creado. Pulsa «Usar» para entrar en él.");
  }

  if (crearPerfil) crearPerfil.addEventListener("click", crearPerfilDesdeFormulario);

  if (nuevoPerfil) {
    nuevoPerfil.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter") return;
      evento.preventDefault();
      crearPerfilDesdeFormulario();
    });
  }

  if (listaPerfiles) {
    listaPerfiles.addEventListener("click", (evento) => {
      const cambiar = evento.target.closest("[data-perfil-cambiar]");
      if (cambiar) {
        const resultado = perfiles.cambiar(cambiar.getAttribute("data-perfil-cambiar"));
        if (!resultado.ok) avisar(resultado.error, true);
        return;
      }

      const renombrar = evento.target.closest("[data-perfil-renombrar]");
      if (renombrar) {
        const id = renombrar.getAttribute("data-perfil-renombrar");
        const perfil = perfiles.buscar(id);
        if (!perfil) return;

        const nombre = window.prompt("Nuevo nombre para «" + perfil.nombre + "»:", perfil.nombre);
        if (nombre === null) return;

        const resultado = perfiles.renombrar(id, nombre);
        if (!resultado.ok) {
          avisar(resultado.error, true);
          return;
        }

        pintarPerfiles();
        avisar("Perfil renombrado a «" + resultado.perfil.nombre + "».");
        return;
      }

      const eliminar = evento.target.closest("[data-perfil-eliminar]");
      if (eliminar) {
        const id = eliminar.getAttribute("data-perfil-eliminar");
        const perfil = perfiles.buscar(id);
        if (!perfil) return;

        const confirmado = window.confirm(
          "¿Eliminar el perfil «" +
            perfil.nombre +
            "»? Se borrarán su Mi lista, historial y progreso."
        );
        if (!confirmado) return;

        const resultado = perfiles.eliminar(id);
        if (!resultado.ok) {
          avisar(resultado.error, true);
          return;
        }
        if (resultado.recarga) return;

        pintarPerfiles();
        actualizarContadores();
        avisar("Perfil «" + perfil.nombre + "» eliminado.");
      }
    });
  }

  if (perfiles) perfiles.alCambiar(pintarPerfiles);

  /* ============================================================
   * Exportar e importar
   * ========================================================== */

  function copiaDeSeguridad() {
    const actual = perfiles ? perfiles.actual() : null;

    return {
      sitio: "CINEMA",
      version: 1,
      exportado: new Date().toISOString(),
      perfil: actual ? { id: actual.id, nombre: actual.nombre, color: actual.color } : undefined,
      ajustes: preferencias.leer(),
      favoritos: favoritos ? favoritos.lista() : [],
      historial: historial ? historial.leer() : [],
      progreso: progreso ? progreso.lista() : [],
    };
  }

  function nombreArchivo() {
    const hoy = new Date();
    const dos = (n) => String(n).padStart(2, "0");
    return (
      "cinema-copia-" +
      hoy.getFullYear() +
      "-" +
      dos(hoy.getMonth() + 1) +
      "-" +
      dos(hoy.getDate()) +
      ".json"
    );
  }

  if (exportar) {
    exportar.addEventListener("click", () => {
      try {
        const texto = JSON.stringify(copiaDeSeguridad(), null, 2);
        const blob = new Blob([texto], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreArchivo();
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
        avisar("Copia exportada: " + enlace.download);
      } catch (error) {
        console.error("No se pudo exportar la copia:", error);
        avisar("No se pudo crear el archivo de copia.", true);
      }
    });
  }

  function esCopia(valor) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return false;
    return (
      valor.ajustes !== undefined ||
      Array.isArray(valor.favoritos) ||
      Array.isArray(valor.historial) ||
      Array.isArray(valor.progreso)
    );
  }

  if (importar) {
    importar.addEventListener("change", async () => {
      const archivo = importar.files && importar.files[0];
      if (!archivo) return;

      let datos = null;
      try {
        datos = JSON.parse(await archivo.text());
      } catch {
        datos = null;
      }

      /* Permite volver a elegir el mismo archivo si algo falla. */
      importar.value = "";

      if (!esCopia(datos)) {
        avisar("Ese archivo no es una copia válida de CINEMA.", true);
        return;
      }

      const confirmado = window.confirm(
        "Importar la copia sustituirá tus ajustes, Mi lista, el historial y el progreso actuales. ¿Continuar?"
      );
      if (!confirmado) return;

      if (datos.ajustes && typeof datos.ajustes === "object" && !Array.isArray(datos.ajustes)) {
        preferencias.guardar(datos.ajustes);
      }
      if (Array.isArray(datos.favoritos) && favoritos) favoritos.reemplazar(datos.favoritos);
      if (Array.isArray(datos.historial) && historial) historial.reemplazar(datos.historial);
      if (Array.isArray(datos.progreso) && progreso) progreso.reemplazar(datos.progreso);

      sincronizarControles();
      actualizarContadores();
      avisar("Copia importada correctamente.");
    });
  }

  if (restablecer) {
    restablecer.addEventListener("click", () => {
      const confirmado = window.confirm(
        "¿Restablecer todos los ajustes a los valores por defecto? Mi lista, el historial y el progreso no se tocan."
      );
      if (!confirmado) return;

      preferencias.restablecer();
      sincronizarControles();
      avisar("Ajustes restablecidos.");
    });
  }

  form.addEventListener("submit", (evento) => evento.preventDefault());

  /* ============================================================
   * Estado del sitio
   * ========================================================== */

  function pintarEstado(elemento, texto, clase) {
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.classList.remove("estado-ok", "estado-aviso", "estado-error");
    elemento.classList.add(clase);
  }

  async function comprobarServidor() {
    const servidor = document.getElementById("estadoServidor");
    const tmdb = document.getElementById("estadoTmdb");
    const omdb = document.getElementById("estadoOmdb");
    const nota = document.getElementById("notaServidor");

    if (location.protocol === "file:") {
      pintarEstado(servidor, "Sin servidor (file://)", "estado-aviso");
      pintarEstado(tmdb, "No disponible", "estado-aviso");
      pintarEstado(omdb, "No disponible", "estado-aviso");
      if (nota) {
        nota.textContent =
          "Estás abriendo la página como archivo local. Para el catálogo completo y los tráilers, arranca el servidor con npm start.";
      }
      return;
    }

    let datos = null;
    try {
      const control = new AbortController();
      const corte = window.setTimeout(() => control.abort(), 6000);
      const respuesta = await fetch("/api/health", {
        cache: "no-store",
        signal: control.signal,
      });
      window.clearTimeout(corte);
      if (respuesta.ok) datos = await respuesta.json();
    } catch {
      datos = null;
    }

    if (!datos) {
      pintarEstado(servidor, "Sin respuesta", "estado-error");
      pintarEstado(tmdb, "No disponible", "estado-aviso");
      pintarEstado(omdb, "No disponible", "estado-aviso");
      if (nota) nota.textContent = "No se pudo consultar /api/health. Comprueba que el servidor esté arrancado.";
      return;
    }

    pintarEstado(servidor, "Conectado", "estado-ok");
    pintarEstado(tmdb, datos.tmdb ? "Conectado" : "Sin clave", datos.tmdb ? "estado-ok" : "estado-aviso");
    pintarEstado(omdb, datos.omdb ? "Conectado" : "Sin clave", datos.omdb ? "estado-ok" : "estado-aviso");

    if (nota) {
      nota.textContent =
        datos.tmdb && datos.omdb
          ? "TMDB y OMDb están configurados en el servidor."
          : datos.tmdb
            ? "OMDb no está configurado: el respaldo OMDb queda desactivado."
            : datos.omdb
              ? "TMDB no está configurado: el catálogo usa OMDb."
              : "No hay claves configuradas. Añádelas en config.local.js para ver el catálogo.";
    }
  }

  /* ============================================================
   * Arranque
   * ========================================================== */

  pintarPerfiles();
  sincronizarControles();
  actualizarContadores();
  comprobarServidor();
})();
