const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const http = require('http');

// Create HTTP server with proper CORS headers
const server = http.createServer((req, res) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
  });
  res.end('WebSocket server is running');
});

// Create WebSocket server with explicit options
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false,
  clientTracking: true
});

// Store lobbies with their codes
const lobbies = {};

// Generate a random 5-digit code
function generateLobbyCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

wss.on('connection', (ws, req) => {
  console.log('New client connected from:', req.socket.remoteAddress);
  ws.id = uuidv4(); // Assign unique ID to each connection
  ws.isAlive = true; // For connection monitoring

  // Handle pong responses
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      // Handle binary message if needed
      const messageStr = message instanceof Buffer ? message.toString() : message;
      const data = JSON.parse(messageStr);
      console.log('Received message:', data);
      
      switch(data.type) {
        case 'create_lobby':
          handleCreateLobby(ws, data);
          break;
        case 'join_lobby':
          handleJoinLobby(ws, data);
          break;
        case 'start_game':
          handleStartGame(data.lobbyCode);
          break;
        case 'update_points':
          handleUpdatePoints(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // Send error back to client
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
    
    // Remove player from all lobbies
    for (const lobbyCode in lobbies) {
      const lobby = lobbies[lobbyCode];
      const previousPlayerCount = lobby.players.length;
      
      lobby.players = lobby.players.filter(player => player.ws.id !== ws.id);
      
      // If player was removed
      if (previousPlayerCount > lobby.players.length) {
        // If admin left, assign a new admin or delete the lobby
        if (lobby.admin && lobby.admin.ws.id === ws.id) {
          if (lobby.players.length > 0) {
            lobby.admin = lobby.players[0];
            console.log(`New admin assigned in lobby ${lobbyCode}: ${lobby.admin.username}`);
          } else {
            console.log(`Deleting empty lobby ${lobbyCode}`);
            delete lobbies[lobbyCode];
            continue;
          }
        }
        
        broadcastLobbyUpdate(lobbyCode);
      }
    }
    
    // Clear any intervals associated with this connection
    if (ws.pingInterval) {
      clearInterval(ws.pingInterval);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  // Individual keep-alive mechanism for this connection
  ws.pingInterval = setInterval(() => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  }, 30000);
});

function handleCreateLobby(ws, data) {
  try {
    const lobbyCode = generateLobbyCode();
    const player = {
      ws,
      username: data.username || 'Anonymous',
      avatar: data.avatar || 'https://example.com/default-avatar.png',
      points: 0,
      ready: false
    };
    
    // Create new lobby with this player as admin
    lobbies[lobbyCode] = {
      code: lobbyCode,
      admin: player,
      players: [player],
      gameInProgress: false,
      createdAt: new Date()
    };
    
    console.log(`Lobby created with code: ${lobbyCode}`);
    
    // Generate QR code with the actual domain from environment or config
    const domain = process.env.APP_DOMAIN || 'localhost:3000';
    QRCode.toDataURL(`http://${domain}/join?code=${lobbyCode}`, (err, url) => {
      if (err) {
        console.error('Error generating QR code:', err);
        // Send lobby info without QR code
        ws.send(JSON.stringify({
          type: 'lobby_created',
          lobbyCode,
          isAdmin: true
        }));
      } else {
        // Send lobby info with QR code
        ws.send(JSON.stringify({
          type: 'lobby_created',
          lobbyCode,
          qrCode: url,
          isAdmin: true
        }));
      }
      
      broadcastLobbyUpdate(lobbyCode);
    });
  } catch (error) {
    console.error('Error creating lobby:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to create lobby'
    }));
  }
}

function handleJoinLobby(ws, data) {
  try {
    const { lobbyCode, username, avatar } = data;
    
    // Check if lobby exists
    if (!lobbies[lobbyCode]) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Lobby not found'
      }));
      return;
    }
    
    const lobby = lobbies[lobbyCode];
    
    // Check if game is already in progress
    if (lobby.gameInProgress) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Game already in progress'
      }));
      return;
    }
    
    // Check if player already exists
    const existingPlayerIndex = lobby.players.findIndex(
      p => p.username === username
    );
    
    if (existingPlayerIndex !== -1) {
      // Update existing player's connection
      lobby.players[existingPlayerIndex].ws = ws;
      lobby.players[existingPlayerIndex].avatar = avatar || lobby.players[existingPlayerIndex].avatar;
    } else {
      // Add new player
      const newPlayer = { 
        ws,
        username: username || 'Anonymous',
        avatar: avatar || 'https://example.com/default-avatar.png',
        points: 0,
        ready: false
      };
      lobby.players.push(newPlayer);
    }
    
    console.log(`Player joined lobby ${lobbyCode}: ${username}`);
    
    // Tell the player if they're admin
    const isAdmin = lobby.admin && lobby.admin.ws.id === ws.id;
    ws.send(JSON.stringify({
      type: 'joined_lobby',
      lobbyCode,
      isAdmin
    }));
    
    broadcastLobbyUpdate(lobbyCode);
  } catch (error) {
    console.error('Error joining lobby:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join lobby'
    }));
  }
}

function handleStartGame(lobbyCode) {
  try {
    if (!lobbies[lobbyCode]) {
      console.error(`Cannot start game: Lobby ${lobbyCode} not found`);
      return;
    }
    
    const lobby = lobbies[lobbyCode];
    lobby.gameInProgress = true;
    
    console.log(`Game started in lobby ${lobbyCode}!`);
    
    broadcast(lobbyCode, {
      type: 'game_started',
      players: lobby.players.map(p => ({
        username: p.username,
        avatar: p.avatar,
        points: p.points
      }))
    });
  } catch (error) {
    console.error('Error starting game:', error);
  }
}

function handleUpdatePoints(data) {
  try {
    const { lobbyCode, username, points } = data;
    if (!lobbies[lobbyCode]) {
      console.error(`Cannot update points: Lobby ${lobbyCode} not found`);
      return;
    }
    
    const lobby = lobbies[lobbyCode];
    const player = lobby.players.find(p => p.username === username);
    
    if (player) {
      player.points = points;
      broadcastLeaderboardUpdate(lobbyCode);
    } else {
      console.error(`Player ${username} not found in lobby ${lobbyCode}`);
    }
  } catch (error) {
    console.error('Error updating points:', error);
  }
}

function broadcastLobbyUpdate(lobbyCode) {
  try {
    if (!lobbies[lobbyCode]) {
      console.error(`Cannot broadcast update: Lobby ${lobbyCode} not found`);
      return;
    }
    
    const lobby = lobbies[lobbyCode];
    const playerData = lobby.players.map(p => ({
      username: p.username,
      avatar: p.avatar,
      ready: p.ready
    }));
    
    console.log(`Broadcasting lobby update for ${lobbyCode} with ${playerData.length} players`);
    
    broadcast(lobbyCode, {
      type: 'lobby_update',
      lobbyCode,
      players: playerData,
      adminUsername: lobby.admin ? lobby.admin.username : null
    });
  } catch (error) {
    console.error('Error broadcasting lobby update:', error);
  }
}

function broadcastLeaderboardUpdate(lobbyCode) {
  try {
    if (!lobbies[lobbyCode]) {
      console.error(`Cannot broadcast leaderboard: Lobby ${lobbyCode} not found`);
      return;
    }
    
    const lobby = lobbies[lobbyCode];
    broadcast(lobbyCode, {
      type: 'leaderboard_update',
      players: lobby.players.map(p => ({
        username: p.username,
        avatar: p.avatar,
        points: p.points
      }))
    });
  } catch (error) {
    console.error('Error broadcasting leaderboard update:', error);
  }
}

function broadcast(lobbyCode, data) {
  try {
    if (!lobbies[lobbyCode]) {
      console.error(`Cannot broadcast: Lobby ${lobbyCode} not found`);
      return;
    }
    
    const message = JSON.stringify(data);
    console.log(`Broadcasting to lobby ${lobbyCode}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    let successCount = 0;
    lobbies[lobbyCode].players.forEach(player => {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        try {
          player.ws.send(message);
          successCount++;
        } catch (error) {
          console.error(`Error sending message to player ${player.username}:`, error);
        }
      }
    });
    
    console.log(`Successfully sent message to ${successCount}/${lobbies[lobbyCode].players.length} players in lobby ${lobbyCode}`);
  } catch (error) {
    console.error('Error broadcasting message:', error);
  }
}

// Clean up inactive lobbies periodically
setInterval(() => {
  const now = new Date();
  for (const lobbyCode in lobbies) {
    const lobby = lobbies[lobbyCode];
    // Remove lobbies older than 3 hours
    if (now - lobby.createdAt > 3 * 60 * 60 * 1000) {
      console.log(`Removing inactive lobby ${lobbyCode}`);
      delete lobbies[lobbyCode];
    }
  }
}, 60 * 60 * 1000); // Check every hour

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log(`HTTP server running on http://localhost:${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.clients.forEach(client => {
    client.terminate();
  });
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
