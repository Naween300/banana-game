const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const http = require('http');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

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

// Leaderboard caching and rate limiting
const leaderboardCache = new Map();
const rateLimiter = new Map();

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

  // Interval to check client connections
  const interval = setInterval(() => {
    if (!ws.isAlive) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  }, 30000);

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
        case 'join_game':  
          handleJoinGame(ws, data);
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

  // Handle connection close
  ws.on('close', (code, reason) => {
    clearInterval(interval);
    console.log(`Client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
    
    // Remove player from all lobbies
    for (const lobbyCode in lobbies) {
      const lobby = lobbies[lobbyCode];
      const previousPlayerCount = lobby.players.length;
  
      // Remove the disconnected player
      lobby.players = lobby.players.filter(player => player.ws.id !== ws.id);
  
      if (previousPlayerCount > lobby.players.length) {
        // If admin left, assign a new admin or delete the lobby
        // If admin left, assign a new admin or delete the lobby
if (lobby.admin.ws.id === ws.id) {
  if (lobby.players.length > 0) {
    lobby.admin = lobby.players[0];
    console.log(`New admin assigned in lobby ${lobbyCode}: ${lobby.admin.username}`);
  } else if (!lobby.gameInProgress) {
    // Only delete the lobby if the game is not in progress
    console.log(`Deleting empty lobby ${lobbyCode}`);
    delete lobbies[lobbyCode];
    continue;
  } else {
    console.log(`Keeping empty lobby ${lobbyCode} because game is in progress`);
  }
}

  
        broadcastLobbyUpdate(lobbyCode);
      }
    }
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error('WebSocket connection error:', error);
  });
});
function handleCreateLobby(ws, data) {
  try {
    const lobbyCode = generateLobbyCode();
    const player = {
      ws,
      userId: uuidv4(),
      username: data.username || 'Anonymous',
      avatar: data.avatar || 'https://example.com/default-avatar.png',
      points: 0,
      ready: false,
      sessionToken: uuidv4()
    };

    const domain = process.env.APP_DOMAIN || 'localhost:3000';
    const joinUrl = `http://${domain}/game?code=${lobbyCode}&name=${encodeURIComponent(player.username)}&avatar=${encodeURIComponent(player.avatar)}`;

    // Create lobby entry
    lobbies[lobbyCode] = {
      code: lobbyCode,
      admin: player,
      players: [player],
      gameInProgress: false,
      createdAt: new Date()
    };

    console.log(`Lobby created with code: ${lobbyCode}`);

    QRCode.toDataURL(joinUrl, (err, url) => {
      if (err) {
        console.error('Error generating QR code:', err);
        ws.send(JSON.stringify({
          type: 'lobby_created',
          lobbyCode,
          joinUrl,
          error: 'QR code generation failed'
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'lobby_created',
          lobbyCode,
          joinUrl,
          qrCode: url
        }));
      }

      broadcastLobbyUpdate(lobbyCode);
    });
  } catch (error) {
    console.error('Error creating lobby:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to create lobby',
      details: error.message
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
    
    let isAdmin = false;
    let userId = '';
    
    if (existingPlayerIndex !== -1) {
      // Update existing player's connection
      lobby.players[existingPlayerIndex].ws = ws;
      lobby.players[existingPlayerIndex].avatar = avatar || lobby.players[existingPlayerIndex].avatar;
      
      // Check if this player is the admin
      isAdmin = lobby.admin.username === username;
      userId = lobby.players[existingPlayerIndex].userId;
    } else {
      // Add new player
      const newPlayer = { 
        ws,
        userId: uuidv4(),
        username: username || 'Anonymous',
        avatar: avatar || 'https://example.com/default-avatar.png',
        points: 0,
        ready: false
      };
      lobby.players.push(newPlayer);
      
      // Check if this player is the admin
      isAdmin = lobby.admin.username === username;
      userId = newPlayer.userId;
    }
    
    console.log(`Player joined lobby ${lobbyCode}: ${username} (isAdmin: ${isAdmin}, userId: ${userId})`);
    
    // Tell the player if they're admin
    ws.send(JSON.stringify({
      type: 'joined_lobby',
      lobbyCode,
      isAdmin,
      userId // Send userId to client
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

function handleJoinGame(ws, data) {
  try {
    const { lobbyCode, username, avatar } = data;
    
    console.log(`Attempting to join game with code: ${lobbyCode}`);
    console.log(`Available lobbies: ${Object.keys(lobbies).join(', ')}`);
    
    // Check if lobby exists
    if (!lobbies[lobbyCode]) {
      console.log(`Lobby ${lobbyCode} not found in available lobbies`);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Lobby not found'
      }));
      return;
    }
    
    const lobby = lobbies[lobbyCode];
    
    // Find existing player by username
    const existingPlayerIndex = lobby.players.findIndex(
      p => p.username === username
    );
    
    let userId = '';
    
    if (existingPlayerIndex !== -1) {
      // Update existing player's connection
      lobby.players[existingPlayerIndex].ws = ws;
      ws.id = lobby.players[existingPlayerIndex].userId; // Preserve the user ID
      userId = lobby.players[existingPlayerIndex].userId;
    } else {
      // Add new player
      userId = uuidv4();
      const newPlayer = { 
        ws,
        userId,
        username: username || 'Anonymous',
        avatar: avatar || 'https://example.com/default-avatar.png',
        points: 0
      };
      lobby.players.push(newPlayer);
      ws.id = userId;
    }
    
    console.log(`Player joined game ${lobbyCode}: ${username} (userId: ${userId})`);
    
    // Send userId to client
    ws.send(JSON.stringify({
      type: 'joined_game',
      userId,
      lobbyCode
    }));
    
    // Send current leaderboard immediately
    broadcastLeaderboardUpdate(lobbyCode);
  } catch (error) {
    console.error('Error joining game:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to join game'
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
      lobbyCode: lobbyCode, // Include the code in the message
      players: lobby.players.map(p => ({
        username: p.username,
        avatar: p.avatar,
        points: p.points
      }))
    });

    // Set timer to end the game after a specified duration
    const gameDuration = 2 * 60 * 1000; // 10 minutes
    const gameTimer = setTimeout(() => {
      endGame(lobbyCode);
    }, gameDuration);
    
    // Store the timer to clear it if needed
    lobby.gameTimer = gameTimer;
  } catch (error) {
    console.error('Error starting game:', error);
  }
}

async function handleUpdatePoints(data) {
  try {
    // Validate input structure
    if (!data?.lobbyCode || !data?.userId || typeof data?.points !== 'number') {
      throw new Error('Invalid score update request format');
    }

    const { lobbyCode, userId, points } = data;
    
    console.log(`Updating points for user ${userId} in lobby ${lobbyCode}: +${points} points`);
    
    // Enhanced rate limiting with time window
    const now = Date.now();
    const userKey = `${lobbyCode}:${userId}`;
    const windowSize = 1000; // 1 second window
    
    const requests = (rateLimiter.get(userKey) || []).filter(
      ts => ts > now - windowSize
    );
    
    if (requests.length >= 10) {
      throw new Error('Rate limit exceeded (10 requests/sec)');
    }
    rateLimiter.set(userKey, [...requests, now]);

    // Validate lobby existence
    const lobby = lobbies[lobbyCode];
    if (!lobby) {
      throw new Error(`Lobby ${lobbyCode} not found`);
    }

    // Get player details
    const player = lobby.players.find(p => p.userId === userId);
    if (!player) {
      console.error(`Player with userId ${userId} not found in lobby ${lobbyCode}`);
      console.log(`Available players: ${lobby.players.map(p => `${p.username} (${p.userId})`).join(', ')}`);
      throw new Error(`Player ${userId} not found in lobby ${lobbyCode}`);
    }

    // Update player's points in memory
    player.points = (player.points || 0) + points;
    console.log(`Updated points for ${player.username}: ${player.points}`);

    // Redis transaction setup
    const scoreKey = `leaderboard:${lobbyCode}`;
    const hourlyKey = `${scoreKey}:hourly:${Math.floor(Date.now()/3600000)}`;
    const dailyKey = `${scoreKey}:daily:${Math.floor(Date.now()/86400000)}`;

    const multi = redis.multi()
      .zincrby(scoreKey, points, userId)
      .zincrby(hourlyKey, points, userId)
      .zincrby(dailyKey, points, userId);

    // Execute transaction
    const results = await multi.exec();
    if (results.some(res => res[0])) {
      throw new Error('Redis transaction failed');
    }

    // Get updated leaderboards
    const [main, hourly, daily] = await Promise.all([
      redis.zrevrange(scoreKey, 0, 9, 'WITHSCORES'),
      redis.zrevrange(hourlyKey, 0, 9, 'WITHSCORES'),
      redis.zrevrange(dailyKey, 0, 9, 'WITHSCORES')
    ]);

    // Process main leaderboard
    const processedPlayers = {};
    for (let i = 0; i < main.length; i += 2) {
      const id = main[i];
      const score = main[i+1];
      const index = i/2;
      
      const playerInfo = lobby.players.find(p => p.userId === id) || {
        username: 'Unknown',
        avatar: 'https://example.com/default-avatar.png'
      };
      
      processedPlayers[id] = {
        ...playerInfo,
        points: parseInt(score),
        rank: index + 1,
        previousRank: leaderboardCache.get(scoreKey)?.[id]?.rank || null
      };
    }

    // Calculate deltas
    const deltas = Object.values(processedPlayers)
      .filter(p => p.previousRank !== null && p.previousRank !== p.rank)
      .map(p => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        currentRank: p.rank,
        previousRank: p.previousRank,
        points: p.points
      }));

    // Update cache and broadcast
    leaderboardCache.set(scoreKey, processedPlayers);
    
    // If Redis has no entries yet, use the in-memory data
    if (Object.keys(processedPlayers).length === 0) {
      broadcastLeaderboardUpdate(lobbyCode);
    } else {
      broadcast(lobbyCode, {
        type: 'leaderboard_update',
        leaderboard: Object.values(processedPlayers),
        deltas,
        hourly: processLeaderboard(hourly, lobby),
        daily: processLeaderboard(daily, lobby)
      });
    }

  } catch (error) {
    console.error('Leaderboard Error:', error);
    broadcast(data.lobbyCode, {
      type: 'error',
      code: 'LB_UPDATE_FAILED',
      message: error.message,
      userId: data.userId,
      timestamp: Date.now()
    });
  }
}

// Helper function
function processLeaderboard(data, lobby) {
  const result = [];
  for (let i = 0; i < data.length; i += 2) {
    const id = data[i];
    const score = data[i+1];
    const index = i/2;
    
    const player = lobby.players.find(p => p.userId === id) || {
      username: 'Unknown',
      avatar: 'https://example.com/default-avatar.png'
    };
    
    result.push({
      ...player,
      points: parseInt(score),
      rank: index + 1
    });
  }
  return result;
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
    const sortedPlayers = [...lobby.players].sort((a, b) => (b.points || 0) - (a.points || 0));
    
    console.log(`Broadcasting leaderboard for ${lobbyCode} with ${sortedPlayers.length} players`);
    
    broadcast(lobbyCode, {
      type: 'leaderboard_update',
      leaderboard: sortedPlayers.map((player, index) => ({
        userId: player.userId,
        username: player.username,
        avatar: player.avatar,
        points: player.points || 0,
        rank: index + 1
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


function endGame(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  // Clear the game timer
  if (lobby.gameTimer) {
    clearTimeout(lobby.gameTimer);
  }

  // Find player with highest score
  const winner = lobby.players.reduce((highest, player) => {
    return player.points > (highest?.points || 0) ? player : highest;
  }, null);

  if (winner) {
    console.log(`Game ended in lobby ${lobbyCode}. Winner: ${winner.username} with ${winner.points} points`);

    // Broadcast winner information
    broadcast(lobbyCode, {
      type: 'game_ended',
      winner: {
        username: winner.username,
        avatar: winner.avatar,
        points: winner.points
      },
      leaderboard: lobby.players.map(player => ({
        username: player.username,
        avatar: player.avatar,
        points: player.points
      }))
    });
  } else {
    console.log(`Game ended in lobby ${lobbyCode}. No players found.`);
  }

  // Optionally clean up lobby
  delete lobbies[lobbyCode];
}





// Start game timer
const gameDuration = 10 * 60 * 1000; // 10 minutes
const gameTimer = setTimeout(() => {
  endGame(lobbyCode);
}, gameDuration);


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
