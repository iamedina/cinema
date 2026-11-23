# Contribuir a CINEMA

Gracias por ayudar. Este proyecto prioriza que la interfaz siga funcionando
sin dependencias externas y sin enviar credenciales al navegador.

## Puesta en marcha

```bash
npm start          # servidor en http://127.0.0.1:8080
npm test           # pruebas con node:test
npm run test:e2e   # recorrido en Chrome (requiere Chrome y Node 22+)
npm run build:css  # genera css/style.min.css (no editar a mano)
```

No hay `npm install`: el servidor usa solo módulos nativos de Node 18+.
Para desarrollo con recarga automática, `npm run dev`.

## Dónde va cada cosa

- `frontend/`: HTML, CSS y JS públicos. Es la raíz web del servidor.
- `backend/`: servidor, configuración y proxies. Nunca se sirve como estático.
- `tests/`: pruebas `*.test.cjs` y el recorrido E2E en `tests/e2e/`.

El CSS se mantiene dividido en `frontend/css/NN-*.css` y se une mediante
`@import` en `style.css` **en el mismo orden**. No reordenes los imports:
la cascada forma parte del diseño.

## Normas breves

- Sin claves en el cliente. TMDB y OMDb se configuran en
  `backend/config.local.js` (ignorado por Git) o por variables de entorno.
- Todo dato que venga de una API se escapa con `ui.escapeHtml` antes de
  escribir HTML.
- Sin manejadores `onclick`/`onerror` inline: la CSP los bloquea. Usa
  `addEventListener` o delegación de eventos.
- Nueva funcionalidad → nueva prueba. `npm test` debe quedar en verde.
- Si cambias la paleta, conserva `--primario` para rellenos y usa
  `--color-enlace` para texto sobre fondos oscuros.

## Commits

Se escribe en español, con prefijo: `feat:`, `fix:`, `refactor:`, `docs:`,
`test:` o `chore:`. Ejemplo: `feat(busqueda): filtros por nota`.
Antes de abrir un PR, actualiza `CHANGELOG.md` si el cambio es visible.
