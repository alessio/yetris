import WebSocket from "ws";

const connectedClients = new Set<WebSocket>();
const MAX_BUFFER = 50;
const messageBuffer: string[] = [];

export function addClient(ws: WebSocket) {
  connectedClients.add(ws);
  for (const msg of messageBuffer) {
    try {
      ws.send(msg);
    } catch {}
  }
}

export function removeClient(ws: WebSocket) {
  connectedClients.delete(ws);
}

export function broadcastNetworkLog(direction: "sent" | "received", data: unknown) {
  try {
    const log = JSON.stringify({
      type: "networkLog",
      direction,
      timestamp: new Date().toISOString(),
      data,
    });
    messageBuffer.push(log);
    if (messageBuffer.length > MAX_BUFFER) {
      messageBuffer.shift();
    }
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(log);
      }
    }
  } catch {}
}
