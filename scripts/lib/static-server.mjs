// Minimal static file server for exported sites and consumer builds (docs preview, browser checks).
// Serves <root> under an optional base path, resolves "dir/" to "dir/index.html", falls back to
// 404.html with status 404. Node standard library only; binds to 127.0.0.1.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".zip": "application/zip",
  ".map": "application/json; charset=utf-8",
};

/** Map a URL path to a file inside root, or undefined (never escapes root). */
export function resolveRequest(root, basePath, urlPath) {
  let path = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  if (basePath) {
    if (path !== basePath && !path.startsWith(`${basePath}/`)) return undefined;
    path = path.slice(basePath.length) || "/";
  }
  const absoluteRoot = resolve(root);
  const target = normalize(join(absoluteRoot, path));
  if (target !== absoluteRoot && !target.startsWith(absoluteRoot + sep)) return undefined;
  const candidates = [target, join(target, "index.html"), `${target}.html`];
  return candidates.find((file) => existsSync(file) && statSync(file).isFile());
}

export function startStaticServer(root, { basePath = "", port = 0 } = {}) {
  const server = createServer((request, response) => {
    const file = resolveRequest(root, basePath, request.url ?? "/");
    if (!file) {
      const notFound = join(root, "404.html");
      response.writeHead(404, { "content-type": TYPES[".html"] });
      if (existsSync(notFound)) createReadStream(notFound).pipe(response);
      else response.end("Not found");
      return;
    }
    const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
    response.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolvePromise) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const origin = `http://127.0.0.1:${address.port}`;
      resolvePromise({
        origin,
        url: (path = "/") => `${origin}${basePath}${path}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}
