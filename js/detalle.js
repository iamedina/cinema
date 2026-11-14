/**
 * CINEMA · ficha de detalle (descripcion.html?id=...)
 * Datos reales escapados: ficha, tráiler, reparto, plataformas de
 * streaming, galería y títulos similares.
 */
(function () {
  "use strict";

  const { api, ui, buscador, dominioPublico, reproductor } = window.CINEMA;
  const escapeHtml = ui.escapeHtml;
  const POSTER_PLACEHOLDER = ui.POSTER_PLACEHOLDER;
  const etiquetaTipo = ui.etiquetaTipo;

  buscador.init();

  const contenedor = document.getElementById("detalles");
  const id = new URLSearchParams(location.search).get("id");

  function mostrarEstado(mensaje, esError = false) {
    if (!contenedor) return;
    contenedor.innerHTML =
      '<p class="estado-vacio' + (esError ? " estado-error" : "") + '" role="status">' +
      escapeHtml(mensaje) +
      "</p>";
  }

  function fila(etiqueta, valor) {
    if (!valor || valor === "N/A" || valor === "—") return "";
    return '<li class="mb-2"><strong>' + escapeHtml(etiqueta) + ":</strong> <br> " + escapeHtml(valor) + "</li>";
  }

  /** Fila con enlaces a la ficha de cada persona. */
  function filaPersonas(etiqueta, personas, respaldo) {
    if (!personas || !personas.length) return fila(etiqueta, respaldo);

    const enlaces = personas
      .map(
        (p) =>
          '<a class="enlace-persona" href="' +
          escapeHtml(urlPersona(p.id)) +
          '">' +
          escapeHtml(p.nombre) +
          "</a>"
      )
      .join(", ");

    return '<li class="mb-2"><strong>' + escapeHtml(etiqueta) + ":</strong> <br> " + enlaces + "</li>";
  }

  function urlPersona(id) {
    return "persona.html?id=tmdb-person-" + encodeURIComponent(id);
  }

  function seccion(titulo, contenido, clase) {
    if (!contenido) return "";
    return (
      '<section class="detalle-seccion' + (clase ? " " + clase : "") + '">' +
      "<h2>" + escapeHtml(titulo) + "</h2>" +
      contenido +
      "</section>"
    );
  }

  /* ============================================================
   * Tráiler
   * ========================================================== */

  /** Preferencias actuales; si el módulo falta, se usan los valores por defecto. */
  function prefs() {
    return window.CINEMA && window.CINEMA.preferencias
      ? window.CINEMA.preferencias.leer()
      : { cargarTrailer: true };
  }

  /** Miniatura de YouTube: se usa cuando el tráiler no se carga solo. */
  function miniaturaYoutube(clave) {
    return "https://i.ytimg.com/vi/" + encodeURIComponent(clave) + "/hqdefault.jpg";
  }

  function marcoTrailer(datos) {
    if (prefs().cargarTrailer !== false) {
      return (
        '<div class="trailer-marco">' +
        '<iframe src="https://www.youtube.com/embed/' +
        escapeHtml(datos.trailerKey) +
        '" title="Tráiler de ' +
        escapeHtml(datos.titulo) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
        "</div>"
      );
    }

    return (
      '<div class="trailer-marco trailer-diferido">' +
      '<button type="button" class="trailer-portada" data-trailer-cargar ' +
      'data-trailer-key="' + escapeHtml(datos.trailerKey) + '" ' +
      'data-trailer-titulo="' + escapeHtml(datos.titulo) + '" ' +
      'aria-label="Cargar el tráiler de ' + escapeHtml(datos.titulo) + '">' +
      '<img src="' + escapeHtml(miniaturaYoutube(datos.trailerKey)) + '" alt="" ' +
      'loading="lazy" decoding="async">' +
      '<span class="trailer-play" aria-hidden="true"><i class="bi bi-play-fill"></i></span>' +
      "</button>" +
      "</div>"
    );
  }

  function bloqueTrailer(datos) {
    if (datos.trailerKey) {
      return (
        '<section class="detalle-seccion">' +
        '<div class="trailer-cabecera">' +
        '<div class="trailer-titulo">' +
        "<h2>Tráiler</h2>" +
        (datos.trailerEtiqueta
          ? '<span class="trailer-etiqueta">' + escapeHtml(datos.trailerEtiqueta) + "</span>"
          : "") +
        "</div>" +
        '<button type="button" class="btn btn-outline-light btn-sm trailer-pantalla" ' +
        'data-trailer-abrir data-trailer-key="' + escapeHtml(datos.trailerKey) + '" ' +
        'data-trailer-titulo="' + escapeHtml(datos.titulo) + '" ' +
        'aria-haspopup="dialog">' +
        '<i class="bi bi-arrows-fullscreen" aria-hidden="true"></i> Pantalla completa' +
        "</button>" +
        "</div>" +
        marcoTrailer(datos) +
        "</section>"
      );
    }

    return (
      '<section class="detalle-seccion">' +
      "<h2>Tráiler</h2>" +
      '<div class="trailer-fallback">' +
      '<p class="mb-3">No hay tráiler disponible en español ni en inglés.</p>' +
      '<a class="btn btn-primary fw-semibold" href="' +
      escapeHtml(datos.busquedaTrailer) +
      '" target="_blank" rel="noopener noreferrer">Buscar en YouTube</a>' +
      "</div>" +
      "</section>"
    );
  }

  /** Diálogo a pantalla completa con el mismo tráiler (se carga al abrir). */
  function bloqueTrailerModal(datos) {
    if (!datos.trailerKey) return "";

    return (
      '<div class="reproductor trailer-modal oculto" id="trailerModal" role="dialog" ' +
      'aria-modal="true" aria-labelledby="trailerModalTitulo">' +
      '<div class="reproductor-caja">' +
      '<div class="reproductor-cabecera">' +
      '<p class="reproductor-titulo" id="trailerModalTitulo">Tráiler de ' +
      escapeHtml(datos.titulo) +
      "</p>" +
      '<button type="button" class="reproductor-cerrar" id="trailerModalCerrar" ' +
      'aria-label="Cerrar tráiler">' +
      '<i class="bi bi-x-lg" aria-hidden="true"></i>' +
      "</button>" +
      "</div>" +
      '<div class="trailer-modal-marco">' +
      '<iframe id="trailerModalVideo" title="Tráiler de ' +
      escapeHtml(datos.titulo) +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
      'allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function activarTrailer() {
    const modal = document.getElementById("trailerModal");
    const marco = document.getElementById("trailerModalVideo");
    const cerrar = document.getElementById("trailerModalCerrar");
    if (!modal || !marco || !cerrar) return;

    const marcoInline = document.querySelector(".trailer-marco");
    let origen = null;

    const pausarInline = () => {
      const iframe = marcoInline && marcoInline.querySelector("iframe");
      if (iframe && iframe.getAttribute("src")) {
        iframe.dataset.src = iframe.getAttribute("src");
        iframe.removeAttribute("src");
      }
    };

    const reanudarInline = () => {
      const iframe = marcoInline && marcoInline.querySelector("iframe");
      if (iframe && iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
        delete iframe.dataset.src;
      }
    };

    /* Tráiler diferido: el iframe se crea al pulsar la portada. */
    const botonCargar = document.querySelector("[data-trailer-cargar]");
    if (botonCargar) {
      botonCargar.addEventListener("click", () => {
        const clave = botonCargar.getAttribute("data-trailer-key");
        if (!clave) return;

        const contenedor = botonCargar.parentElement;
        if (!contenedor) return;

        const iframe = document.createElement("iframe");
        iframe.src =
          "https://www.youtube.com/embed/" + encodeURIComponent(clave) + "?autoplay=1&rel=0";
        iframe.title = "Tráiler de " + (botonCargar.getAttribute("data-trailer-titulo") || "");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        );
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

        contenedor.classList.remove("trailer-diferido");
        contenedor.innerHTML = "";
        contenedor.appendChild(iframe);
        iframe.focus();
      });
    }

    const abrir = (boton) => {
      const clave = boton.getAttribute("data-trailer-key");
      if (!clave) return;

      origen = boton;

      /* Detiene el tráiler incrustado para que no suenen dos a la vez. */
      pausarInline();

      marco.src =
        "https://www.youtube.com/embed/" + encodeURIComponent(clave) + "?autoplay=1&rel=0";
      modal.classList.remove("oculto");
      document.body.classList.add("sin-scroll");
      cerrar.focus();
    };

    const ocultar = () => {
      if (modal.classList.contains("oculto")) return;

      modal.classList.add("oculto");
      marco.removeAttribute("src");
      document.body.classList.remove("sin-scroll");

      reanudarInline();

      if (origen) {
        origen.focus();
        origen = null;
      }
    };

    document.querySelectorAll("[data-trailer-abrir]").forEach((boton) => {
      boton.addEventListener("click", () => abrir(boton));
    });

    cerrar.addEventListener("click", ocultar);

    modal.addEventListener("click", (evento) => {
      if (evento.target === modal) ocultar();
    });

    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && !modal.classList.contains("oculto")) {
        evento.preventDefault();
        ocultar();
      }
    });

    modal.addEventListener("keydown", (evento) => {
      if (evento.key !== "Tab") return;

      const focos = [cerrar, marco];
      const indice = focos.indexOf(document.activeElement);
      if (evento.shiftKey && indice <= 0) {
        evento.preventDefault();
        marco.focus();
      } else if (!evento.shiftKey && indice === focos.length - 1) {
        evento.preventDefault();
        cerrar.focus();
      }
    });
  }

  /* ============================================================
   * Temporadas y episodios
   * ========================================================== */

  function formatoDuracion(minutos) {
    const n = Number(minutos);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n < 60) return n + " min";
    const horas = Math.floor(n / 60);
    const resto = n % 60;
    return horas + " h" + (resto ? " " + resto + " min" : "");
  }

  function fechaCorta(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor || "");
    if (!partes) return valor || null;
    return parseInt(partes[3], 10) + "/" + parseInt(partes[2], 10) + "/" + partes[1];
  }

  function bloqueTemporadas(datos) {
    if (!datos.temporadas || !datos.temporadas.length) return "";

    const opciones = datos.temporadas
      .map((t) => {
        const etiqueta = t.nombre + (t.episodios ? " (" + t.episodios + " episodios)" : "");
        return '<option value="' + t.numero + '">' + escapeHtml(etiqueta) + "</option>";
      })
      .join("");

    return (
      '<section class="detalle-seccion" id="seccionTemporadas">' +
      '<div class="temporadas-cabecera">' +
      "<h2>Temporadas y episodios</h2>" +
      '<label class="temporadas-selector">' +
      "<span>Temporada</span>" +
      '<select id="selectorTemporada">' + opciones + "</select>" +
      "</label>" +
      "</div>" +
      '<div id="episodios" class="episodios" aria-live="polite" aria-busy="false"></div>' +
      "</section>"
    );
  }

  function activarTemporadas(datos) {
    const selector = document.getElementById("selectorTemporada");
    const contenedorEpisodios = document.getElementById("episodios");
    if (!selector || !contenedorEpisodios || !datos.temporadas || !datos.temporadas.length) {
      return;
    }

    const parametros = new URLSearchParams(location.search);
    const pedida = parseInt(parametros.get("temporada"), 10);
    const existe = datos.temporadas.some((t) => t.numero === pedida);
    const preferida = datos.temporadas.find((t) => t.numero === 1) || datos.temporadas[0];
    const inicial = existe ? pedida : preferida.numero;

    let peticion = 0;

    const pintarCargando = () => {
      contenedorEpisodios.setAttribute("aria-busy", "true");
      contenedorEpisodios.innerHTML = "";
      for (let i = 0; i < 6; i += 1) {
        const esqueleto = document.createElement("div");
        esqueleto.className = "esqueleto episodio-esqueleto";
        esqueleto.setAttribute("aria-hidden", "true");
        contenedorEpisodios.appendChild(esqueleto);
      }
    };

    const pintarError = () => {
      contenedorEpisodios.setAttribute("aria-busy", "false");
      contenedorEpisodios.innerHTML =
        '<p class="estado-vacio estado-error" role="status">No pudimos cargar esta temporada.</p>' +
        '<button type="button" class="estado-accion" id="reintentarTemporada">Reintentar</button>';
      const boton = document.getElementById("reintentarTemporada");
      if (boton) boton.addEventListener("click", () => cargar(Number(selector.value)));
    };

    const pintarEpisodios = (temporada) => {
      contenedorEpisodios.setAttribute("aria-busy", "false");

      if (!temporada.episodios.length) {
        contenedorEpisodios.innerHTML =
          '<p class="estado-vacio">Esta temporada no tiene episodios registrados.</p>';
        return;
      }

      contenedorEpisodios.innerHTML =
        '<ol class="episodios-lista">' +
        temporada.episodios
          .map((e) => {
            const still = e.still
              ? '<img src="' + escapeHtml(e.still) + '" alt="" class="episodio-still" ' +
                'loading="lazy" decoding="async">'
              : '<span class="episodio-still episodio-sin-still" aria-hidden="true">' +
                '<i class="bi bi-film"></i></span>';

            const meta = [
              e.fecha ? fechaCorta(e.fecha) : null,
              formatoDuracion(e.duracion),
              e.rating ? "★ " + Number(e.rating).toFixed(1) : null,
            ]
              .filter(Boolean)
              .join(" · ");

            const larga = Boolean(e.sinopsis && e.sinopsis.length > 220);

            return (
              '<li class="episodio">' +
              still +
              '<div class="episodio-cuerpo">' +
              '<p class="episodio-numero">T' + temporada.numero + " E" + e.numero + "</p>" +
              '<h3 class="episodio-titulo">' + escapeHtml(e.titulo) + "</h3>" +
              (meta ? '<p class="episodio-meta">' + escapeHtml(meta) + "</p>" : "") +
              (e.sinopsis
                ? '<p class="episodio-sinopsis' +
                  (larga ? " episodio-sinopsis-larga" : "") +
                  '">' +
                  escapeHtml(e.sinopsis) +
                  "</p>" +
                  (larga
                    ? '<button type="button" class="episodio-toggle" aria-expanded="false">Leer más</button>'
                    : "")
                : "") +
              "</div>" +
              "</li>"
            );
          })
          .join("") +
        "</ol>";

      contenedorEpisodios.querySelectorAll(".episodio-toggle").forEach((boton) => {
        boton.addEventListener("click", () => {
          const sinopsis = boton.previousElementSibling;
          const abierta = boton.getAttribute("aria-expanded") === "true";
          boton.setAttribute("aria-expanded", String(!abierta));
          boton.textContent = abierta ? "Leer más" : "Leer menos";
          if (sinopsis) sinopsis.classList.toggle("episodio-sinopsis-abierta", !abierta);
        });
      });
    };

    const actualizarUrl = (numero) => {
      const params = new URLSearchParams(location.search);
      params.set("temporada", String(numero));
      history.replaceState(null, "", location.pathname + "?" + params.toString());
    };

    const cargar = async (numero) => {
      const token = ++peticion;
      actualizarUrl(numero);
      pintarCargando();

      try {
        const temporada = await api.temporada(datos.id, numero);
        if (token !== peticion) return;

        if (!temporada) {
          pintarError();
          return;
        }
        pintarEpisodios(temporada);
      } catch (error) {
        if (token !== peticion) return;
        console.error("Error al cargar la temporada:", error);
        pintarError();
      }
    };

    selector.value = String(inicial);
    selector.addEventListener("change", () => cargar(Number(selector.value)));
    cargar(inicial);
  }

  /* ============================================================
   * Ver ahora (dominio público)
   * ========================================================== */
  function atributosVerAhora(item, datos) {
    return (
      "data-ver-ahora aria-haspopup=\"dialog\" " +
      'data-id="' + escapeHtml(datos.id) + '" ' +
      'data-video="' + escapeHtml(dominioPublico.url(item)) + '" ' +
      'data-titulo="' + escapeHtml(datos.titulo) + '" ' +
      'data-anio="' + escapeHtml(datos.anio) + '" ' +
      'data-poster="' + escapeHtml(datos.poster || "") + '" ' +
      'data-ficha="' + escapeHtml(dominioPublico.ficha(item)) + '"'
    );
  }

  function bloqueVerAhora(datos, item) {
    if (!item) return "";

    return seccion(
      "Ver ahora",
      '<div class="ver-ahora">' +
        '<div class="ver-ahora-texto">' +
        '<p class="ver-ahora-badge"><i class="bi bi-unlock-fill" aria-hidden="true"></i> Dominio público</p>' +
        "<p>Esta película ya pertenece a todos. Puedes verla aquí mismo, sin registro ni anuncios, " +
        "desde la copia que Internet Archive conserva en dominio público.</p>" +
        "</div>" +
        '<button type="button" class="btn btn-primary ver-ahora-boton" ' +
        atributosVerAhora(item, datos) +
        ">" +
        '<i class="bi bi-play-fill" aria-hidden="true"></i> Reproducir' +
        "</button>" +
        "</div>" +
        '<p class="proveedores-fuente">Fuente: <a href="' +
        escapeHtml(dominioPublico.ficha(item)) +
        '" target="_blank" rel="noopener noreferrer">Internet Archive</a>. ' +
        "CINEMA no aloja el vídeo.</p>"
    );
  }

  /* ============================================================
   * Reparto
   * ========================================================== */

  function bloqueReparto(datos) {
    if (!datos.reparto || !datos.reparto.length) return "";

    const items = datos.reparto
      .map((p) => {
        const foto = p.foto
          ? '<img src="' + escapeHtml(p.foto) + '" alt="" ' +
            'class="reparto-foto" loading="lazy" decoding="async">'
          : '<span class="reparto-foto reparto-sin-foto" aria-hidden="true"><i class="bi bi-person-fill"></i></span>';

        const contenido =
          foto +
          '<p class="reparto-nombre">' + escapeHtml(p.nombre) + "</p>" +
          (p.personaje ? '<p class="reparto-personaje">' + escapeHtml(p.personaje) + "</p>" : "");

        const interior = p.id
          ? '<a class="reparto-enlace" href="' + escapeHtml(urlPersona(p.id)) + '" ' +
            'title="Ver la filmografía de ' + escapeHtml(p.nombre) + '">' + contenido + "</a>"
          : contenido;

        return '<li class="reparto-item">' + interior + "</li>";
      })
      .join("");

    return seccion("Reparto", '<ul class="reparto-lista">' + items + "</ul>");
  }

  /* ============================================================
   * Dónde verla (plataformas de streaming)
   * ========================================================== */

  function bloqueProveedores(datos) {
    const proveedores = datos.proveedores;
    if (!proveedores || !proveedores.items || !proveedores.items.length) return "";

    const items = proveedores.items
      .map((p) => {
        const logo = p.logo
          ? '<img src="' + escapeHtml(p.logo) + '" alt="" class="proveedor-logo" loading="lazy" decoding="async">'
          : "";

        const contenido =
          logo +
          '<span class="proveedor-nombre">' + escapeHtml(p.nombre) + "</span>" +
          '<span class="proveedor-tipo">' + escapeHtml(p.tipo) + "</span>";

        const enlace = p.enlace
          ? '<a class="proveedor-item-enlace" href="' + escapeHtml(p.enlace) + '" ' +
            'target="_blank" rel="noopener noreferrer" ' +
            'title="Abrir ' + escapeHtml(p.nombre) + ' con la búsqueda de esta película">' +
            contenido +
            "</a>"
          : contenido;

        return '<li class="proveedor-item">' + enlace + "</li>";
      })
      .join("");

    const enlace = proveedores.enlace
      ? '<a class="proveedores-enlace" href="' + escapeHtml(proveedores.enlace) + '" ' +
        'target="_blank" rel="noopener noreferrer">' +
        'Ver todas las opciones <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>'
      : "";

    return seccion(
      "Dónde verla",
      '<ul class="proveedores-lista">' + items + "</ul>" +
        enlace +
        '<p class="proveedores-fuente">Disponibilidades de JustWatch a través de TMDB. ' +
          "Pulsa una plataforma para abrirla en su página oficial con la búsqueda de esta película. " +
          "CINEMA no aloja el contenido.</p>"
    );
  }

  /* ============================================================
   * Galería
   * ========================================================== */

  function bloqueGaleria(datos) {
    if (!datos.galeria || !datos.galeria.length) return "";

    const items = datos.galeria
      .map((img, i) => {
        const numero = i + 1;
        return (
          '<li class="galeria-item">' +
          '<button type="button" class="galeria-boton" ' +
          'data-grande="' + escapeHtml(img.grande) + '" ' +
          'aria-label="Ampliar imagen ' + numero + " de " + datos.galeria.length + '">' +
          '<img src="' + escapeHtml(img.url) + '" alt="Imagen de ' + escapeHtml(datos.titulo) + '" ' +
          'loading="lazy" decoding="async">' +
          "</button>" +
          "</li>"
        );
      })
      .join("");

    return seccion("Galería", '<ul class="galeria">' + items + "</ul>");
  }

  function bloqueLightbox() {
    return (
      '<div class="lightbox oculto" id="lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada">' +
      '<button type="button" class="lightbox-cerrar" id="lightboxCerrar" aria-label="Cerrar">' +
      '<i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
      '<img id="lightboxImagen" alt="">' +
      "</div>"
    );
  }

  function activarGaleria() {
    const lightbox = document.getElementById("lightbox");
    const imagen = document.getElementById("lightboxImagen");
    if (!lightbox || !imagen) return;

    const cerrar = document.getElementById("lightboxCerrar");
    const anterior = document.querySelector(".galeria-boton");

    const mostrar = (url, alt) => {
      imagen.src = url;
      imagen.alt = alt;
      lightbox.classList.remove("oculto");
      document.body.classList.add("sin-scroll");
      if (cerrar) cerrar.focus();
    };

    const ocultar = () => {
      lightbox.classList.add("oculto");
      imagen.removeAttribute("src");
      document.body.classList.remove("sin-scroll");
      if (anterior) anterior.focus();
    };

    document.querySelectorAll(".galeria-boton").forEach((boton) => {
      boton.addEventListener("click", () => {
        const miniatura = boton.querySelector("img");
        mostrar(boton.dataset.grande, miniatura ? miniatura.alt : "");
      });
    });

    lightbox.addEventListener("click", (evento) => {
      if (evento.target === lightbox || evento.target.closest("#lightboxCerrar")) ocultar();
    });

    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && !lightbox.classList.contains("oculto")) ocultar();
    });
  }

  /* ============================================================
   * Títulos similares
   * ========================================================== */

  function bloqueSimilares(datos) {
    if (!datos.similares || !datos.similares.length) return "";

    const nota = datos.saga
      ? '<p class="similares-nota">Incluye la saga «' + escapeHtml(datos.saga) + "».</p>"
      : "";

    return seccion("Títulos similares", nota + '<div id="similares" class="grid-similares"></div>');
  }

  /* ============================================================
   * Plantilla principal
   * ========================================================== */

  function plantilla(datos) {
    const sinopsis =
      datos.sinopsis && datos.sinopsis !== "N/A" ? datos.sinopsis : "Sin sinopsis disponible.";
    const rating = datos.rating ? "★ " + escapeHtml(datos.rating) + " / 10" : "Sin calificación";
    const botonTrailer = datos.trailerOficial || datos.busquedaTrailer;
    const etiquetaDirector = datos.tipoRaw === "tv" ? "Creador" : "Director";
    const publico = dominioPublico.buscar(datos.id, datos.titulo, datos.anio);

    const accionPrincipal = publico
      ? '<button type="button" class="btn btn-primary fw-semibold detalle-ver-ahora" ' +
        atributosVerAhora(publico, datos) +
        ">" +
        '<i class="bi bi-play-fill" aria-hidden="true"></i> Ver ahora' +
        "</button>"
      : '<a class="btn btn-primary fw-semibold" style="padding: 12px 80px;" href="' +
        escapeHtml(botonTrailer) +
        '" target="_blank" rel="noopener noreferrer">Ver trailer</a>';

    const columnaIzquierda = [
      fila("Título original", datos.titulo),
      filaPersonas(etiquetaDirector, datos.directores, datos.director),
      fila("Duración", datos.duracion),
      fila("Géneros", datos.generos),
      fila("Idiomas", datos.idiomas),
    ].join("");

    const columnaDerecha = [
      fila("Rating", datos.rating ? datos.rating + " / 10" : null),
      fila("Votos", datos.votos),
      fila("Fecha de estreno", datos.estreno),
      fila("País", datos.paises),
      fila("Clasificación", datos.clasificacion),
      fila("Temporadas", datos.numeroTemporadas),
    ].join("");

    return (
      '<div class="detalle-pagina">' +
      '<div class="d-flex gap-4 contenedor">' +
      '<article class="articleDetalle">' +
      '<div class="text-white espacio">' +
      '<div class="text-start border-0 ps-3">' +
      '<h1 class="fw-bold">' +
      escapeHtml(datos.titulo) +
      " (" +
      escapeHtml(datos.anio) +
      ")</h1>" +
      '<p class="detalle-tipo-texto">' +
      etiquetaTipo(datos.tipo) +
      "</p>" +
      "</div>" +
      '<div class="container-fluid mt-4">' +
      '<div class="row g-3">' +
      '<div class="col-md-4 text-center text-lg-start">' +
      '<img src="' +
      escapeHtml(datos.poster || POSTER_PLACEHOLDER) +
      '" alt="Póster de ' +
      escapeHtml(datos.titulo) +
      '" class="img-fluid rounded mb-3 poster-detalle" ' +
      'fetchpriority="high" decoding="async" ' +
      "onerror=\"this.onerror=null;this.src='" +
      POSTER_PLACEHOLDER +
      "'\">" +
      "</div>" +
      '<div class="col-md-8">' +
      '<div class="row text-start">' +
      '<ul class="list-unstyled col-6">' +
      columnaIzquierda +
      "</ul>" +
      '<ul class="list-unstyled col-6">' +
      columnaDerecha +
      "</ul>" +
      "</div>" +
      '<div class="clasificacion mb-2">' +
      rating +
      "</div>" +
      '<div class="text-start fw-medium detalle-plot">' +
      escapeHtml(sinopsis) +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>" +
      '<div class="detalle-accion">' +
      accionPrincipal +
      "</div>" +
      "</div>" +
      bloqueTrailer(datos) +
      bloqueTrailerModal(datos) +
      bloqueTemporadas(datos) +
      bloqueVerAhora(datos, publico) +
      bloqueReparto(datos) +
      bloqueProveedores(datos) +
      bloqueGaleria(datos) +
      bloqueSimilares(datos) +
      bloqueLightbox() +
      "</div>"
    );
  }

  async function cargar() {
    if (!contenedor) return;

    if (!id) {
      mostrarEstado("No se indicó qué título mostrar. Vuelve al inicio y elige uno.", true);
      return;
    }

    mostrarEstado("Cargando ficha...");

    try {
      const datos = await api.detalle(id);
      document.title = datos.titulo + " (" + datos.anio + ") | CINEMA";
      contenedor.innerHTML = plantilla(datos);

      const similares = document.getElementById("similares");
      if (similares) {
        ui.activarNavegacion(similares);
        ui.pintarTarjetas(similares, datos.similares);
      }

      activarGaleria();
      activarTrailer();
      activarTemporadas(datos);
      reproductor.activar();
    } catch (error) {
      console.error("Error al cargar la ficha:", error);
      mostrarEstado(
        api.esLimiteOmdb(error)
          ? error.message
          : "No pudimos encontrar ese título.",
        true
      );
    }
  }

  cargar();
})();
