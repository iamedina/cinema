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
   * Devuelve un `srcset` de TMDB para la misma imagen en varios anchos.
   * Las URLs y los marcadores de posición (data:) se dejan intactos.
   */
  function srcsetPoster(url, anchos = [185, 342, 500]) {
    if (typeof url !== "string" || !/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\//.test(url)) {
      return "";
    }
    return anchos
      .map((ancho) => url.replace(/\/w\d+\//, "/w" + ancho + "/") + " " + ancho + "w")
      .join(", ");
  }

  /**
   * Construye una tarjeta. El id viaja en data-id: la navegación se
   * resuelve por delegación, nunca con onclick inline.
   */
  function crearTarjeta(item) {
    const article = document.createElement("article");
   

    const poster = item.poster || POSTER_PLACEHOLDER;
    const titulo = escapeHtml(item.titulo);
    const anio = escapeHtml(item.anio || "—");
    const etiqueta = escapeHtml(etiquetaTipo(item.tipo));
    const nota =
      typeof item.rating === "number" && item.rating > 0
        ? item.rating.toFixed(1)
        : null;
    const destino = "descripcion.html?id=" + encodeURIComponent(item.id);
    const srcset = srcsetPoster(poster);
    const atributosImagen = srcset
      ? `srcset="${escapeHtml(srcset)}" sizes="(max-width: 576px) 45vw, (max-width: 992px) 30vw, 220px"`
      : "";

    article.innerHTML = `
    <div class='pelicula-card'>
    <div>
      <a class="card-banner" href="${destino}" data-id="${escapeHtml(item.id)}"
         aria-label="Ver detalles de ${titulo}">
        <img src="${escapeHtml(poster)}" alt="Póster de ${titulo}"
             class="img-pelicula" loading="lazy" decoding="async" ${atributosImagen}>
      </a>
      <div class="title-wrapper">
        <a class="card-title-enlace" href="${destino}">
          <h3 class="card-title">${titulo}</h3>
        </a>
        <time class="card-anio">${anio}</time>
      </div>
      <div class="card-meta">
        <span class="badge badge-outline">${etiqueta}</span>
        ${nota
          ? `<span class="rating"><i class="bi bi-star-fill" aria-hidden="true"></i><data value="${nota}">${nota}</data></span>`
          : `<span class="rating rating-vacio">Sin nota</span>`}
      </div>
    </div>
    </div>
    `;

    return article;
  }

  function pintarTarjetas(contenedor, items) {
    if (!contenedor) return;
    contenedor.innerHTML = "";
    const fragmento = document.createDocumentFragment();
    for (const item of items) fragmento.appendChild(crearTarjeta(item));
    contenedor.appendChild(fragmento);
  }

  /**
   * Ordena por valoración y devuelve como máximo `limite` elementos.
   * Función pura: también la usan los listados y se prueba sin DOM.
   */
  function ordenarPorNota(items, limite = 10) {
    const nota = (item) => {
      const valor = Number(item && item.rating);
      return Number.isFinite(valor) ? valor : 0;
    };

    return (items || [])
      .map((item, indice) => ({ item, indice }))
      .sort((a, b) => nota(b.item) - nota(a.item) || a.indice - b.indice)
      .slice(0, limite)
      .map((entrada) => entrada.item);
  }

  /** Bloque destacado: reutiliza la tarjeta y añade el puesto decorativo. */
  function pintarTop10(contenedor, items, limite = 10) {
    if (!contenedor) return;

    contenedor.innerHTML = "";
    const fragmento = document.createDocumentFragment();

    ordenarPorNota(items, limite).forEach((item, indice) => {
      const tarjeta = crearTarjeta(item);
      tarjeta.classList.add("top10-card");

      const numero = document.createElement("span");
      numero.className = "top10-numero";
      numero.setAttribute("aria-hidden", "true");
      numero.textContent = String(indice + 1);

      const banner = tarjeta.querySelector(".card-banner");
      if (banner) banner.prepend(numero);
      fragmento.appendChild(tarjeta);
    });

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

  /** Respeta «reducir movimiento» del sistema para los scrolls suaves. */
  function reduceMovimiento() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }

  function pintarEstado(contenedor, mensaje, opciones) {
    if (!contenedor) return;

    contenedor.innerHTML = `<p class="estado-vacio" role="status">${escapeHtml(mensaje)}</p>`;

    const accion = opciones && opciones.accion;
    if (!accion || typeof accion.alPulsar !== "function") return;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "estado-accion";
    boton.textContent = accion.texto || "Reintentar";
    boton.addEventListener("click", accion.alPulsar);

    contenedor.querySelector(".estado-vacio").appendChild(boton);
  }

  /** Paginación numérica compacta con el mismo estilo que los filtros. */
  function pintarPaginacion(contenedor, opciones) {
    if (!contenedor) return;

    const pagina = Number(opciones && opciones.pagina) || 1;
    const total = Number(opciones && opciones.total) || 0;
    const alIr = opciones && opciones.alIr;

    if (total <= 1) {
      contenedor.innerHTML = "";
      return;
    }

    const inicio = Math.max(1, Math.min(pagina - 2, total - 4));
    const fin = Math.min(total, Math.max(5, inicio + 4));
    const numeros = [];
    for (let numero = inicio; numero <= fin; numero += 1) numeros.push(numero);

    contenedor.innerHTML = numeros
      .map(
        (numero) =>
          '<button type="button" class="pagina-num" data-pagina="' +
          numero +
          '"' +
          (numero === pagina ? ' aria-current="page"' : "") +
          ' aria-label="Página ' +
          numero +
          '">' +
          numero +
          "</button>"
      )
      .join("");

    contenedor.querySelectorAll(".pagina-num").forEach((boton) => {
      boton.addEventListener("click", () => {
        const destino = Number(boton.dataset.pagina);
        if (destino !== pagina && typeof alIr === "function") alIr(destino);
      });
    });
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
    srcsetPoster,
    reduceMovimiento,
    crearTarjeta,
    pintarTarjetas,
    ordenarPorNota,
    pintarTop10,
    pintarCargando,
    pintarPaginacion,
    pintarEstado,
    activarNavegacion,
  };
})();
