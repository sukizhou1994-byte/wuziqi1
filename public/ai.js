// 人机对战 AI：基于启发式评分（进攻 + 防守）
const AI = {
  // 返回最佳落子点 {x, y}
  nextMove(board, aiColor, size = 15) {
    const opp = aiColor === 1 ? 2 : 1;
    const empties = [];
    let hasStone = false;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0) hasStone = true;
        else empties.push({ x, y });
      }
    }
    if (empties.length === 0) return null;
    if (!hasStone) return { x: 7, y: 7 }; // 先手落天元

    let best = null;
    let bestScore = -1;
    const candidates = [];

    for (const e of empties) {
      const attack = this.evalPoint(board, e.x, e.y, aiColor, size);
      const defend = this.evalPoint(board, e.x, e.y, opp, size);
      const score = attack * 1.1 + defend;
      if (score > bestScore) {
        bestScore = score;
        candidates.length = 0;
        candidates.push(e);
      } else if (score === bestScore) {
        candidates.push(e);
      }
    }
    // 同分时随机选一个，增加变化
    return candidates[Math.floor(Math.random() * candidates.length)];
  },

  evalPoint(board, x, y, color, size) {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    let total = 0;
    for (const [dx, dy] of dirs) {
      total += this.lineScore(board, x, y, dx, dy, color, size);
    }
    return total;
  },

  // 评估在 (x,y) 落 color 后，沿该方向形成的连珠强度
  lineScore(board, x, y, dx, dy, color, size) {
    let count = 1; // 含当前落子点
    let openEnds = 0;

    let i = 1;
    while (i <= 4) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) break;
      if (board[ny][nx] === color) count++;
      else if (board[ny][nx] === 0) {
        openEnds++;
        break;
      } else break;
      i++;
    }

    i = 1;
    while (i <= 4) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) break;
      if (board[ny][nx] === color) count++;
      else if (board[ny][nx] === 0) {
        openEnds++;
        break;
      } else break;
      i++;
    }

    if (count >= 5) return 100000;
    if (openEnds === 0) return 0; // 两端被堵，无法成五

    switch (count) {
      case 4:
        return openEnds === 2 ? 100000 : 8000; // 活四 / 冲四
      case 3:
        return openEnds === 2 ? 5000 : 500; // 活三 / 眠三
      case 2:
        return openEnds === 2 ? 200 : 50; // 活二 / 眠二
      case 1:
        return openEnds === 2 ? 10 : 5;
      default:
        return 0;
    }
  },
};
