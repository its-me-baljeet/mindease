// server.js - Custom Next.js server with WebSocket support
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer } = require("ws");

// Import our realtime module (Node.js will use the compiled TS -> JS from .next or we'll use require)
// Since this is a .js file, we'll handle the WebSocket logic directly here
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global clients set to track WebSocket connections
const clients = new Set();

function addClient(ws) {
  clients.add(ws);
  ws.on("close", () => {
    clients.delete(ws);
  });
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    try {
      if (ws.readyState === 1) {
        // OPEN
        ws.send(msg);
      }
    } catch {
      clients.delete(ws);
    }
  }
}

// Export for API routes to use
global.wsClients = clients;
global.wsBroadcast = broadcast;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server with noServer: true
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    console.log("✅ WebSocket client connected");
    addClient(ws);

    ws.on("message", (data) => {
      console.log("📩 Received:", data.toString());
    });

    ws.on("close", () => {
      console.log("❌ WebSocket client disconnected");
    });
  });

  // Get Next.js upgrade handler after prepare()
  const nextUpgrade = app.getUpgradeHandler();

  // Handle WebSocket upgrade
  server.on("upgrade", async (req, socket, head) => {
    const { pathname } = parse(req.url, true);
    console.log(`🔄 Upgrade request received for: ${pathname}`);

    if (pathname === "/api/emotion/ws") {
      console.log("📡 Handling emotion WebSocket upgrade");
      // Handle our custom emotion WebSocket
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      console.log(`📡 Delegating upgrade to Next.js for: ${pathname}`);
      // Let Next.js handle all other upgrades (HMR, etc.)
      try {
        await nextUpgrade(req, socket, head);
      } catch (err) {
        console.error("Upgrade error:", err);
        socket.destroy();
      }
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Ready on http://${hostname}:${port}`);
    console.log(
      `🔌 WebSocket endpoint: ws://${hostname}:${port}/api/emotion/ws`
    );
  });
});
