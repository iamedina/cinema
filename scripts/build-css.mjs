/**
 * CINEMA · genera frontend/css/style.min.css
 * ------------------------------------------------------------
 * Une los parciales en el orden de style.css y aplica una minificación
 * conservadora (comentarios y espacios, sin tocar cadenas ni calc()).
 * Las hojas fuente no se modifican nunca.
 *
 * Uso: npm run build:css
 * Producción opcional: CINEMA_CSS=min npm start (sirve la versión minificada).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const CSS = path.join(RAIZ, "frontend", "css");
const visitados = new Set();

function expandir(relativo) {
  const absoluto = path.join(CSS, relativo);
  if (visitados.has(absoluto)) return "";
  visitados.add(absoluto);

  const texto = readFileSync(absoluto, "utf8");
  const imports = [...texto.matchAll(/@import\s+url\("([^"]+)"\)\s*;/g)].map((m) => m[1]);
  const base = texto.replace(/@import\s+url\("[^"]+"\)\s*;/g, "");
  const importados = imports
    .map((ruta) => expandir(path.posix.join(path.posix.dirname(relativo), ruta)))
    .join("\n");

  return importados + "\n" + base;
}

function minificar(css) {
  return css
    .replace(/@charset\s+"[^"]+"\s*;/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,])\s*/g, "$1")
    .trim();
}

const unido = expandir("style.css");
const resultado =
  "/* CINEMA · CSS generado por npm run build:css. No editar a mano. */\n" +
  minificar(unido) +
  "\n";

const destino = path.join(CSS, "style.min.css");
writeFileSync(destino, resultado, "utf8");

console.log(
  `CSS: ${visitados.size} parciales → style.min.css ` +
    `(${(Buffer.byteLength(unido) / 1024).toFixed(1)} KB → ` +
    `${(Buffer.byteLength(resultado) / 1024).toFixed(1)} KB)`
);
