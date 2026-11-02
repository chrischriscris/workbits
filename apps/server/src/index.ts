import { existsSync } from "node:fs";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AccessToken } from "livekit-server-sdk";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { presence, voiceRoomFor } from "./presence";
import { OfficeRoom } from "./rooms/OfficeRoom";

const port = Number(process.env.PORT ?? 3101);
const livekitUrl = process.env.LIVEKIT_URL ?? "ws://localhost:7880";
const livekitKey = process.env.LIVEKIT_API_KEY ?? "devkey";
const livekitSecret = process.env.LIVEKIT_API_SECRET ?? "secret";
const webDist = resolve(
  process.env.WEB_DIST ?? fileURLToPath(new URL("../../web/dist/", import.meta.url)),
);
const hasWebBuild = existsSync(join(webDist, "index.html"));

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function serveStatic(
  request: { method?: string; headers: { accept?: string } },
  response: import("node:http").ServerResponse,
  pathname: string,
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (relative === "") relative = "index.html";
  let filePath = resolve(webDist, relative);
  if (!filePath.startsWith(resolve(webDist) + sep) && filePath !== join(webDist, "index.html")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  let info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) {
    const wantsHtml = (request.headers.accept ?? "").includes("text/html");
    if (wantsHtml || !extname(relative)) {
      relative = "index.html";
      filePath = join(webDist, "index.html");
      info = await stat(filePath).catch(() => null);
    }
  }

  if (!info?.isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const hashed = /\/assets\/.+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2?)$/.test(pathname);
  response.writeHead(200, {
    "content-type": mime[extname(filePath)] ?? "application/octet-stream",
    "content-length": info.size,
    "cache-control": hashed
      ? "public, max-age=31536000, immutable"
      : "no-cache",
    "x-content-type-options": "nosniff",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

const httpServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
  };

  if (request.method === "OPTIONS") {
    response.writeHead(204, cors);
    response.end();
    return;
  }

  if (url.pathname === "/health") {
    response.writeHead(200, { ...cors, "content-type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "workbits",
        web: hasWebBuild,
        livekit: livekitUrl,
      }),
    );
    return;
  }

  if (url.pathname === "/occupancy") {
    const characters = [...new Set([...presence.values()].map((entry) => entry.characterId))];
    const zones: Record<string, number> = {};
    for (const entry of presence.values()) {
      zones[entry.zone] = (zones[entry.zone] ?? 0) + 1;
    }
    response.writeHead(200, { ...cors, "content-type": "application/json" });
    response.end(
      JSON.stringify({
        count: presence.size,
        characters,
        zones,
      }),
    );
    return;
  }

  if (url.pathname === "/livekit/token") {
    const identity = url.searchParams.get("identity")?.slice(0, 80);
    const name = url.searchParams.get("name")?.slice(0, 40) ?? identity ?? "Guest";
    if (!identity) {
      response.writeHead(400, { ...cors, "content-type": "application/json" });
      response.end(JSON.stringify({ error: "identity is required" }));
      return;
    }

    const key = url.searchParams.get("key") ?? "";
    const participant = presence.get(identity);
    if (!participant || !key || key !== participant.voiceKey) {
      response.writeHead(403, { ...cors, "content-type": "application/json" });
      response.end(JSON.stringify({ error: "voice is not available for this session" }));
      return;
    }

    // The room is derived from the server-authoritative zone, never the client.
    const room = voiceRoomFor(participant.zone);
    console.log(`voice token ${identity} zone=${participant.zone} room=${room}`);

    try {
      const token = new AccessToken(livekitKey, livekitSecret, {
        identity,
        name,
        ttl: "10m",
      });
      token.addGrant({
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
      });
      const jwt = await token.toJwt();
      response.writeHead(200, { ...cors, "content-type": "application/json" });
      response.end(JSON.stringify({ token: jwt, url: livekitUrl, room }));
    } catch (error) {
      response.writeHead(500, { ...cors, "content-type": "application/json" });
      response.end(JSON.stringify({ error: "could not mint LiveKit token" }));
      console.error("LiveKit token error", error);
    }
    return;
  }

  if (hasWebBuild) {
    await serveStatic(request, response, url.pathname);
    return;
  }

  response.writeHead(200, { ...cors, "content-type": "text/plain; charset=utf-8" });
  response.end("Workbits realtime. Build apps/web and restart to serve the app here.\n");
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("office", OfficeRoom);

await gameServer.listen(port);

console.log(`Workbits listening on :${port}`);
console.log(hasWebBuild ? `Serving web build from ${webDist}` : "No web build found (dev mode)");
console.log(`LiveKit signaling: ${livekitUrl}`);

process.on("SIGINT", () => {
  gameServer.gracefullyShutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  gameServer.gracefullyShutdown().finally(() => process.exit(0));
});
