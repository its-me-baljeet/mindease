// types/edge-runtime.d.ts
// Make TypeScript aware of Edge runtime specifics used by Next.js

// WebSocketPair is available at runtime in Edge but not in TS lib DOM.
declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
  constructor();
}

// Next.js Edge ResponseInit allows `webSocket` to upgrade the connection.
interface ResponseInit {
  webSocket?: WebSocket;
}
