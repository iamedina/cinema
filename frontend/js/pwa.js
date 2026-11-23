/**
 * CINEMA · registro del service worker.
 * Se carga como script externo para respetar la CSP (sin código inline).
 * Si el navegador no lo admite, el sitio sigue funcionando con normalidad.
 */
(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  function registrar() {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {
      /* Sin service worker el sitio sigue siendo totalmente funcional. */
    });
  }

  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar, { once: true });
})();
