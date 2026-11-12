/**
 * CINEMA · buscador de la cabecera.
 * Un solo punto de verdad para todas las páginas.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  function init({ alBuscar } = {}) {
    const input = document.getElementById("nombrePeliculas");
    if (!input) return null;

    const ejecutar = () => {
      const consulta = input.value.trim();
      if (!consulta) {
        input.focus();
        return;
      }
      if (typeof alBuscar === "function") {
        alBuscar(consulta);
        return;
      }
      window.location.href = "busqueda.html?query=" + encodeURIComponent(consulta);
    };

    input.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter") return;
      evento.preventDefault();
      ejecutar();
    });

    const boton = document.getElementById("buscarBtn");
    if (boton) {
      /* Es un <button> real: ya es enfocable y activable con Enter/Espacio. */
      boton.setAttribute("aria-label", "Buscar");
      boton.addEventListener("click", ejecutar);
    }

    return { input, ejecutar };
  }

  CINEMA.buscador = { init };
})();
