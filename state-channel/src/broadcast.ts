import WebSocket from "ws";

const connectedClients = new Set<WebSocket>();
const MAX_BUFFER = 50;
const messageBuffer: string[] = [];

export function addClient(ws: WebSocket) {
  connectedClients.add(ws);
  console.log(`[broadcast] addClient called, buffer has ${messageBuffer.length} messages, ws.readyState=${ws.readyState}, OPEN=${WebSocket.OPEN}`);
  for (const msg of messageBuffer) {
    try {
      ws.send(msg);
    } catch (err) {
      console.error("[broadcast] error replaying buffer:", err);
    }
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
    console.log(`[broadcast] buffered ${direction} message, buffer size: ${messageBuffer.length}, clients: ${connectedClients.size}`);
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(log);
      }
    }
  } catch (err) {
    console.error("[broadcast] error in broadcastNetworkLog:", err);
  }
}
