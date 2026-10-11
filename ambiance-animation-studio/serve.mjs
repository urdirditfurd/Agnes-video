#!/usr/bin/env node
/** Serveur HTTP minimal (Node) — secours si Python absent. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORTS = [8765, 8766, 8767, 8768, 8769, 8770];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  console.error("ERREUR: index.html introuvable");
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, "lib/ffmpeg/ffmpeg.js"))) {
  console.error("ERREUR: lib/ffmpeg/ manquant");
  process.exit(1);
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return null;
  return full;
}

function openBrowser(url) {
  try {
    if (process.platform === "win32") exec(`start "" "${url}"`);
    else if (process.platform === "darwin") exec(`open "${url}"`);
    else exec(`xdg-open "${url}"`);
  } catch {
    /* ignore */
  }
}

const server = http.createServer((req, res) => {
  const filePath = safeJoin(ROOT, req.url || "/");
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("404");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(filePath).pipe(res);
});

function listen(i) {
  if (i >= PORTS.length) {
    console.error("ERREUR: aucun port libre (8765-8770)");
    process.exit(1);
  }
  const port = PORTS[i];
  const onError = () => {
    server.removeListener("error", onError);
    listen(i + 1);
  };
  server.once("error", onError);
  server.listen(port, "127.0.0.1", () => {
    server.removeListener("error", onError);
    const url = `http://127.0.0.1:${port}/`;
    console.log("");
    console.log("============================================");
    console.log(" Ambiance Animation Studio — serveur OK");
    console.log("============================================");
    console.log("");
    console.log("  Ouvrez :", url);
    console.log("  NE FERMEZ PAS cette fenetre.");
    console.log("");
    openBrowser(url);
  });
}

listen(0);
