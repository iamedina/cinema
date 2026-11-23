# Changelog

Todos los cambios relevantes de CINEMA se anotan aquí. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[SemVer](https://semver.org/lang/es/).

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
