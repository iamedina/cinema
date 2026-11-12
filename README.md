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

## Activar TMDB (catálogo amplio y tráilers)

Sin clave, el sitio funciona con OMDb (10 resultados por página y sin
tráilers). Con clave de TMDB pasa a mostrar **60 títulos por página**, listados
reales por popularidad, fichas en español y tráiler embebido.

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

## Mi lista (favoritos)

Cada póster tiene un corazón que guarda el título en el navegador
(`localStorage`), sin cuenta ni servidor. La lista se puede ver en
`favoritos.html` y el contador aparece en la cabecera.

- Se guarda la **ficha completa** (id, título, año, tipo y póster), así la
  página funciona al instante y sin pedir nada a la API.
- Se sincroniza entre pestañas del mismo navegador.
- Si el navegador bloquea el almacenamiento, el sitio sigue funcionando: solo
  no recuerda la lista.

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

`descripcion.html?id=...` muestra el tráiler, **reparto** (con foto y personaje),
**plataformas de streaming** (JustWatch vía TMDB, con enlace a todas las
opciones), **galería** de imágenes con lightbox y **títulos similares**
(clicables y con corazón para guardar en Mi lista).

- Solo se muestra lo que la API devuelve: si un título no tiene plataformas
  registradas, esa sección no aparece.
- El reparto se limita a 12 actores y los similares a 12, para que la rejilla
  no deje huecos.
- Con OMDb (doble clic, sin servidor) se muestra el reparto en texto y el
  resto de secciones se omite.

## Estructura

```
index.html          Portada con tres carruseles
busqueda.html       Resultados de búsqueda
pelicula.html       Listado de películas  (body data-tipo="movie")
serie.html          Listado de series     (body data-tipo="series")
anime.html          Listado de anime      (body data-tipo="anime")
descripcion.html    Ficha de un título    (?id=...)
favoritos.html      Mi lista (favoritos guardados en el navegador)

css/style.css       Todos los estilos
js/api.js           Datos: TMDB vía proxy, OMDb de respaldo, caché
js/almacen.js       Acceso seguro a localStorage (claves versionadas)
js/favoritos.js     Corazón, contador y lista de favoritos
js/generos.js       Géneros fijos de TMDB (sin petición extra)
js/filtros.js       Barra de filtros y estado en la URL
js/ui.js            Tarjetas, escapado de HTML, navegación
js/buscador.js      Buscador de la cabecera
js/home.js          Carruseles de la portada
js/busqueda.js      Búsqueda + paginación
js/listado.js       Listados por tipo, filtros y paginación
js/detalle.js       Ficha: tráiler, reparto, plataformas, galería y similares
js/mi-lista.js      Página Mi lista

server.js           Estático + proxy TMDB + fusión de páginas
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

## Créditos

Este producto usa la API de TMDB pero no está respaldado ni certificado por
TMDB.
