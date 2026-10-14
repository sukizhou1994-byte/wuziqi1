// 五子棋核心逻辑：棋盘状态、绘制、落子、胜负判定
class Gomoku {
  constructor(canvas, opts = {}) {
    this.size = 15;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.padding = 24;
    this.cellSize = 34;

    this.board = Array.from({ length: this.size }, () => new Array(this.size).fill(0));
    this.current = 1; // 1 黑, 2 白
    this.gameOver = false;
    this.lastMove = null;
    this.winningLine = null;
    this.history = [];
    this.locked = false; // 禁止点击落子（等待 AI / 对手）

    this.onMove = opts.onMove || (() => {});
    this.onWin = opts.onWin || (() => {});
    this.onDraw = opts.onDraw || (() => {});

    this._bindEvents();
    this.resize();
  }

  resize() {
    this.canvas.width = this.padding * 2 + this.cellSize * (this.size - 1);
    this.canvas.height = this.canvas.width;
    this.draw();
  }

  _bindEvents() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  handleClick(e) {
    if (this.gameOver || this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const x = Math.round((px - this.padding) / this.cellSize);
    const y = Math.round((py - this.padding) / this.cellSize);
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    this.place(x, y, this.current);
  }

  place(x, y, color) {
    if (this.gameOver) return false;
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return false;
    if (this.board[y][x] !== 0) return false;

    this.board[y][x] = color;
    this.history.push({ x, y, color });
    this.lastMove = { x, y, color };

    const win = this.checkWin(x, y, color);
    if (win) {
      this.gameOver = true;
      this.winningLine = win.line;
      this.draw();
      this.onWin(color, win.line);
      return true;
    }
    if (this.history.length === this.size * this.size) {
      this.gameOver = true;
      this.draw();
      this.onDraw();
      return true;
    }

    this.current = color === 1 ? 2 : 1;
    this.draw();
    this.onMove(x, y, color);
    return true;
  }

  checkWin(x, y, color) {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (const [dx, dy] of dirs) {
      const line = [{ x, y }];
      let count = 1;
      let i = 1;
      while (true) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size || this.board[ny][nx] !== color) break;
        count++;
        line.push({ x: nx, y: ny });
        i++;
      }
      i = 1;
      while (true) {
        const nx = x - dx * i;
        const ny = y - dy * i;
        if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size || this.board[ny][nx] !== color) break;
        count++;
        line.push({ x: nx, y: ny });
        i++;
      }
      if (count >= 5) return { line };
    }
    return null;
  }

  // 悔棋：撤销最后一步（返回被撤销方颜色）
  undo() {
    if (this.history.length === 0) return null;
    const last = this.history.pop();
    this.board[last.y][last.x] = 0;
    this.lastMove = this.history.length ? this.history[this.history.length - 1] : null;
    this.gameOver = false;
    this.winningLine = null;
    this.current = last.color;
    this.draw();
    return last.color;
  }

  reset() {
    this.board = Array.from({ length: this.size }, () => new Array(this.size).fill(0));
    this.current = 1;
    this.gameOver = false;
    this.lastMove = null;
    this.winningLine = null;
    this.history = [];
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;

    ctx.fillStyle = '#e8b974';
    ctx.fillRect(0, 0, w, w);

    ctx.strokeStyle = '#5a3d1e';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.size; i++) {
      const p = this.padding + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.padding, p);
      ctx.lineTo(this.padding + (this.size - 1) * this.cellSize, p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p, this.padding);
      ctx.lineTo(p, this.padding + (this.size - 1) * this.cellSize);
      ctx.stroke();
    }

    const stars = [3, 7, 11];
    ctx.fillStyle = '#5a3d1e';
    for (const sx of stars) {
      for (const sy of stars) {
        ctx.beginPath();
        ctx.arc(this.padding + sx * this.cellSize, this.padding + sy * this.cellSize, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.board[y][x] !== 0) this.drawStone(x, y, this.board[y][x]);
      }
    }

    if (this.lastMove) {
      const { x, y, color } = this.lastMove;
      ctx.strokeStyle = color === 1 ? '#fff' : '#e63946';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.padding + x * this.cellSize, this.padding + y * this.cellSize, this.cellSize * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.winningLine) {
      const a = this.winningLine[0];
      const b = this.winningLine[this.winningLine.length - 1];
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.padding + a.x * this.cellSize, this.padding + a.y * this.cellSize);
      ctx.lineTo(this.padding + b.x * this.cellSize, this.padding + b.y * this.cellSize);
      ctx.stroke();
    }
  }

  drawStone(x, y, color) {
    const ctx = this.ctx;
    const cx = this.padding + x * this.cellSize;
    const cy = this.padding + y * this.cellSize;
    const r = this.cellSize * 0.42;
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    if (color === 1) {
      grad.addColorStop(0, '#666');
      grad.addColorStop(1, '#000');
    } else {
      grad.addColorStop(0, '#fff');
      grad.addColorStop(1, '#cfcfcf');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
