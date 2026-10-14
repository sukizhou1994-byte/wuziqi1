// 主控制器：协调游戏、AI、在线对战与界面
let game;
let mode = 'pvp'; // 'pvp' | 'ai' | 'online'
let aiColor = 2; // 人机模式下 AI 执子颜色
let myColor = 1; // 在线模式下我方执子颜色
let online = null;
let onlinePromise = null;

const $ = (id) => document.getElementById(id);
const statusEl = () => document.getElementById('status');

window.addEventListener('DOMContentLoaded', () => {
  const canvas = $('board');
  game = new Gomoku(canvas, {
    onMove: handleMove,
    onWin: handleWin,
    onDraw: handleDraw,
  });
  setupUI();
  updateStatus();
});

function setupUI() {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  $('undoBtn').addEventListener('click', undoMove);
  $('restartBtn').addEventListener('click', restart);
  $('firstToggle').addEventListener('click', toggleFirst);
  $('createBtn').addEventListener('click', () => {
    ensureOnline()
      .then(() => online.createRoom())
      .catch(() => setRoomInfo('连接服务器失败'));
  });
  $('joinBtn').addEventListener('click', () => {
    const id = $('roomInput').value.trim().toUpperCase();
    if (!id) {
      setRoomInfo('请输入房间号');
      return;
    }
    ensureOnline()
      .then(() => online.joinRoom(id))
      .catch(() => setRoomInfo('连接服务器失败'));
  });
  $('leaveBtn').addEventListener('click', leaveOnline);
}

function setRoomInfo(text) {
  $('roomInfo').textContent = text;
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.mode === m)
  );
  game.reset();
  game.locked = false;

  $('aiPanel').style.display = m === 'ai' ? 'flex' : 'none';
  $('onlinePanel').style.display = m === 'online' ? 'flex' : 'none';

  if (m === 'ai') {
    aiColor = 2;
    myColor = 1;
    $('firstToggle').textContent = '你执黑(先手)';
    if (aiColor === 1) aiTurn();
    updateStatus();
  } else if (m === 'online') {
    ensureOnline().catch(() => setRoomInfo('无法连接服务器'));
  } else {
    if (online) online.leave();
    updateStatus();
  }
}

function ensureOnline() {
  if (online && online.connected) return Promise.resolve();
  if (!online) online = buildOnline();
  if (!onlinePromise) {
    onlinePromise = online
      .connect()
      .catch((e) => {
        onlinePromise = null;
        throw e;
      });
  }
  return onlinePromise;
}

function buildOnline() {
  return new OnlineClient({
    onCreated: (msg) => {
      setRoomInfo(`房间号: ${msg.roomId}（等待对手加入…）`);
      myColor = msg.color;
      game.locked = msg.color !== 1; // 黑方先手
      updateStatus();
    },
    onJoined: (msg) => {
      setRoomInfo(`已加入房间 ${msg.roomId}，等待开始…`);
    },
    onStart: (msg) => {
      myColor = msg.color;
      game.reset();
      game.locked = msg.color !== 1;
      setRoomInfo(`对战开始！你执${msg.color === 1 ? '黑' : '白'}（${msg.roomId}）`);
      updateStatus();
    },
    onMove: (msg) => {
      game.locked = false;
      game.place(msg.x, msg.y, msg.color);
      updateStatus();
    },
    onRestart: () => {
      game.reset();
      game.locked = myColor !== 1;
      updateStatus();
    },
    onOpponentLeft: () => {
      setRoomInfo('对手已离开，等待新对手加入…');
      game.locked = true;
      updateStatus();
    },
    onError: (msg) => setRoomInfo('错误: ' + msg.message),
    onClose: () => setRoomInfo('连接已断开'),
  });
}

function handleMove(x, y, color) {
  if (mode === 'ai') {
    if (color === myColor && !game.gameOver) {
      game.locked = true;
      setTimeout(aiTurn, 350);
    }
  } else if (mode === 'online') {
    if (color === myColor && !game.gameOver) {
      game.locked = true;
      online.sendMove(x, y, color);
      updateStatus();
    }
  }
}

function aiTurn() {
  if (game.gameOver) return;
  const move = AI.nextMove(game.board, aiColor, game.size);
  if (move) game.place(move.x, move.y, aiColor);
  game.locked = false;
}

function handleWin(color) {
  const name = color === 1 ? '黑棋' : '白棋';
  let msg;
  if (mode === 'ai') msg = color === myColor ? '你赢了！🎉' : 'AI 获胜，再接再厉！';
  else if (mode === 'online') msg = color === myColor ? '你赢了！🎉' : '对手获胜';
  else msg = `${name}获胜！`;
  statusEl().textContent = msg;
}

function handleDraw() {
  statusEl().textContent = '平局！';
}

function undoMove() {
  if (mode === 'online') return; // 在线模式不支持本地悔棋

  if (game.gameOver && game.winningLine) {
    game.gameOver = false;
    game.winningLine = null;
  }
  if (game.history.length === 0) return;

  if (mode === 'ai') {
    const last = game.history[game.history.length - 1];
    game.undo(); // 撤销 AI 的一步
    if (last.color === aiColor && game.history.length > 0) game.undo(); // 再撤销玩家的一步
    game.locked = false;
  } else {
    game.undo();
  }
  updateStatus();
}

function restart() {
  if (mode === 'online') {
    online && online.sendRestart();
    return;
  }
  game.reset();
  game.locked = false;
  if (mode === 'ai' && aiColor === 1) aiTurn();
  updateStatus();
}

function toggleFirst() {
  if (mode !== 'ai') return;
  aiColor = aiColor === 1 ? 2 : 1;
  myColor = myColor === 1 ? 2 : 1;
  $('firstToggle').textContent = myColor === 1 ? '你执黑(先手)' : '你执白(后手)';
  game.reset();
  game.locked = false;
  if (aiColor === 1) aiTurn();
  updateStatus();
}

function leaveOnline() {
  if (online) online.leave();
  setMode('pvp');
}

function updateStatus() {
  if (game.gameOver) return; // 结束状态由 handleWin/handleDraw 设置
  if (mode === 'online') {
    const turn = game.current === myColor ? '轮到你落子' : '等待对手…';
    statusEl().textContent = `${turn}（你执${myColor === 1 ? '黑' : '白'}）`;
    return;
  }
  if (mode === 'ai') {
    statusEl().textContent = game.current === myColor ? '轮到你落子' : 'AI 思考中…';
  } else {
    statusEl().textContent = game.current === 1 ? '黑棋落子' : '白棋落子';
  }
}
