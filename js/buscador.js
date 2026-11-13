/**
 * CINEMA · buscador de la cabecera.
 * Un solo punto de verdad para todas las páginas.
 *
 * Incluye el panel de búsquedas recientes (js/historial.js) con
 * navegación por teclado y borrado.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  function init({ alBuscar } = {}) {
    const input = document.getElementById("nombrePeliculas");
    if (!input) return null;

    const historial = CINEMA.historial;

    let panel = null;
    let lista = null;
    let opciones = [];
    let indiceActivo = -1;

    const cerrar = () => {
      if (!panel || panel.hidden) return;
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      indiceActivo = -1;
      opciones.forEach((opcion) => {
        opcion.classList.remove("activo");
        opcion.setAttribute("aria-selected", "false");
      });
    };

    const abrir = () => {
      if (!panel || !opciones.length) return;
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    };

    const ejecutar = () => {
      const consulta = input.value.replace(/\s+/g, " ").trim();
      if (!consulta) {
        input.focus();
        return;
      }

      if (historial) historial.registrar(consulta);
      cerrar();

      if (typeof alBuscar === "function") {
        alBuscar(consulta);
        return;
      }
      window.location.href = "busqueda.html?query=" + encodeURIComponent(consulta);
    };

    const elegir = (consulta) => {
      input.value = consulta;
      cerrar();
      ejecutar();
    };

    /* ---------- Panel de búsquedas recientes ---------- */

    const construirPanel = () => {
      const contenedor = input.closest(".position-relative") || input.parentElement;
      if (!historial || !contenedor) return;

      panel = document.createElement("div");
      panel.className = "historial";
      panel.id = "historialBusqueda";
      panel.hidden = true;
      panel.innerHTML =
        '<p class="historial-titulo" id="historialTitulo">Búsquedas recientes</p>' +
        '<ul class="historial-lista" id="historialLista" role="listbox" ' +
        'aria-labelledby="historialTitulo"></ul>' +
        '<button type="button" class="historial-borrar" id="borrarHistorial">' +
        '<i class="bi bi-trash3" aria-hidden="true"></i> Borrar historial</button>';

      contenedor.appendChild(panel);
      lista = panel.querySelector("#historialLista");

      input.setAttribute("role", "combobox");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("aria-controls", "historialLista");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-haspopup", "listbox");

      /* Mantiene el foco en el campo al pulsar una opción. */
      panel.addEventListener("pointerdown", (evento) => {
        if (evento.target.closest(".historial-borrar")) return;
        evento.preventDefault();
      });

      lista.addEventListener("click", (evento) => {
        const opcion = evento.target.closest(".historial-opcion");
        if (opcion) elegir(opcion.dataset.consulta);
      });

      panel.querySelector("#borrarHistorial").addEventListener("click", () => {
        historial.borrar();
        opciones = [];
        lista.innerHTML = "";
        cerrar();
        input.focus();
      });

      document.addEventListener("pointerdown", (evento) => {
        if (panel.hidden) return;
        if (panel.contains(evento.target) || evento.target === input) return;
        cerrar();
      });
    };

    /* ---------- Pintado del panel ---------- */

    const pintar = () => {
      if (!panel) return;

      const consulta = input.value.trim().toLocaleLowerCase("es");
      const recientes = historial
        .leer()
        .filter((texto) => !consulta || texto.toLocaleLowerCase("es").includes(consulta));

      lista.innerHTML = "";
      opciones = recientes.map((texto, indice) => {
        const opcion = document.createElement("li");
        opcion.className = "historial-opcion";
        opcion.id = "historial-opcion-" + indice;
        opcion.setAttribute("role", "option");
        opcion.setAttribute("aria-selected", "false");
        opcion.dataset.consulta = texto;

        const icono = document.createElement("i");
        icono.className = "bi bi-clock-history";
        icono.setAttribute("aria-hidden", "true");

        const etiqueta = document.createElement("span");
        etiqueta.textContent = texto;

        opcion.append(icono, etiqueta);
        lista.appendChild(opcion);
        return opcion;
      });

      indiceActivo = -1;
      input.removeAttribute("aria-activedescendant");

      if (opciones.length) abrir();
      else cerrar();
    };

    const mover = (paso) => {
      if (!opciones.length) return;

      indiceActivo = (indiceActivo + paso + opciones.length) % opciones.length;

      opciones.forEach((opcion, indice) => {
        const activo = indice === indiceActivo;
        opcion.classList.toggle("activo", activo);
        opcion.setAttribute("aria-selected", String(activo));
      });

      const activo = opciones[indiceActivo];
      input.setAttribute("aria-activedescendant", activo.id);
      activo.scrollIntoView({ block: "nearest" });
    };

    /* ---------- Eventos ---------- */

    construirPanel();

    input.addEventListener("keydown", (evento) => {
      if (evento.key === "ArrowDown") {
        evento.preventDefault();
        if (panel && panel.hidden) pintar();
        else mover(1);
        return;
      }

      if (evento.key === "ArrowUp") {
        evento.preventDefault();
        if (panel && panel.hidden) pintar();
        else mover(-1);
        return;
      }

      if (evento.key === "Escape") {
        if (panel && !panel.hidden) {
          evento.preventDefault();
          cerrar();
        }
        return;
      }

      if (evento.key !== "Enter") return;
      evento.preventDefault();

      if (indiceActivo >= 0 && opciones[indiceActivo]) {
        elegir(opciones[indiceActivo].dataset.consulta);
        return;
      }
      ejecutar();
    });

    if (panel) {
      input.addEventListener("focus", pintar);
      input.addEventListener("input", pintar);
    }

    const boton = document.getElementById("buscarBtn");
    if (boton) {
      /* Es un <button> real: ya es enfocable y activable con Enter/Espacio. */
      boton.setAttribute("aria-label", "Buscar");
      boton.addEventListener("click", ejecutar);
    }

    return { input, ejecutar, pintar, cerrar };
  }

  CINEMA.buscador = { init };
})();
