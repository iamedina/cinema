# CINEMA

Catálogo de películas, series y anime. Interfaz estática (HTML + CSS + JS) con
un pequeño servidor Node que hace de proxy de TMDB, de modo que la clave de la
API nunca se envía al navegador.

## Arrancar

```bash
node server.js
```

Abre <http://127.0.0.1:8080>.

No hace falta `npm install`: el servidor solo usa módulos nativos de Node
(fetch incluido, Node 18 o superior).

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

4. Reinicia el servidor (`Ctrl+C` y `node server.js`).

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

## Estructura

```
index.html          Portada con tres carruseles
busqueda.html       Resultados de búsqueda
pelicula.html       Listado de películas  (body data-tipo="movie")
serie.html          Listado de series     (body data-tipo="series")
anime.html          Listado de anime      (body data-tipo="anime")
descripcion.html    Ficha de un título    (?id=...)

css/style.css       Todos los estilos
js/api.js           Datos: TMDB vía proxy, OMDb de respaldo, caché
js/ui.js            Tarjetas, escapado de HTML, navegación
js/buscador.js      Buscador de la cabecera
js/home.js          Carruseles de la portada
js/busqueda.js      Búsqueda + paginación
js/listado.js       Listados por tipo
js/detalle.js       Ficha + tráiler embebido

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
