const WebSocket = require('ws');
const http = require('http');

// Simple HTTP server to satisfy Render's health checks and port binding
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Simona WebSocket Bridge is Running.\nConnect via WebSocket client.');
});

const wss = new WebSocket.Server({ server });

console.log('WebSocket Server started...');

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Keep-alive logic: Respond to pings
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (message) => {
    try {
      // 1. Parse the message (it usually comes as a Buffer or String)
      const msgString = message.toString();
      
      // Optional: Parse JSON to filter, but for a bridge, we mostly just forward
      // const parsed = JSON.parse(msgString);

      // 2. Broadcast to ALL other connected clients
      // This sends Recall.ai's data to the Simona Frontend
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msgString);
        }
      });
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (e) => {
    console.error('WebSocket error:', e);
  });
});

// Heartbeat to keep connections alive on platforms like Render
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
