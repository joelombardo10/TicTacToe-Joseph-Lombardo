// Joseph Lombardo - Project 4

const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, maxPayload: 4096 });
app.use(express.static(path.join(__dirname, 'public')));
const GAME_PASSWORD = 'secret123';
const players = { X: null, O: null };
let gameState = freshGame();

function freshGame() {
  return { board: Array(9).fill(''), currentPlayer: 'X', winner: null, draw: false };
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcastState() {
  const message = { type: 'state', gameState,
    players: { X: players.X?.playerName || null, O: players.O?.playerName || null },
    spectators: [...wss.clients].filter(client => client.authenticated && client.role === 'spectator').length };
  wss.clients.forEach(client => send(client, message));
}

function checkWinner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

wss.on('connection', ws => {
  ws.playerName = '';
  ws.role = 'spectator';
  ws.authenticated = false;
  broadcastState();
  ws.on('message', message => {
    let data;
    try { data = JSON.parse(message.toString()); }
    catch { return send(ws, { type: 'error', message: 'Invalid message.' }); }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'login') {
      if (ws.authenticated) return;
      if (data.password !== GAME_PASSWORD) return send(ws, { type: 'error', message: 'Invalid password.' });
      if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 30) {
        return send(ws, { type: 'error', message: 'Enter a name with 1 to 30 characters.' });
      }
      ws.playerName = data.name.trim();
      ws.authenticated = true;
      if (!players.X) { players.X = ws; ws.role = 'X'; }
      else if (!players.O) { players.O = ws; ws.role = 'O'; }
      send(ws, { type: 'role', role: ws.role, name: ws.playerName });
      broadcastState();
      return;
    }
    if (!ws.authenticated) return;
    if (data.type === 'place') {
      const index = data.index;
      if (players[ws.role] !== ws || !players.X || !players.O) return;
      if (ws.role !== gameState.currentPlayer || gameState.winner || gameState.draw) return;
      if (!Number.isInteger(index) || index < 0 || index > 8 || gameState.board[index] !== '') return;
      gameState.board[index] = ws.role;
      gameState.winner = checkWinner(gameState.board);
      gameState.draw = !gameState.winner && gameState.board.every(Boolean);
      if (!gameState.winner && !gameState.draw) gameState.currentPlayer = ws.role === 'X' ? 'O' : 'X';
      broadcastState();
    }
    if (data.type === 'reset' && players[ws.role] === ws) {
      gameState = freshGame();
      broadcastState();
    }
  });
  ws.on('close', () => {
    if (players.X === ws || players.O === ws) {
      players[ws.role] = null;
      gameState = freshGame();
    }
    broadcastState();
  });
  ws.on('error', error => console.error('Connection error:', error.message));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
