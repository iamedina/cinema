# Changelog

Todos los cambios relevantes de CINEMA se anotan aquí. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[SemVer](https://semver.org/lang/es/).

## [1.3.0] - 2026-11-23

### Añadido
- «Copiar enlace» en la ficha, con confirmación en el botón y respaldo para
  navegadores sin API de portapapeles.
- Botón «Sorpréndeme» en el hero: abre la ficha de un destacado aleatorio
  distinto del que está en pantalla, sin peticiones extra.
- Los filtros del catálogo (género, año, orden y nota) también funcionan en la
  búsqueda, conservando `query` y `page` en la URL.
- Sección «Siguiendo viendo» en la portada con la barra de progreso, el
  porcentaje y el tiempo restante de cada título en curso.

## [1.2.0] - 2026-11-23

### Añadido
- PWA instalable: `manifest.webmanifest`, iconos de 192 y 512 px y service
  worker con red primero para HTML y caché con revalidación para estáticos.
- Poppins alojada localmente (8 subconjuntos woff2, licencia SIL OFL incluida).
- `srcset` de 185/342/500 en los pósters de TMDB.
- `npm run build:css` y opción `CINEMA_CSS=min` para servir la hoja minificada.

### Cambiado
- La CSP ya no permite orígenes de Google Fonts: `font-src 'self' data:`.
- `manifest+json` añadido a los tipos MIME del servidor.

## [1.1.0] - 2026-11-23

### Añadido
- `robots.txt`, `sitemap.xml`, `canonical`, `og:url` y `og:image` absoluta en
  las 12 páginas.
- Licencia MIT y política de contenido (CSP) en todas las respuestas.
- Timeout de 8 segundos y un reintento ante 429/5xx en los proxies TMDB/OMDb.
- Verificación E2E versionada (`npm run test:e2e`) y CI en GitHub Actions.
- `CHANGELOG.md` y `CONTRIBUTING.md`.

### Cambiado
- `--color-enlace` (`#6ea8fe`) para texto e iconos azules sobre fondos oscuros.
- Breakpoints unificados a `480 / 560 / 576 / 600 / 768 / 900 / 1199` px.
- Los `onerror` inline se sustituyeron por delegación de eventos.

## [1.0.1] - 2026-11-23

### Cambiado
- Proyecto reorganizado en `frontend/` y `backend/`.
- `css/style.css` dividido en 15 parciales importados en el orden original.
- Backend modularizado en `config`, `http`, `estatico` y `servicios/*`.

## [1.0.0] - 2026-11-20

### Añadido
- Catálogo de películas, series y anime con TMDB (proxy local) y OMDb de
  respaldo.
- Portada con hero rotativo, Top 10 y géneros; listados con filtros en la URL.
- Fichas con tráiler, temporadas, reparto, plataformas, galería y similares.
- Mi lista, historial, preferencias, perfiles, progreso y copias de seguridad.
- Reproductor de cine de dominio público con Internet Archive.
- 101 pruebas automáticas con `node:test`.
