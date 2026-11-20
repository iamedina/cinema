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
  const MAX_SINOPSIS = 210;

  const DESTACADOS = [
    {
      id: "tmdb-movie-155",
      titulo: "El caballero oscuro",
      anio: "2008",
      rating: 8.54,
      generos: "Acción, Suspense",
      sinopsis:
        "Batman y el teniente Gordon se alían con el fiscal Harvey Dent para acabar con el crimen organizado en Gotham, hasta que Joker sumerge la ciudad en el caos.",
      backdrop: "/lQGlm2EuuNYbHbpuErelGQ2euAD.jpg",
    },
    {
      id: "tmdb-movie-129",
      titulo: "El viaje de Chihiro",
      anio: "2001",
      rating: 8.537,
      generos: "Animación, Familia",
      sinopsis:
        "Una niña de diez años se adentra en un mundo de dioses, brujas y espíritus donde los humanos se convierten en bestias.",
      backdrop: "/hCztoFf1TEpkj7iIdzgv129oBaS.jpg",
    },
    {
      id: "tmdb-movie-122",
      titulo: "El señor de los anillos: El retorno del rey",
      anio: "2003",
      rating: 8.508,
      generos: "Aventura, Fantasía",
      sinopsis:
        "Mientras Aragorn reclama el trono de Gondor, Frodo y Sam avanzan hacia el Monte del Destino para poner fin a la sombra de Sauron.",
      backdrop: "/pbucpT9eKhS0QXNgq7PS97AP5V2.jpg",
    },
    {
      id: "tmdb-movie-27205",
      titulo: "Origen",
      anio: "2010",
      rating: 8.373,
      generos: "Acción, Ciencia ficción",
      sinopsis:
        "Dom Cobb roba secretos desde el subconsciente durante el sueño. Un último trabajo puede devolverle la vida que sacrificó.",
      backdrop: "/z3BV9uxLIHgVv6ZgcA0n1IT2KiI.jpg",
    },
    {
      id: "tmdb-movie-496243",
      titulo: "Parásitos",
      anio: "2019",
      rating: 8.5,
      generos: "Comedia, Suspense",
      sinopsis:
        "Dos familias de mundos opuestos se entrelazan cuando el hijo mayor de los Kim empieza a dar clases en casa de los Park.",
      backdrop: "/rtsBa6lDZVfrwv28pedjE7Kk4c3.jpg",
    },
    {
      id: "tmdb-movie-244786",
      titulo: "Whiplash",
      anio: "2014",
      rating: 8.376,
      generos: "Drama, Música",
      sinopsis:
        "Un joven baterista de jazz sueña con triunfar en un conservatorio de élite, pero su profesor lo empuja hasta el límite de sus fuerzas.",
      backdrop: "/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg",
    },
    {
      id: "tmdb-movie-569094",
      titulo: "Spider-Man: Cruzando el Multiverso",
      anio: "2023",
      rating: 8.345,
      generos: "Animación, Acción",
      sinopsis:
        "Miles Morales viaja por el Multiverso y se enfrenta a otros Spider-Man mientras redefine lo que significa ser un héroe.",
      backdrop: "/jtjBbGR2fOEwv74EkwW3hkyvIGl.jpg",
    },
    {
      id: "tmdb-movie-598",
      titulo: "Ciudad de Dios",
      anio: "2002",
      rating: 8.4,
      generos: "Drama, Crimen",
      sinopsis:
        "Dos niños de una favela de Río toman caminos opuestos: uno sueña con ser fotógrafo, el otro con convertirse en el criminal más temido.",
      backdrop: "/uvitbjFU4JqvMwIkMWHp69bmUzG.jpg",
    },
    {
      id: "tmdb-movie-1124",
      titulo: "El truco final (El prestigio)",
      anio: "2006",
      rating: 8.2,
      generos: "Drama, Misterio",
      sinopsis:
        "Dos ilusionistas rivales compiten por el truco definitivo, una obsesión que cambiará sus vidas para siempre.",
      backdrop: "/yaExZh6qE2cfyK3o4kAMEq0mkgy.jpg",
    },
    {
      id: "tmdb-movie-77",
      titulo: "Memento",
      anio: "2000",
      rating: 8.175,
      generos: "Misterio, Suspense",
      sinopsis:
        "Leonard busca al asesino de su mujer, pero su pérdida de memoria a corto plazo le impide recordar qué ha pasado hace unos minutos.",
      backdrop: "/7Wev9JMo6R5XAfz2KDvXb7oPMmy.jpg",
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
    const anuncio = document.getElementById("heroAnuncio");
    const capas = [
      document.getElementById("heroFondo"),
      document.getElementById("heroFondoSegundo"),
    ].filter(Boolean);
    const indicadores = document.getElementById("heroIndicadores");
    const barra = document.getElementById("heroProgresoBarra");
    const anterior = document.getElementById("heroAnterior");
    const siguiente = document.getElementById("heroSiguiente");
    const pausa = document.getElementById("heroPausa");

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
    let capaActiva = 0;
    let temporizador = null;
    let pausadoManualmente = false;
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

    function pintar(posicion, anunciar) {
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

    function pausar() {
      if (temporizador !== null) {
        clearInterval(temporizador);
        temporizador = null;
      }
      seccion.classList.add("hero-pausado");
    }

    function puedeReproducir() {
      return (
        !pausadoManualmente &&
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

    if (anterior) anterior.addEventListener("click", () => { interaccion(); mover(-1); });
    if (siguiente) siguiente.addEventListener("click", () => { interaccion(); mover(1); });

    if (pausa) {
      pausa.addEventListener("click", () => {
        pausadoManualmente = !pausadoManualmente;
        interaccion();
        if (pausadoManualmente) pausar();
        else reanudar();

        pausa.setAttribute(
          "aria-label",
          pausadoManualmente ? "Reanudar carrusel" : "Pausar carrusel"
        );
        pausa.setAttribute("aria-pressed", String(pausadoManualmente));
        pausa.innerHTML = pausadoManualmente
          ? '<i class="bi bi-play-fill" aria-hidden="true"></i>'
          : '<i class="bi bi-pause-fill" aria-hidden="true"></i>';
      });
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

    pintar(0, false);
    reanudar();
  }

  CINEMA.heroCine = { DESTACADOS, INTERVALO, init };
})();
