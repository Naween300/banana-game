const WebSocket = require('ws');

// Create a WebSocket server that listens on port 8080
const wss = new WebSocket.Server({ port: 8080 });

// Store connected players
let players = [];

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Handle incoming messages from the client
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'join_lobby') {
      // Add the player to the list
      const player = { username: data.username, avatar: data.avatar, ws };
      players.push(player);

      console.log(`Player joined: ${player.username}`);
      console.log(`Current players:`, players.map((p) => p.username));

      // Broadcast updated player list to all clients
      broadcast({
        type: 'update_lobby',
        players: players.map((p) => ({ username: p.username, avatar: p.avatar })),
      });
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');

    // Remove the disconnected player
    players = players.filter((player) => player.ws !== ws);

    // Broadcast updated player list to all clients
    broadcast({
      type: 'update_lobby',
      players: players.map((p) => ({ username: p.username, avatar: p.avatar })),
    });
  });

  // Keep-alive mechanism to prevent idle disconnections
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000); // Ping every 30 seconds

  ws.on('close', () => clearInterval(interval)); // Clear interval on disconnect
});

// Broadcast a message to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

console.log('WebSocket server is running on ws://localhost:8080');
