/**
 * Copia este archivo como `config.local.js` y pon tu credencial de TMDB.
 *
 *   copy config.example.js config.local.js   (Windows)
 *   cp config.example.js config.local.js     (Linux/Mac)
 *
 * `config.local.js` está en .gitignore: la credencial nunca se sube a git.
 *
 * ¿Cómo consigo la credencial?
 *   1. Crea una cuenta gratis en https://www.themoviedb.org/signup
 *   2. Ajustes de la cuenta -> API -> solicita una clave para uso personal
 *
 * Sirve cualquiera de las dos que te da TMDB:
 *
 *   - API Key (v3 auth): 32 caracteres, por ejemplo "a1b2c3d4e5f6..."
 *   - API Read Access Token (v4 auth): un texto largo que empieza por "eyJ..."
 *
 * El servidor detecta cuál le has puesto y la envía como corresponde
 * (?api_key=... o Authorization: Bearer ...). También puedes usar la
 * variable de entorno TMDB_API_KEY.
 */
module.exports = {
  TMDB_API_KEY: "PON_AQUI_TU_CREDENCIAL_DE_TMDB",
};
