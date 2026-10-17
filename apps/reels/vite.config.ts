import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import { defineConfig } from "vite";
import { mediaFile, readCatalog } from "./src/catalog.ts";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const recordings = path.join(appRoot, "recordings");

function sendVideo(req: Connect.IncomingMessage, res: ServerResponse, file: string) {
  const stat = fs.statSync(file);
  const range = req.headers.range;
  const common = {
    "Accept-Ranges": "bytes",
    "Content-Type": "video/webm",
    "Cache-Control": "no-cache",
  };
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    const start = Number(match?.[1] ?? 0);
    const end = match?.[2] ? Number(match[2]) : stat.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stat.size) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...common,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...common, "Content-Length": stat.size });
  fs.createReadStream(file).pipe(res);
}

function attach(middlewares: Connect.Server) {
  middlewares.use((req, res, next) => {
    const url = req.url ?? "";
    if (url === "/api/catalog" || url.startsWith("/api/catalog?")) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ takes: readCatalog(recordings) }));
      return;
    }
    if (url.startsWith("/media/")) {
      const file = mediaFile(recordings, url);
      if (!file || !fs.existsSync(file)) {
        res.statusCode = 404;
        res.end("missing take");
        return;
      }
      sendVideo(req, res, file);
      return;
    }
    next();
  });
}

function recordingsPlugin(): Plugin {
  return {
    name: "reels-recordings",
    configureServer(server: ViteDevServer) {
      attach(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig({
  server: { host: "127.0.0.1", port: 8092, strictPort: true },
  preview: { host: "127.0.0.1", port: 8092, strictPort: true },
  plugins: [react(), recordingsPlugin()],
});
