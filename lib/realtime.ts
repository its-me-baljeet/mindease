// lib/realtime.ts

// Import the ws WebSocket type explicitly (type-only import avoids DOM conflicts)
// Use InstanceType on the module's exported constructor to get the runtime WebSocket instance type.
type WsWebSocket = InstanceType<typeof import("ws")>;

type Client = WsWebSocket;

// Use global state from custom server if available
const globalWS = globalThis as unknown as {
  _emotionClients?: Set<Client>;
  wsBroadcast?: (data: unknown) => void;
  wsClients?: Set<Client>;
};

// Fallback for when custom server isn't running (shouldn't happen in production)
if (!globalWS._emotionClients) {
  globalWS._emotionClients = new Set<Client>();
}

export const clients = globalWS.wsClients ?? globalWS._emotionClients;

export function addClient(ws: Client) {
  clients.add(ws);
  ws.on("close", () => {
    clients.delete(ws);
  });
}

export function broadcast(data: unknown) {
  // Use global broadcast if available (from custom server)
  if (globalWS.wsBroadcast) {
    globalWS.wsBroadcast(data);
    return;
  }

  // Fallback implementation
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    try {
      if (ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(msg);
      }
    } catch {
      clients.delete(ws);
    }
  }
}
