# CINEMA

Catálogo de películas, series y anime. Interfaz estática (HTML + CSS + JS) con
un pequeño servidor Node que hace de proxy de TMDB, de modo que la clave de la
API nunca se envía al navegador.

## Arrancar

```bash
npm start
```

Abre <http://127.0.0.1:8080>.

También sirve `node server.js` directamente. Para desarrollo, `npm run dev`
reinicia el servidor solo al guardar cambios.

No hace falta `npm install`: el servidor solo usa módulos nativos de Node
(fetch incluido, Node 18 o superior).

Bootstrap y los iconos se sirven desde `vendor/`, así que la interfaz se ve
igual sin conexión a internet.

## Diseño

El sistema visual está inspirado en [FilmLane](https://codewithsadee.github.io/filmlane/),
de [codewithsadee](https://github.com/codewithsadee) (© 2022, uso libre):
estructura de portada, tarjetas con póster 2:3 y componentes como badges,
botones y pie de página. CINEMA mantiene su identidad propia: acento azul
`#0d6efd`, tipografía Poppins, logo e imágenes de TMDB, y el hover original
de las tarjetas (`translateY(-4px)`, `scale(1.03)`, opacidad `0.75`, `0.3s`).

## Activar TMDB (catálogo amplio y tráilers)

Sin clave de TMDB, el sitio solo usa OMDb si además configuraste
`OMDB_API_KEY` (10 resultados por página y sin tráilers). Sin ninguna clave
no hay catálogo. Con clave de TMDB pasa a mostrar **60 títulos por página**,
listados reales por popularidad, fichas en español y tráiler embebido.

1. Crea una cuenta gratis en <https://www.themoviedb.org/signup>.
2. Ve a **Ajustes → API** y solicita una clave de uso personal.
3. Copia `config.example.js` como `config.local.js` y pega tu credencial:

```js
module.exports = {
  TMDB_API_KEY: "tu_credencial_aqui",
};
```

4. Reinicia el servidor (`Ctrl+C` y `npm start`).

El servidor acepta las dos credenciales de TMDB:

| Credencial | Formato | Cómo la usa el servidor |
|---|---|---|
| **API Key (v3)** | 32 caracteres | `?api_key=...` |
| **Read Access Token (v4)** | empieza por `eyJ...` | `Authorization: Bearer ...` |

Detecta automáticamente cuál es. Puedes comprobarlo en
<http://127.0.0.1:8080/api/health>: `"auth":"key-v3"` o `"auth":"token-v4"`.

También puedes usar la variable de entorno:

```bash
TMDB_API_KEY=tu_clave node server.js
```

`config.local.js` está en `.gitignore`: la clave no se sube al repositorio.

## Abrir sin servidor

Los archivos HTML siguen funcionando con doble clic. En ese caso el sitio
detecta que no hay servidor y usa OMDb como respaldo: todo se ve igual, pero
sin catálogo amplio ni tráilers.

### Clave de OMDb

OMDb es el respaldo cuando no hay TMDB. Para que la clave tampoco viaje al
navegador, añádela al servidor:

```js
module.exports = {
  TMDB_API_KEY: "tu_credencial_aqui",
  OMDB_API_KEY: "tu_clave_omdb",
};
```

O con variables de entorno:

```bash
OMDB_API_KEY=tu_clave node server.js
```

Con `OMDB_API_KEY` configurada, el navegador pide `/api/omdb` y el servidor
añade la clave, filtra los parámetros permitidos y cachea las respuestas.
`/api/health` lo confirma con `"omdb":true`. **La clave no se incluye nunca en
el código del cliente**: si el servidor no tiene clave (o abres el HTML con
doble clic), el respaldo OMDb se desactiva y las páginas muestran un aviso claro
en lugar de llamar a OMDb.

La clave gratuita tiene un límite de unas 1.000 peticiones al día. Si se agota,
las páginas muestran un aviso claro («OMDb alcanzó su límite diario…») y
recuerdan que con `npm start` el catálogo usa TMDB y no depende de OMDb.

## Claves y secretos

Este repositorio es público. Ninguna clave vive en el código:

- TMDB y OMDb se configuran en `config.local.js` (ignorado por Git) o con las
  variables de entorno `TMDB_API_KEY` y `OMDB_API_KEY`.
- `js/` no contiene claves ni llama a OMDb directamente: todo pasa por
  `/api/tmdb` y `/api/omdb`, que añaden la credencial en el servidor.
- Las pruebas fallan si aparece una clave en `js/` o en la plantilla.

## Pruebas automáticas

```bash
npm test
```

Ejecuta las pruebas con el runner nativo de Node (`node --test`), sin
dependencias externas: almacenamiento seguro, historial de búsqueda, progreso de
reproducción, escapado de HTML, filtros en la URL, preferencias, tráilers y
región, copias de seguridad y el servidor (proxy de OMDb, rutas permitidas, 404
propio y `/api/health`). También se revisan las páginas HTML: que carguen
`preferencias.js` antes que el resto, que enlacen Ajustes y que no falte ningún
módulo o archivo referenciado.

## Mi lista (favoritos)

Se guarda desde la ficha de cada título con el botón **«Añadir a Mi lista»**
(`localStorage`), sin cuenta ni servidor. La lista se abre desde **Ajustes →
Ver Mi lista**; no hay enlace en la cabecera ni en el pie.

- Se guarda la **ficha completa** (id, título, año, tipo y póster), así la
  página funciona al instante y sin pedir nada a la API.
- En `favoritos.html` cada tarjeta tiene **«Quitar»**, con un aviso para
  **deshacer** durante unos segundos.
- Se sincroniza entre pestañas del mismo navegador.
- Si el navegador bloquea el almacenamiento, el sitio sigue funcionando: solo
  no recuerda la lista.

## Historial de búsqueda

El buscador de la cabecera recuerda tus últimas **8 consultas** en el navegador
(`localStorage`), sin cuenta ni servidor.

- Al enfocar el campo aparece un desplegable con las búsquedas recientes.
- Se navega con las flechas, se elige con **Enter** o con el ratón y se cierra
  con **Escape** o al hacer clic fuera.
- «Borrar historial» lo vacía. Se sincroniza entre pestañas del mismo navegador.
- Se descartan las consultas de menos de 2 letras y los duplicados sin
  distinguir mayúsculas.

## Avisos de búsqueda

La página de resultados explica lo que pasa cuando no hay nada que mostrar:

- Con menos de 2 letras avisa del mínimo en lugar de lanzar la petición.
- Si hay muchísimos resultados, avisa de que solo se muestran los primeros y
  sugiere añadir palabras para afinar la búsqueda.
- El estado vacío de los listados ofrece **«Limpiar filtros»** cuando hay algún
  filtro activo.

## Aviso legal

`legal.html` reúne en una sola página qué es CINEMA, la política de derechos de
autor (DMCA), privacidad, publicidad, fuentes de datos, clasificación por edad y
contacto. El pie de todas las páginas enlaza a ella, a sus anclas
(`#dmca`, `#privacidad`, `#publicidad`) y recuerda que el sitio **no aloja**
contenido audiovisual.

## Ver ahora (dominio público)

CINEMA incluye un reproductor propio para **películas de dominio público**. No
hay copias piratas ni servidores propios: el vídeo se carga desde la copia que
**Internet Archive** publica legalmente.

- En las fichas de esas películas aparece el bloque **«Ver ahora»** con el sello
  «Dominio público»; el botón abre un reproductor modal con controles nativos.
- La página `dominio-publico.html` reúne el catálogo completo (24 clásicos:
  *Nosferatu*, *Metrópolis*, *La noche de los muertos vivientes*, *Charada*,
  *Luna nueva*, *El acorazado Potemkin*…).
- El MP4 solo se descarga al pulsar «Ver ahora»; al cerrar se pausa y se libera.
- Se cierra con **Escape**, con la X o pulsando el fondo, y devuelve el foco al
  botón de origen. Si el vídeo no carga, ofrece abrirlo en Internet Archive.
- Funciona también con doble clic (`file://`): reconoce la película por su id de
  IMDb cuando la ficha viene de OMDb.
- El catálogo vive en `js/dominio-publico.js`; cada entrada se verificó contra
  Internet Archive y su licencia de dominio público.

## Ajustes y preferencias

`ajustes.html` reúne las preferencias del sitio. Todo se guarda en este
navegador (`localStorage`, clave `cinema:ajustes:v1`): no hay cuenta ni se envía
nada al servidor. El engranaje de la cabecera y el enlace del pie llevan a ella
desde cualquier página.

- **Apariencia:** reducir animaciones (además de la preferencia del sistema) y
  tamaño de texto normal o grande. Los cambios se aplican al instante.
- **Tráilers:** orden del audio (`Latino → España → Inglés`, `España → Latino →
  Inglés`, `Inglés → Latino → España` o solo oficiales) y carga automática. Con
  la carga automática desactivada, la ficha muestra una miniatura de YouTube y
  el vídeo solo se carga al pulsar, sin perder la etiqueta de idioma.
- **Plataformas:** región de «Dónde verla» (México por defecto; también España,
  Argentina, Colombia, Chile, Perú y EE. UU.). Cambia las plataformas de TMDB y
  el enlace de respaldo de JustWatch. Si la región no tiene datos, se usan los
  de España y luego los de EE. UU.
- **Reproducción:** recordar o no la posición y qué hacer al reabrir una
  película empezada (`Preguntar`, `Reanudar automáticamente` o `Empezar desde el
  inicio`).
- **Mis datos:** contadores de Mi lista, historial y progreso, borrado
  individual, **exportar** una copia JSON, **importar** una copia (sustituye los
  datos actuales) y **restablecer** los ajustes sin tocar las listas.
- **Información del sitio:** estado de `/api/health` (servidor, TMDB y OMDb) y
  enlaces legales. Con `file://` avisa de que no hay servidor y explica cómo
  arrancarlo.

La copia de seguridad tiene la forma
`{ sitio: "CINEMA", version: 1, exportado, ajustes, favoritos, historial, progreso }`
y al importarla se sanean las listas igual que si se hubieran guardado a mano.

## Seguir viendo

El reproductor recuerda dónde te quedaste, en el navegador
(`localStorage`), sin cuenta ni servidor:

- Al cerrar o pausar se guarda la posición; también cada 15 segundos mientras
  se reproduce.
- Al volver a abrir una película empezada aparece **«Lo dejaste en 12:34.
  ¿Continuar?»** con los botones **Reanudar** y **Empezar de cero**, salvo que
  en Ajustes se haya elegido **Reanudar automáticamente** o **Empezar desde el
  inicio**.
- Con **«Recordar dónde me quedé»** desactivado no se guarda nada nuevo y no se
  ofrece reanudar; el progreso anterior se conserva hasta borrarlo en Ajustes.
- En `dominio-publico.html` cada póster muestra una barra de progreso y el
  botón pasa a **Continuar**.
- Al pasar del **90 %** la película se marca como **Vista** (sello sobre el
  póster) y deja de contarse como «en curso», pero conserva la posición.
- El progreso vive en el reproductor y en el catálogo: la portada no lo
  muestra para no repetir en la portada las películas que estás viendo.
- Se sincroniza entre pestañas del mismo navegador. Si el navegador bloquea el
  almacenamiento, el sitio sigue funcionando sin recordar el progreso.

## Filtros de los listados

Películas, series y anime tienen una barra de filtros: **género, año, orden
y nota mínima**. Los filtros viven en la URL (`?genero=28&anio=2024&orden=nota`)
para poder compartir un listado o recargar sin perderlo.

- Solo aparecen con el servidor en marcha: OMDb no admite filtros.
- `Limpiar` vuelve al catálogo completo y a la página 1.
- La paginación numérica se mantiene; cambiar un filtro reinicia a la página 1.

La rejilla usa **columnas pares explícitas** (6 / 4 / 2 según el ancho) y cada
página entrega 60 títulos, así las filas siempre quedan completas y no aparece
un hueco al final.

## Ficha de detalle

`descripcion.html?id=...` muestra el tráiler, **temporadas y episodios** (solo
series de TMDB), **reparto** (con foto y personaje), **plataformas de
streaming** (JustWatch vía TMDB, con enlace a todas las opciones), **galería**
de imágenes con lightbox y **títulos similares** (clicables).

- El botón **«Añadir a Mi lista»** vive en la ficha, junto a «Ver ahora»; los
  listados no muestran corazones.
- El tráiler se elige por prioridad: **oficial en español latino**, después
  **oficial en España**, después **oficial en otro idioma** y, por último,
  cualquier tráiler de YouTube. El orden se puede cambiar en Ajustes (por
  ejemplo, España primero o solo oficiales). La etiqueta junto a «Tráiler»
  indica el audio (`Tráiler oficial (latino)`, `(España)`, `(inglés)` o
  `Tráiler`). Los subtitulados pierden prioridad porque se busca audio, no
  subtítulos.
- Con **«Cargar el tráiler automáticamente»** desactivado, la ficha muestra una
  miniatura con botón de reproducción y el iframe se crea solo al pulsar.
- Los **títulos similares** de una película empiezan por su **saga o trilogía**
  (colección de TMDB, en orden cronológico), siguen con las recomendaciones y
  terminan con los similares, sin duplicados y con un máximo de 12. Si hay
  saga, la sección lo avisa («Incluye la saga …»). Las series usan
  recomendaciones y similares de TMDB.
- Las **series** muestran la sección **«Temporadas y episodios»** entre el
  tráiler y el reparto: selector de temporada (la 0 se llama «Especiales»),
  lista de episodios con imagen, título, fecha, duración, nota y sinopsis
  recortada a 3 líneas con **«Leer más»**. Abre en la temporada 1 (o la primera
  disponible), la temporada elegida queda en la URL (`&temporada=8`) y el
  cambio no recarga la página. Con `file://` u OMDb la sección no aparece.
- El tráiler tiene un botón **«Pantalla completa»** que lo abre en un diálogo
  amplio. Se cierra con **Escape**, con la X o pulsando el fondo, pausa el
  vídeo incrustado y devuelve el foco al botón.
- Cada **plataforma** de «Dónde verla» es un enlace a la página oficial de esa
  plataforma con la búsqueda del título (Netflix, Prime Video, Disney+, Max,
  Apple TV+, Paramount+, Filmin, Movistar+, Crunchyroll…). Las que no tienen
  búsqueda oficial llevan a JustWatch. Se abren en pestaña nueva.
- El **reparto** y el **director/creador** son clicables: cada nombre abre su
  ficha de persona con biografía y filmografía.

- Solo se muestra lo que la API devuelve: si un título no tiene plataformas
  registradas, esa sección no aparece.
- El reparto se limita a 12 actores y los similares a 12, para que la rejilla
  no deje huecos.
- Con OMDb (doble clic, sin servidor) se muestra el reparto en texto y el
  resto de secciones se omite.

## Ficha de persona

`persona.html?id=tmdb-person-...` reúne el retrato, los datos personales
(nacimiento, fallecimiento, lugar y departamento), la biografía con
**«Leer más»** y la **filmografía** completa.

- La filmografía mezcla cine y series, elimina duplicados y se ordena de más
  reciente a más antigua.
- Se pagina en el navegador, de 24 en 24, sin peticiones extra. La página
  queda en la URL (`&page=2`).
- Cada título lleva a su ficha.
- Necesita TMDB (servidor local); con `file://` muestra un aviso claro.

## Accesibilidad y metadatos

Cada página lleva su propio `<title>`, `meta description`, `theme-color` y
etiquetas `og:` para compartirse bien en redes y buscadores.

- Un solo `<h1>` por página y jerarquía de encabezados sin saltos.
- `<main id="contenido">` como región principal y enlace **«Saltar al
  contenido»** para ir con el teclado sin recorrer la cabecera.
- Foco visible en todos los controles (campo de búsqueda, filtros,
  paginación, galería, botones).
- Los SVGs decorativos se ocultan a los lectores de pantalla y el menú marca
  la página actual con `aria-current="page"`.
- Contraste corregido en textos secundarios y paginación.
- Se respeta «reducir movimiento»: sin parpadeos ni scrolls suaves.

## Rendimiento

- `preconnect` y `dns-prefetch` a TMDB, YouTube y Archive.org en las páginas
  que los usan, para empezar antes las conexiones.
- Pósters, reparto, galería, proveedores y el catálogo de dominio público se
  cargan con `loading="lazy"` y `decoding="async"`; el póster principal de la
  ficha usa `fetchpriority="high"`.
- El servidor sirve `vendor/` e `img/` con caché larga e inmutable; el HTML y
  los JS siguen revalidando (`no-cache`).
- Los módulos solo se cargan donde se usan (por ejemplo, la portada ya no
  carga el reproductor ni el progreso).

## Estructura

```
index.html          Portada con tres carruseles
busqueda.html       Resultados de búsqueda
pelicula.html       Listado de películas  (body data-tipo="movie")
serie.html          Listado de series     (body data-tipo="series")
anime.html          Listado de anime      (body data-tipo="anime")
descripcion.html    Ficha de un título    (?id=...)
persona.html        Ficha de una persona  (?id=tmdb-person-...)
favoritos.html      Mi lista (favoritos guardados en el navegador)
ajustes.html        Preferencias: apariencia, tráilers, región, datos y estado
legal.html          Aviso legal, DMCA, privacidad y fuentes
dominio-publico.html  Catálogo de cine de dominio público con reproductor
404.html            Página no encontrada (la sirve server.js con estado 404)

css/style.css       Todos los estilos
js/api.js           Datos: TMDB vía proxy, OMDb de respaldo, caché
js/preferencias.js  Preferencias globales y clases de apariencia
js/almacen.js       Acceso seguro a localStorage (claves versionadas)
js/favoritos.js     Estado de Mi lista: contador y cambios
js/historial.js     Historial de búsquedas recientes
js/ajustes.js       Controles de Ajustes, contadores y copias de seguridad
js/generos.js       Géneros fijos de TMDB (sin petición extra)
js/filtros.js       Barra de filtros y estado en la URL
js/ui.js            Tarjetas, escapado de HTML, navegación y foco
js/buscador.js      Buscador de la cabecera + historial
js/home.js          Carruseles de la portada
js/busqueda.js      Búsqueda + paginación + avisos
js/listado.js       Listados por tipo, filtros y paginación
js/detalle.js       Ficha: tráiler, temporadas, reparto, plataformas, galería y similares
js/persona.js       Ficha de persona: biografía y filmografía paginada
js/dominio-publico.js  Catálogo local de cine de dominio público
js/progreso.js      Posición de reproducción (catálogo y reproductor)
js/reproductor.js   Reproductor modal (Internet Archive)
js/pagina-dominio.js  Pinta el catálogo de dominio público
js/mi-lista.js      Página Mi lista: quitar títulos con deshacer

tests/              Pruebas con node:test (npm test)
server.js           Estático + proxy TMDB/OMDb + fusión de páginas
config.example.js   Plantilla de configuración
```

## Cómo funciona el proxy

El cliente pide `/api/tmdb/discover/movie?page=2&paginas=3`. El servidor:

1. Traduce `page` del sitio a las páginas de TMDB correspondientes
   (`(page - 1) * paginas + 1` en adelante), así no se repiten títulos.
2. Pide esas páginas en paralelo y fusiona los resultados.
3. Devuelve 60 títulos por página (20 × 3) con `total_pages` recalculado.
4. Cachea la respuesta 10 minutos y filtra rutas no permitidas.

La clave se añade en el servidor y se elimina de cualquier parámetro que envíe
el cliente.

`/api/omdb` funciona igual: solo reenvía `s`, `i`, `t`, `y`, `type`, `page`,
`plot`, `r`, `season` y `episode`, ignora cualquier `apikey` del cliente y
cachea 10 minutos.

## Créditos

Este producto usa la API de TMDB pero no está respaldado ni certificado por
TMDB. El cine de dominio público procede de <https://archive.org>.
