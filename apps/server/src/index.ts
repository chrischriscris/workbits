import { createServer } from "node:http";
import { AccessToken } from "livekit-server-sdk";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { OfficeRoom } from "./rooms/OfficeRoom";

const port = Number(process.env.PORT ?? 3101);
const livekitUrl = process.env.LIVEKIT_URL ?? "ws://localhost:7880";
const livekitKey = process.env.LIVEKIT_API_KEY ?? "devkey";
const livekitSecret = process.env.LIVEKIT_API_SECRET ?? "secret";

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
        service: "workbits-realtime",
        livekit: livekitUrl,
      }),
    );
    return;
  }

  if (url.pathname === "/livekit/token") {
    const identity = url.searchParams.get("identity")?.slice(0, 80);
    const room = url.searchParams.get("room")?.slice(0, 80) ?? "office:workbits-loft";
    const name = url.searchParams.get("name")?.slice(0, 40) ?? identity ?? "Guest";
    if (!identity) {
      response.writeHead(400, { ...cors, "content-type": "application/json" });
      response.end(JSON.stringify({ error: "identity is required" }));
      return;
    }

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
      response.end(JSON.stringify({ token: jwt, url: livekitUrl }));
    } catch (error) {
      response.writeHead(500, { ...cors, "content-type": "application/json" });
      response.end(JSON.stringify({ error: "could not mint LiveKit token" }));
      console.error("LiveKit token error", error);
    }
    return;
  }

  response.writeHead(200, { ...cors, "content-type": "text/plain" });
  response.end("Workbits realtime\n");
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("office", OfficeRoom);

await gameServer.listen(port);

console.log(`Workbits realtime listening on :${port}`);
console.log(`LiveKit signaling: ${livekitUrl}`);

process.on("SIGINT", () => {
  gameServer.gracefullyShutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  gameServer.gracefullyShutdown().finally(() => process.exit(0));
});
