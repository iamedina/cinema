/**
 * CINEMA · carrusel del hero de la portada.
 *
 * Diez títulos muy valorados estrenados desde 2000, con géneros variados.
 * Los datos y las rutas de imagen vienen de TMDB, así la portada no lanza
 * peticiones extra para mostrar el destacado.
 */
(function () {
  "use strict";

  const CINEMA = (window.CINEMA = window.CINEMA || {});

  const IMAGEN_BASE = "https://image.tmdb.org/t/p/w1280";
  const INTERVALO = 3000;
  const TRANSICION = 450;
  const MAX_SINOPSIS = 210;

  /** Diez estrenos recientes y bien valorados, uno por categoría. */
  const DESTACADOS = [
    {
      id: "tmdb-movie-361743",
      titulo: "Top Gun: Maverick",
      anio: "2022",
      rating: 8.154,
      generos: "Acción, Drama",
      sinopsis:
        "Treinta años después, Maverick entrena a una nueva generación de pilotos para una misión imposible mientras se reencuentra con el hijo de su difunto amigo Goose.",
      backdrop: "/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg",
    },
    {
      id: "tmdb-movie-569094",
      titulo: "Spider-Man: Cruzando el Multiverso",
      anio: "2023",
      rating: 8.345,
      generos: "Animación, Acción",
      sinopsis:
        "Miles Morales viaja por el Multiverso y se enfrenta a otros Spider-Man mientras redefine lo que significa ser un héroe para salvar a los suyos.",
      backdrop: "/jtjBbGR2fOEwv74EkwW3hkyvIGl.jpg",
    },
    {
      id: "tmdb-movie-693134",
      titulo: "Dune: Parte dos",
      anio: "2024",
      rating: 8.143,
      generos: "Aventura, Ciencia ficción",
      sinopsis:
        "Paul Atreides se une a Chani y a los Fremen en una guerra de venganza, dividido entre el amor de su vida y el destino del universo.",
      backdrop: "/oijm3iOjSapV87frEr6X4TGgGxZ.jpg",
    },
    {
      id: "tmdb-movie-545611",
      titulo: "Todo a la vez en todas partes",
      anio: "2022",
      rating: 7.713,
      generos: "Ciencia ficción, Comedia",
      sinopsis:
        "Una inmigrante china descubre que solo ella puede salvar el multiverso y debe canalizar sus nuevos poderes mientras el mundo pende de un hilo.",
      backdrop: "/xsZXYbqVfgOQh7AjGWwb6euZmez.jpg",
    },
    {
      id: "tmdb-movie-840430",
      titulo: "Los que se quedan",
      anio: "2023",
      rating: 7.649,
      generos: "Comedia, Drama",
      sinopsis:
        "Un profesor antipático, un alumno problemático y la cocinera del colegio forman una familia improbable durante unas Navidades nevadas.",
      backdrop: "/t9NxL6LmhiUKALS07yH7kVxERUP.jpg",
    },
    {
      id: "tmdb-movie-872585",
      titulo: "Oppenheimer",
      anio: "2023",
      rating: 8,
      generos: "Drama, Historia",
      sinopsis:
        "La historia de J. Robert Oppenheimer y su papel decisivo en el desarrollo de la bomba atómica, basada en «American Prometheus».",
      backdrop: "/cUIqZd6jJCbO94Txt1CkTs7MSeP.jpg",
    },
    {
      id: "tmdb-movie-933260",
      titulo: "La sustancia",
      anio: "2024",
      rating: 7.131,
      generos: "Terror, Ciencia ficción",
      sinopsis:
        "Un suero promete una versión más joven y perfecta de uno mismo, pero el alter ego empieza a escaparse al control de quien lo probó.",
      backdrop: "/5ChQ84lkuix0Rl8PqOKXTQgjI8l.jpg",
    },
    {
      id: "tmdb-movie-496243",
      titulo: "Parásitos",
      anio: "2019",
      rating: 8.5,
      generos: "Suspense, Comedia",
      sinopsis:
        "Dos familias de mundos opuestos se entrelazan cuando el hijo mayor de los Kim empieza a dar clases en casa de los Park.",
      backdrop: "/rtsBa6lDZVfrwv28pedjE7Kk4c3.jpg",
    },
    {
      id: "tmdb-movie-546554",
      titulo: "Puñales por la espalda",
      anio: "2019",
      rating: 7.842,
      generos: "Misterio, Crimen",
      sinopsis:
        "Un detective excéntrico investiga la muerte de un novelista de misterio entre pistas falsas, mentiras y una familia llena de secretos.",
      backdrop: "/xQtniQMRG0BIyUcvtWTBRtLV65l.jpg",
    },
    {
      id: "tmdb-movie-666277",
      titulo: "Vidas pasadas",
      anio: "2023",
      rating: 7.7,
      generos: "Romance, Drama",
      sinopsis:
        "Nora pierde el contacto con su amor de infancia al emigrar a Canadá; veinte años después, un reencuentro online lo cambia todo.",
      backdrop: "/7HR38hMBl23lf38MAN63y4pKsHz.jpg",
    },
  ];

  function init() {
    const seccion = document.getElementById("heroCine");
    if (!seccion || !DESTACADOS.length) return;

    const titulo = document.getElementById("heroTitulo");
    const subtitulo = document.getElementById("heroSubtitulo");
    const meta = document.getElementById("heroMeta");
    const sinopsis = document.getElementById("heroSinopsis");
    const boton = document.getElementById("heroBoton");
    const sorprender = document.getElementById("heroSorprendeme");
    const anuncio = document.getElementById("heroAnuncio");
    const capas = [
      document.getElementById("heroFondo"),
      document.getElementById("heroFondoSegundo"),
    ].filter(Boolean);
    const indicadores = document.getElementById("heroIndicadores");
    const barra = document.getElementById("heroProgresoBarra");

    if (!titulo || !capas.length) return;

    const puntos = DESTACADOS.map((item, i) => {
      if (!indicadores) return null;
      const punto = document.createElement("button");
      punto.type = "button";
      punto.className = "hero-punto";
      punto.dataset.indice = String(i);
      punto.setAttribute("aria-label", "Mostrar " + item.titulo);
      indicadores.appendChild(punto);
      return punto;
    });

    let indice = 0;

    /* «Sorpréndeme» elige uno de los destacados; evita repetir el que
       ya está en pantalla y no lanza ninguna petición adicional. */
    if (sorprender) {
      sorprender.addEventListener("click", () => {
        let elegido = Math.floor(Math.random() * DESTACADOS.length);
        if (elegido === indice) elegido = (elegido + 1) % DESTACADOS.length;
        location.href = "descripcion.html?id=" + encodeURIComponent(DESTACADOS[elegido].id);
      });
    }

    let capaActiva = 0;
    let temporizador = null;
    let sobreHero = false;
    let conFoco = false;
    let paginaVisible = !document.hidden;
    const motion = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

    function resumen(texto) {
      return texto.length > MAX_SINOPSIS
        ? texto.slice(0, MAX_SINOPSIS).trimEnd() + "…"
        : texto;
    }

    function reiniciarBarra() {
      if (!barra) return;
      barra.style.animation = "none";
      void barra.offsetWidth;
      barra.style.animation = "";
    }

    /** Deja la imagen siguiente ya cargada en la capa inactiva. */
    function prepararFondo(posicion) {
      if (capas.length < 2) return;
      const item = DESTACADOS[(posicion + DESTACADOS.length) % DESTACADOS.length];
      capas[1 - capaActiva].style.backgroundImage =
        'url("' + (IMAGEN_BASE + item.backdrop).replace(/["']/g, "") + '")';
    }

    /** Pinta un destacado ya resuelto, sin fundido previo. */
    function aplicar(posicion, anunciar) {
      indice = (posicion + DESTACADOS.length) % DESTACADOS.length;
      const item = DESTACADOS[indice];

      titulo.textContent = item.titulo;
      if (subtitulo) subtitulo.textContent = "Destacado CINEMA · " + item.generos;
      if (sinopsis) sinopsis.textContent = resumen(item.sinopsis);
      if (boton) boton.href = "descripcion.html?id=" + encodeURIComponent(item.id);

      if (meta) {
        const partes = [
          item.anio,
          item.generos.split(",")[0].trim(),
          "★ " + item.rating.toFixed(1),
        ];
        const chips = partes.map((parte) => {
          const span = document.createElement("span");
          span.className = "hero-meta-item";
          span.textContent = parte;
          return span;
        });
        meta.replaceChildren(...chips);
      }

      if (capas.length > 1) {
        const siguienteCapa = 1 - capaActiva;
        const destino = capas[siguienteCapa];
        const origen = capas[capaActiva];
        // Asignar siempre la imagen evita un fondo vacío en el primer pintado.
        destino.style.backgroundImage =
          'url("' + (IMAGEN_BASE + item.backdrop).replace(/["']/g, "") + '")';
        destino.classList.add("activo");
        origen.classList.remove("activo");
        capaActiva = siguienteCapa;
      } else if (capas[0]) {
        capas[0].style.backgroundImage =
          'url("' + (IMAGEN_BASE + item.backdrop).replace(/["']/g, "") + '")';
        capas[0].classList.add("activo");
      }

      puntos.forEach((punto, i) => {
        if (!punto) return;
        punto.classList.toggle("activo", i === indice);
        if (i === indice) punto.setAttribute("aria-current", "true");
        else punto.removeAttribute("aria-current");
      });

      if (anunciar && anuncio) {
        anuncio.textContent = "Destacado: " + item.titulo + " (" + item.anio + ")";
      }

      reiniciarBarra();
    }

    /**
     * Un único relevo sincronizado: en el mismo instante se cambian título,
     * chips, sinopsis, enlace, puntos y fondo. Las dos capas de fondo se
     * cruzan con la misma duración que la animación de entrada del texto, así
     * que nada aparece antes que lo demás ni queda un hueco entre películas.
     */
    function pintar(posicion, anunciar) {
      const destino = (posicion + DESTACADOS.length) % DESTACADOS.length;

      if (motion && motion.matches) {
        aplicar(destino, anunciar);
        return;
      }

      prepararFondo(destino);
      seccion.classList.remove("hero-cambiando");
      void seccion.offsetWidth; // Reinicia la animación aunque se encadenen cambios.
      aplicar(destino, anunciar); // El fundido de fondo y el del texto arrancan juntos.
      seccion.classList.add("hero-cambiando");
    }

    function pausar() {
      if (temporizador !== null) {
        clearInterval(temporizador);
        temporizador = null;
      }
      seccion.classList.add("hero-pausado");
    }

    function puedeReproducir() {
      return (
        !sobreHero &&
        !conFoco &&
        paginaVisible &&
        !(motion && motion.matches)
      );
    }

    function reanudar() {
      if (!puedeReproducir() || temporizador !== null) return;
      temporizador = setInterval(() => pintar(indice + 1, false), INTERVALO);
      seccion.classList.remove("hero-pausado");
    }

    /** Una acción explícita del usuario retoma el paso automático. */
    function interaccion() {
      sobreHero = false;
      conFoco = false;
    }

    function reiniciar() {
      pausar();
      reanudar();
    }

    function mover(paso) {
      interaccion();
      pintar(indice + paso, true);
      reiniciar();
    }

    if (indicadores) {
      indicadores.addEventListener("click", (evento) => {
        const punto = evento.target.closest(".hero-punto");
        if (!punto) return;
        interaccion();
        pintar(Number(punto.dataset.indice), true);
        reiniciar();
      });
    }

    seccion.addEventListener("mouseenter", () => {
      sobreHero = true;
      pausar();
    });
    seccion.addEventListener("mouseleave", () => {
      sobreHero = false;
      reanudar();
    });
    seccion.addEventListener("focusin", () => {
      conFoco = true;
      pausar();
    });
    seccion.addEventListener("focusout", (evento) => {
      if (!seccion.contains(evento.relatedTarget)) {
        conFoco = false;
        reanudar();
      }
    });
    seccion.addEventListener("keydown", (evento) => {
      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        mover(-1);
      } else if (evento.key === "ArrowRight") {
        evento.preventDefault();
        mover(1);
      }
    });

    document.addEventListener("visibilitychange", () => {
      paginaVisible = !document.hidden;
      if (paginaVisible) reanudar();
      else pausar();
    });

    if (motion && motion.addEventListener) {
      motion.addEventListener("change", () => {
        if (motion.matches) pausar();
        else reanudar();
      });
    }

    aplicar(0, false);
    reanudar();
  }

  CINEMA.heroCine = { DESTACADOS, INTERVALO, TRANSICION, init };
})();
