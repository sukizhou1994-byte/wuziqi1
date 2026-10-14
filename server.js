const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 房间管理: roomId -> { players: [ws, ws] }
const rooms = new Map();

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function genRoomId() {
  let id;
  do {
    id = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(id));
  return id;
}

function getOpponent(ws) {
  const room = rooms.get(ws.roomId);
  if (!room) return null;
  return room.players.find((p) => p !== ws) || null;
}

function cleanup(ws) {
  const roomId = ws.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  room.players = room.players.filter((p) => p !== ws);
  if (room.players.length === 0) rooms.delete(roomId);
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.roomId = null;
  ws.color = null;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      return;
    }
    switch (msg.type) {
      case 'create': {
        const roomId = genRoomId();
        rooms.set(roomId, { players: [] });
        ws.roomId = roomId;
        ws.color = 1;
        rooms.get(roomId).players.push(ws);
        send(ws, { type: 'created', roomId, color: 1 });
        break;
      }
      case 'join': {
        const room = rooms.get(msg.roomId);
        if (!room) {
          send(ws, { type: 'error', message: '房间不存在' });
          break;
        }
        if (room.players.length >= 2) {
          send(ws, { type: 'error', message: '房间已满' });
          break;
        }
        ws.roomId = msg.roomId;
        ws.color = 2;
        room.players.push(ws);
        room.players.forEach((p) =>
          send(p, { type: 'start', color: p.color, roomId: msg.roomId })
        );
        break;
      }
      case 'move': {
        const opp = getOpponent(ws);
        if (opp) send(opp, { type: 'move', x: msg.x, y: msg.y, color: ws.color });
        break;
      }
      case 'restart': {
        const room = rooms.get(ws.roomId);
        if (room) room.players.forEach((p) => { if (p !== ws) send(p, { type: 'restart' }); });
        break;
      }
      case 'leave': {
        const opp = getOpponent(ws);
        if (opp) send(opp, { type: 'opponentLeft' });
        cleanup(ws);
        ws.roomId = null;
        break;
      }
    }
  });

  ws.on('close', () => {
    const opp = getOpponent(ws);
    if (opp) send(opp, { type: 'opponentLeft' });
    cleanup(ws);
  });
});

// 心跳检测，清理断开的连接
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`五子棋服务器已启动: http://localhost:${PORT}`);
});
