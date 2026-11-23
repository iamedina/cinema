/**
 * Compatibilidad: `node server.js` sigue funcionando.
 * El servidor real vive en backend/server.js.
 */
"use strict";

require("./backend/server.js").iniciar();
