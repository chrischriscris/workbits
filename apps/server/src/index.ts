import { createServer } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { OfficeRoom } from "./rooms/OfficeRoom";

const port = Number(process.env.PORT ?? 3101);

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    });
    response.end(JSON.stringify({ ok: true, service: "workbits-realtime" }));
    return;
  }

  response.writeHead(200, {
    "content-type": "text/plain",
    "access-control-allow-origin": "*",
  });
  response.end("Workbits realtime\n");
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("office", OfficeRoom);

await gameServer.listen(port);

console.log(`Workbits realtime listening on :${port}`);

process.on("SIGINT", () => {
  gameServer.gracefullyShutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  gameServer.gracefullyShutdown().finally(() => process.exit(0));
});
