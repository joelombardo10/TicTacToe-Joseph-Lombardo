// Joseph Lombardo - Project 4
const boardCanvas = document.getElementById('gameCanvas');
const ctx = boardCanvas.getContext('2d');
const statusElement = document.getElementById('status');
const roleElement = document.getElementById('role');
const playersElement = document.getElementById('players');
const resetBtn = document.getElementById('resetBtn');
const joinBtn = document.getElementById('joinBtn');
const nameInput = document.getElementById('nameInput');
const passwordInput = document.getElementById('passwordInput');
const loginForm = document.getElementById('login');
const errorElement = document.getElementById('error');
const connectionElement = document.getElementById('connection');
const CELL_SIZE = 200;
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${location.host}`);
let gameState = null;
let role = 'spectator';
let players = { X: null, O: null };

function drawGrid() {
    ctx.beginPath();
    ctx.strokeStyle = "#17263e";
    ctx.lineWidth = 4;
    ctx.moveTo(200, 0);
    ctx.lineTo(200, 600);
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 600);
    ctx.moveTo(0, 200);
    ctx.lineTo(600, 200);
    ctx.moveTo(0, 400);
    ctx.lineTo(600, 400);
    ctx.stroke();
}

function drawX(x, y) {
    ctx.beginPath();
    ctx.strokeStyle = "#1566c0";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.moveTo(x + 35, y + 35);
    ctx.lineTo(x + 165, y + 165);
    ctx.moveTo(x + 165, y + 35);
    ctx.lineTo(x + 35, y + 165);
    ctx.stroke();
}

function drawO(x, y) {
    ctx.beginPath();
    ctx.strokeStyle = "#df7038";
    ctx.lineWidth = 10;
    ctx.arc(x + 100, y + 100, 65, 0, Math.PI * 2);
    ctx.stroke();
}

function drawBoard() {
  ctx.clearRect(0, 0, 600, 600);
  drawGrid();
  if (!gameState) return;
  gameState.board.forEach((value, index) => {
    const x = (index % 3) * CELL_SIZE;
    const y = Math.floor(index / 3) * CELL_SIZE;
    if (value === 'X') drawX(x, y);
    else if (value === 'O') drawO(x, y);
  });
  if (gameState.winner) statusElement.textContent = `Winner: ${gameState.winner}`;
  else if (gameState.draw) statusElement.textContent = "It's a draw!";
  else if (!players.X || !players.O) statusElement.textContent = 'Waiting for two players...';
  else statusElement.textContent = `Turn: ${gameState.currentPlayer}`;
}

function send(data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function getClickedIndex(event) {
    const rect = boardCanvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left - boardCanvas.clientLeft) * boardCanvas.width / boardCanvas.clientWidth;
    const mouseY = (event.clientY - rect.top - boardCanvas.clientTop) * boardCanvas.height / boardCanvas.clientHeight;

    if (mouseX < 0 || mouseY < 0 || mouseX >= boardCanvas.width || mouseY >= boardCanvas.height) {
        return -1;
    }

    const col = Math.floor(mouseX / CELL_SIZE);
    const row = Math.floor(mouseY / CELL_SIZE);
    return row * 3 + col;
}



boardCanvas.addEventListener('click', event => {
  if (!gameState || (role !== 'X' && role !== 'O')) return;
  const index = getClickedIndex(event);
  if (index >= 0) send({ type: 'place', index });
});

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  errorElement.textContent = '';
  send({ type: 'login', name: nameInput.value.trim(), password: passwordInput.value });
});
resetBtn.addEventListener('click', () => send({ type: 'reset' }));
ws.onopen = () => { connectionElement.textContent = 'Connected'; joinBtn.disabled = false; };
ws.onmessage = event => {
  const data = JSON.parse(event.data);
  if (data.type === 'state') {
    gameState = data.gameState;
    players = data.players;
    playersElement.textContent = `X: ${players.X || 'Open'} | O: ${players.O || 'Open'} | Spectators: ${data.spectators}`;
    drawBoard();
  } else if (data.type === 'role') {
    role = data.role;
    roleElement.textContent = `Logged in as ${data.name} (${role})`;
    loginForm.hidden = true;
    passwordInput.value = '';
    resetBtn.disabled = role === 'spectator';
    errorElement.textContent = '';
  } else if (data.type === 'error') errorElement.textContent = data.message;
};
ws.onclose = () => {
  connectionElement.textContent = 'Disconnected. Refresh this page to reconnect.';
  statusElement.textContent = 'Server connection closed.';
  joinBtn.disabled = true;
  resetBtn.disabled = true;
};
ws.onerror = () => { errorElement.textContent = 'Unable to connect to the game server.'; };
drawBoard();
