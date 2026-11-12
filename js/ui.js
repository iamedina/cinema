/**
 * CINEMA · utilidades de UI compartidas.
 * Todo valor que venga de la API pasa por escapeHtml antes de
 * entrar en innerHTML.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  const PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <rect width="300" height="450" fill="#1b1e23"/>
  <rect x="60" y="150" width="180" height="150" rx="12" fill="none" stroke="#495057" stroke-width="6"/>
  <circle cx="105" cy="195" r="14" fill="#495057"/>
  <path d="M70 285 L125 225 L165 265 L200 230 L235 285 Z" fill="#495057"/>
  <text x="150" y="360" fill="#6c757d" font-family="sans-serif" font-size="18" text-anchor="middle">Sin póster</text>
</svg>`;

  const POSTER_PLACEHOLDER =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(PLACEHOLDER_SVG.trim());

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

  const ETIQUETAS_TIPO = {
    movie: "Película",
    series: "Serie",
    episode: "Episodio",
  };

  function etiquetaTipo(tipo) {
    return ETIQUETAS_TIPO[tipo] || "Título";
  }

  /**
   * Construye una tarjeta. El id viaja en data-id: la navegación se
   * resuelve por delegación, nunca con onclick inline.
   */
  function crearTarjeta(item) {
    const article = document.createElement("article");
    article.className = "pelicula-card";

    const poster = item.poster || POSTER_PLACEHOLDER;
    const titulo = escapeHtml(item.titulo);

    article.innerHTML = `
      <div class="imagen-container" data-id="${escapeHtml(item.id)}" role="link" tabindex="0"
           aria-label="Ver detalles de ${titulo}">
        <img src="${escapeHtml(poster)}" alt="Póster de ${titulo}"
             class="img-pelicula rounded" loading="lazy" decoding="async">
        <button type="button" class="fav-btn"
                data-fav-id="${escapeHtml(item.id)}"
                data-titulo="${escapeHtml(item.titulo)}"
                data-anio="${escapeHtml(item.anio)}"
                data-tipo="${escapeHtml(item.tipo)}"
                data-poster="${escapeHtml(item.poster || "")}"
                aria-pressed="false" aria-label="Añadir ${titulo} a Mi lista"
                title="Añadir a Mi lista">
          <i class="bi bi-heart" aria-hidden="true"></i>
        </button>
        <p class="info-extra">${escapeHtml(item.anio)} · ${etiquetaTipo(item.tipo)}</p>
      </div>
      <div class="titulo-container text-center mt-2">
        <h2 class="titulo-pelicula">${titulo}</h2>
      </div>
    `;

    /* El módulo de favoritos puede no estar cargado (páginas futuras). */
    if (CINEMA.favoritos) CINEMA.favoritos.aplicarEstado(article);

    return article;
  }

  function pintarTarjetas(contenedor, items) {
    if (!contenedor) return;
    contenedor.innerHTML = "";
    const fragmento = document.createDocumentFragment();
    for (const item of items) fragmento.appendChild(crearTarjeta(item));
    contenedor.appendChild(fragmento);
  }

  function pintarCargando(contenedor, cantidad = 8) {
    if (!contenedor) return;
    contenedor.innerHTML = "";
    const fragmento = document.createDocumentFragment();
    for (let i = 0; i < cantidad; i += 1) {
      const esqueleto = document.createElement("div");
      esqueleto.className = "esqueleto";
      esqueleto.setAttribute("aria-hidden", "true");
      fragmento.appendChild(esqueleto);
    }
    contenedor.appendChild(fragmento);
  }

  function pintarEstado(contenedor, mensaje) {
    if (!contenedor) return;
    contenedor.innerHTML = `<p class="estado-vacio">${escapeHtml(mensaje)}</p>`;
  }

  /** Un solo listener por contenedor: soporta ratón, Enter y Espacio. */
  function activarNavegacion(contenedor) {
    if (!contenedor) return;

    /* Los controles propios de la tarjeta (corazón, futuros botones)
       no deben disparar la navegación a la ficha. */
    const esControl = (elemento) =>
      Boolean(elemento && elemento.closest && elemento.closest("button, a, input, select, textarea, label"));

    const ir = (elemento) => {
      const id = elemento.dataset.id;
      if (id) window.location.href = "descripcion.html?id=" + encodeURIComponent(id);
    };

    contenedor.addEventListener("click", (evento) => {
      if (esControl(evento.target)) return;
      const objetivo = evento.target.closest("[data-id]");
      if (objetivo) ir(objetivo);
    });

    contenedor.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      if (esControl(evento.target)) return;
      const objetivo = evento.target.closest("[data-id]");
      if (!objetivo) return;
      evento.preventDefault();
      ir(objetivo);
    });

    /* OMDb a veces devuelve URLs de póster rotas: se sustituye por el
       placeholder en vez de dejar la tarjeta con el texto alternativo. */
    contenedor.addEventListener(
      "error",
      (evento) => {
        const objetivo = evento.target;
        if (!objetivo || objetivo.tagName !== "IMG" || objetivo.dataset.fallback) return;
        objetivo.dataset.fallback = "1";
        objetivo.src = POSTER_PLACEHOLDER;
      },
      true
    );
  }

  CINEMA.ui = {
    POSTER_PLACEHOLDER,
    escapeHtml,
    etiquetaTipo,
    crearTarjeta,
    pintarTarjetas,
    pintarCargando,
    pintarEstado,
    activarNavegacion,
  };
})();
