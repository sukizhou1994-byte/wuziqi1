// 在线对战客户端：通过 WebSocket 与服务器房间同步
class OnlineClient {
  constructor(handlers) {
    this.handlers = handlers; // { onCreated, onJoined, onStart, onMove, onRestart, onOpponentLeft, onError, onClose }
    this.ws = null;
    this.roomId = null;
    this.color = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      this.ws = new WebSocket(`${proto}://${location.host}`);
      this.ws.onopen = () => {
        this.connected = true;
        resolve();
      };
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (ev) => this.handleMessage(ev);
      this.ws.onclose = () => {
        this.connected = false;
        if (this.handlers.onClose) this.handlers.onClose();
      };
    });
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  createRoom() {
    this.send({ type: 'create' });
  }

  joinRoom(roomId) {
    this.send({ type: 'join', roomId });
  }

  sendMove(x, y, color) {
    this.send({ type: 'move', x, y, color });
  }

  sendRestart() {
    this.send({ type: 'restart' });
  }

  leave() {
    this.send({ type: 'leave' });
  }

  handleMessage(ev) {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch (e) {
      return;
    }
    switch (msg.type) {
      case 'created':
        this.roomId = msg.roomId;
        this.color = msg.color;
        if (this.handlers.onCreated) this.handlers.onCreated(msg);
        break;
      case 'joined':
        this.roomId = msg.roomId;
        this.color = msg.color;
        if (this.handlers.onJoined) this.handlers.onJoined(msg);
        break;
      case 'start':
        this.color = msg.color;
        this.roomId = msg.roomId;
        if (this.handlers.onStart) this.handlers.onStart(msg);
        break;
      case 'move':
        if (this.handlers.onMove) this.handlers.onMove(msg);
        break;
      case 'restart':
        if (this.handlers.onRestart) this.handlers.onRestart();
        break;
      case 'opponentLeft':
        if (this.handlers.onOpponentLeft) this.handlers.onOpponentLeft();
        break;
      case 'error':
        if (this.handlers.onError) this.handlers.onError(msg);
        break;
    }
  }
}
