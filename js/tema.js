/**
 * CINEMA · comportamiento visual compartido.
 * Compacta la cabecera al desplazarse y añade el botón «subir arriba».
 * No depende de librerías y respeta «reducir movimiento».
 */
(function () {
  "use strict";

  if (document.getElementById("subir-arriba")) return;

  const boton = document.createElement("button");
  boton.type = "button";
  boton.id = "subir-arriba";
  boton.className = "go-top";
  boton.setAttribute("aria-label", "Volver arriba");
  boton.innerHTML = '<i class="bi bi-arrow-up" aria-hidden="true"></i>';
  document.body.appendChild(boton);

  function actualizar() {
    const y = window.scrollY || window.pageYOffset || 0;
    document.body.classList.toggle("con-scroll", y > 40);
    boton.classList.toggle("activo", y > 300);
  }

  let reducir = false;
  try {
    reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    reducir = false;
  }

  boton.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reducir ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", actualizar, { passive: true });
  actualizar();
})();
