/**
 * CINEMA · página «Mi lista» (favoritos.html)
 * Pinta los títulos guardados desde localStorage. No pide nada a la API.
 * Cada tarjeta se puede quitar, con opción de deshacer.
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

  let aviso = null;
  let temporizador = null;

  function estadoVacio() {
    const vacio = document.createElement("div");
    vacio.className = "mi-lista-vacia";
    vacio.innerHTML =
      '<i class="bi bi-heart" aria-hidden="true"></i>' +
      "<h2>Todavía no has guardado nada</h2>" +
      "<p>Abre cualquier título y pulsa «Añadir a Mi lista». Se guarda en este navegador.</p>" +
      '<a class="btn btn-primary px-4 rounded-5" href="index.html">Explorar títulos</a>';
    return vacio;
  }

  function botonQuitar(item) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "mi-lista-quitar";
    boton.dataset.quitarId = item.id;
    boton.setAttribute("aria-label", "Quitar " + item.titulo + " de Mi lista");
    boton.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i><span>Quitar</span>';
    return boton;
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

    const tarjetas = contenedor.querySelectorAll(".pelicula-card");
    items.forEach((item, indice) => {
      if (tarjetas[indice]) tarjetas[indice].appendChild(botonQuitar(item));
    });
  }

  /* ------------------------------------------------------------
   * Aviso flotante con «Deshacer»
   * ---------------------------------------------------------- */

  function asegurarAviso() {
    if (aviso) return aviso;
    aviso = document.createElement("div");
    aviso.className = "mi-lista-aviso";
    aviso.setAttribute("role", "status");
    aviso.setAttribute("aria-live", "polite");
    document.body.appendChild(aviso);
    return aviso;
  }

  function ocultarAviso() {
    if (!aviso) return;
    aviso.classList.remove("visible");
    clearTimeout(temporizador);
  }

  function mostrarAviso(item) {
    const caja = asegurarAviso();
    caja.innerHTML = "";

    const texto = document.createElement("span");
    texto.textContent = "«" + item.titulo + "» se quitó de Mi lista. ";

    const deshacer = document.createElement("button");
    deshacer.type = "button";
    deshacer.className = "mi-lista-aviso-accion";
    deshacer.textContent = "Deshacer";
    deshacer.addEventListener("click", () => {
      favoritos.restaurar(item);
      ocultarAviso();
    });

    caja.append(texto, deshacer);
    caja.classList.add("visible");

    clearTimeout(temporizador);
    temporizador = setTimeout(ocultarAviso, 7000);
  }

  contenedor.addEventListener("click", (evento) => {
    const boton = evento.target.closest(".mi-lista-quitar");
    if (!boton) return;

    evento.preventDefault();
    evento.stopPropagation();

    const id = boton.dataset.quitarId;
    const item = favoritos.lista().find((guardado) => guardado.id === id);
    if (!item) return;

    favoritos.quitar(id);
    mostrarAviso(item);
  });

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
