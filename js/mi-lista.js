/**
 * CINEMA · página «Mi lista» (favoritos.html)
 * Pinta los títulos guardados desde localStorage. No pide nada a la API.
 */
(function () {
  "use strict";

  const { ui, favoritos, buscador } = window.CINEMA;

  const contenedor = document.getElementById("resultado");
  const titulo = document.getElementById("tituloListado");
  const acciones = document.getElementById("accionesLista");
  const vaciar = document.getElementById("vaciarLista");

  if (!contenedor) return;

  ui.activarNavegacion(contenedor);
  buscador.init();

  function estadoVacio() {
    const vacio = document.createElement("div");
    vacio.className = "mi-lista-vacia";
    vacio.innerHTML =
      '<i class="bi bi-heart" aria-hidden="true"></i>' +
      "<h2>Todavía no has guardado nada</h2>" +
      "<p>Pulsa el corazón de cualquier póster para añadirlo a tu lista. Se guarda en este navegador.</p>" +
      '<a class="btn btn-primary px-4 rounded-5" href="index.html">Explorar títulos</a>';
    return vacio;
  }

  function pintar() {
    const items = favoritos.lista();

    if (titulo) {
      titulo.textContent = items.length ? "Mi lista (" + items.length + ")" : "Mi lista";
    }
    if (acciones) acciones.classList.toggle("oculto", items.length === 0);

    if (!items.length) {
      contenedor.innerHTML = "";
      contenedor.appendChild(estadoVacio());
      return;
    }

    ui.pintarTarjetas(contenedor, items);
  }

  if (vaciar) {
    vaciar.addEventListener("click", () => {
      if (!favoritos.total()) return;
      if (!window.confirm("¿Vaciar toda tu lista? Esta acción no se puede deshacer.")) return;
      favoritos.vaciar();
    });
  }

  favoritos.alCambiar(pintar);
  pintar();
})();
