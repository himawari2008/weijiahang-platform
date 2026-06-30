/**
 * 为家航商家端 WebSocket 客户端
 * 用于接收实时订单通知、客服消息等
 */

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

class MerchantSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnect = 10;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.connected = false;
  }

  /**
   * 建立连接
   * @param {object} params - { shopId, token }
   */
  connect(params = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const query = new URLSearchParams({
      type: 'shop',
      id: params.shopId || '',
      token: params.token || '',
    }).toString();

    const url = `${SOCKET_URL}/orders?${query}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this._startHeartbeat();
        this._emit('connect');
        console.log('[WS] 已连接');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const eventName = msg.event || msg.type;
          const data = msg.data || msg;
          this._emit(eventName, data);
          this._emit('message', msg);
        } catch (e) {
          console.error('[WS] 消息解析失败', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._stopHeartbeat();
        this._emit('disconnect');
        this._reconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] 错误', err);
        this._emit('error', err);
      };
    } catch (e) {
      console.error('[WS] 连接失败', e);
      this._reconnect();
    }
  }

  /** 指数退避重连 */
  _reconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) {
      console.log('[WS] 重连次数已达上限');
      this._emit('reconnect_failed');
      return;
    }
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;
    this._emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /** 心跳 */
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'shop:heartbeat', data: { timestamp: Date.now() } }));
      }
    }, 25000);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** 注册事件 */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return this;
  }

  /** 移除事件 */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const cbs = this.listeners.get(event).filter(cb => cb !== callback);
      this.listeners.set(event, cbs);
    }
    return this;
  }

  /** 触发事件 */
  _emit(event, data) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.forEach(cb => { try { cb(data); } catch (e) { console.error('[WS] 事件处理错误', e); } });
    }
  }

  /** 发送消息 */
  emit(event, data) {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  /** 断开 */
  disconnect() {
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.reconnectAttempts = this.maxReconnect; // 防止自动重连
  }
}

// 单例
let instance = null;

export function getSocket() {
  if (!instance) {
    instance = new MerchantSocket();
  }
  return instance;
}

export default getSocket;
