import { WebSocket } from "ws";

const connectedClients = new Set<WebSocket>();

export function addClient(ws: WebSocket) {
  connectedClients.add(ws);
}

export function removeClient(ws: WebSocket) {
  connectedClients.delete(ws);
}

export function broadcastNetworkLog(direction: "sent" | "received", data: unknown) {
  const log = JSON.stringify({
    type: "networkLog",
    direction,
    timestamp: new Date().toISOString(),
    data,
  });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(log);
    }
  }
}
