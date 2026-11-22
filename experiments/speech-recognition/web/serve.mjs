import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const root = new URL("..", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".wav": "audio/wav" };
createServer(async (req, res) => {
  const path = join(root, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)));
  try {
    const body = await readFile(path.endsWith("/") ? join(path, "index.html") : path);
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "text/html", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "credentialless" });
    res.end(body);
  } catch { res.writeHead(404).end(); }
}).listen(8765, () => console.log("http://localhost:8765/web/"));
