/**
 * CINEMA · verificación en navegador (E2E) sin dependencias externas.
 * ------------------------------------------------------------
 * Arranca el servidor en un puerto libre, abre Chrome con CDP, recorre
 * las páginas en dos anchos y comprueba errores de consola, estructura
 * básica, desbordamiento horizontal y cabeceras del servidor.
 *
 * Uso: npm run test:e2e
 * Requiere Chrome/Chromium y Node 18+ con WebSocket global (Node 22+).
 */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const PAGINAS = [
  "index.html",
  "pelicula.html",
  "serie.html",
  "anime.html",
  "busqueda.html?query=matrix",
  "descripcion.html?id=tmdb-movie-603",
  "persona.html?id=6384",
  "dominio-publico.html",
  "favoritos.html",
  "ajustes.html",
  "legal.html",
  "404.html",
];
const ANCHOS = [1440, 390];
const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function puertoLibre() {
  return new Promise((resolver, rechazar) => {
    const servidor = createServer();
    servidor.once("error", rechazar);
    servidor.listen(0, "127.0.0.1", () => {
      const puerto = servidor.address().port;
      servidor.close(() => resolver(puerto));
    });
  });
}

function rutaChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidatas = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
      ]
    : process.platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidatas.find((ruta) => ruta && existsSync(ruta)) || null;
}

async function esperarHttp(url, intentos = 40) {
  for (let i = 0; i < intentos; i += 1) {
    try {
      const respuesta = await fetch(url);
      if (respuesta.ok || respuesta.status === 404) return respuesta;
    } catch {
      /* todavía no está arrancado */
    }
    await dormir(250);
  }
  throw new Error("No respondió " + url);
}

function matar(proc) {
  if (!proc || proc.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    proc.kill("SIGTERM");
  }
}

async function conectarCdp(puerto) {
  const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
  const objetivo = lista.find((entrada) => entrada.type === "page");
  if (!objetivo) throw new Error("Chrome no expuso ninguna pestaña");

  const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  await new Promise((resolver, rechazar) => {
    ws.addEventListener("open", resolver, { once: true });
    ws.addEventListener("error", rechazar, { once: true });
  });

  let id = 0;
  const pendientes = new Map();
  const manejadores = new Map();
  ws.addEventListener("message", (evento) => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.id && pendientes.has(mensaje.id)) {
      const { resolver, rechazar } = pendientes.get(mensaje.id);
      pendientes.delete(mensaje.id);
      mensaje.error ? rechazar(new Error(mensaje.error.message)) : resolver(mensaje.result);
    } else if (mensaje.method && manejadores.has(mensaje.method)) {
      for (const funcion of manejadores.get(mensaje.method)) funcion(mensaje.params);
    }
  });

  const enviar = (method, params = {}) =>
    new Promise((resolver, rechazar) => {
      const numero = ++id;
      pendientes.set(numero, { resolver, rechazar });
      ws.send(JSON.stringify({ id: numero, method, params }));
    });

  const evaluar = async (expression) => {
    const resultado = await enviar("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (resultado.exceptionDetails) throw new Error(resultado.exceptionDetails.text);
    return resultado.result.value;
  };

  return { ws, enviar, evaluar, manejadores };
}

async function main() {
  const chrome = rutaChrome();
  if (!chrome) {
    console.log("E2E omitido: no se encontró Chrome (define CHROME_PATH).");
    return 0;
  }

  const puertoServidor = await puertoLibre();
  const puertoCdp = await puertoLibre();
  const perfil = await mkdtemp(path.join(tmpdir(), "cinema-e2e-"));
  const base = `http://127.0.0.1:${puertoServidor}`;
  let servidor = null;
  let navegador = null;
  let cdp = null;

  try {
    servidor = spawn(process.execPath, ["backend/server.js"], {
      cwd: RAIZ,
      env: { ...process.env, PORT: String(puertoServidor) },
      stdio: "ignore",
    });
    await esperarHttp(base + "/api/health");

    navegador = spawn(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        `--remote-debugging-port=${puertoCdp}`,
        `--user-data-dir=${perfil}`,
        "about:blank",
      ],
      { stdio: "ignore" }
    );
    await esperarHttp(`http://127.0.0.1:${puertoCdp}/json/version`);
    cdp = await conectarCdp(puertoCdp);
    await cdp.enviar("Page.enable");
    await cdp.enviar("Runtime.enable");
    await cdp.enviar("Log.enable");
    await cdp.enviar("Network.enable");
    /* El recorrido comprueba el sitio, no la red de terceros: bloquear
       pósters, fuentes, vídeos y tráilers lo hace rápido y determinista. */
    await cdp.enviar("Network.setBlockedURLs", {
      urls: [
        "*://image.tmdb.org/*",
        "*://fonts.googleapis.com/*",
        "*://fonts.gstatic.com/*",
        "*://i.ytimg.com/*",
        "*://www.youtube.com/*",
        "*://www.youtube-nocookie.com/*",
        "*://archive.org/*",
        "*://*.archive.org/*",
      ],
    });

    /* Cabeceras y rutas que no deben exponerse. */
    const inicio = await fetch(base + "/");
    if (inicio.headers.get("content-security-policy")?.includes("script-src 'self'") !== true) {
      throw new Error("Falta la CSP en la respuesta HTML");
    }
    for (const oculto of ["/server.js", "/backend/server.js", "/backend/config.local.js"]) {
      const respuesta = await fetch(base + oculto);
      if (respuesta.status !== 404) throw new Error(oculto + " se sirve públicamente");
    }

    let total = 0;
    let correctos = 0;
    for (const ancho of ANCHOS) {
      await cdp.enviar("Emulation.setDeviceMetricsOverride", {
        width: ancho,
        height: ancho === 1440 ? 1000 : 844,
        deviceScaleFactor: 1,
        mobile: ancho < 600,
      });

      for (const pagina of PAGINAS) {
        const errores = [];
        const capturar = (parametros) => {
          if (parametros.entry?.level === "error") errores.push(parametros.entry.text);
          if (parametros.exceptionDetails) errores.push(parametros.exceptionDetails.text);
        };
        cdp.manejadores.clear();
        cdp.manejadores.set("Log.entryAdded", [capturar]);
        cdp.manejadores.set("Runtime.exceptionThrown", [capturar]);

        await cdp.enviar("Page.navigate", { url: base + "/" + pagina });
        await dormir(700);
        cdp.manejadores.clear();

        const datos = await cdp.evaluar(`(async () => {
          if (document.fonts) await document.fonts.ready;
          return {
            titulo: document.title,
            main: !!document.querySelector('main#contenido'),
            pie: !!document.querySelector('footer'),
            desborde: document.documentElement.scrollWidth - window.innerWidth,
            fuente: getComputedStyle(document.body).fontFamily,
            carasPoppins: document.fonts
              ? [...document.fonts].filter((f) => f.family === 'Poppins').length
              : 0,
            manifest: !!document.querySelector('link[rel="manifest"]')
          };
        })()`);

        const fallos = [];
        if (!datos.titulo) fallos.push("sin título");
        if (!datos.main) fallos.push("sin main");
        if (!datos.pie) fallos.push("sin pie");
        if (datos.desborde > 1) fallos.push("desborde " + datos.desborde);
        if (!/Poppins/.test(datos.fuente)) fallos.push("sin Poppins");
        if (!datos.carasPoppins) fallos.push("Poppins local no cargada");
        if (!datos.manifest) fallos.push("sin manifest");
        if (errores.length) fallos.push("consola: " + errores[0].slice(0, 160));

        total += 1;
        if (!fallos.length) correctos += 1;
        console.log(`${fallos.length ? "FAIL" : "OK  "} ${ancho}px ${pagina.padEnd(36)} ${fallos.join(", ")}`);
      }
    }

    console.log(`\nTOTAL E2E: ${correctos}/${total}`);
    return correctos === total ? 0 : 1;
  } finally {
    if (cdp) cdp.ws.close();
    matar(navegador);
    matar(servidor);
    await Promise.race([
      rm(perfil, { recursive: true, force: true }).catch(() => {}),
      dormir(3000),
    ]);
  }
}

const codigo = await main();
process.exit(codigo);
