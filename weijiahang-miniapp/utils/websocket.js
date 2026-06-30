/**
 * 为家航 WebSocket 管理器
 *
 * 用途：实时消息 / 订单通知 / 领航员位置更新
 *
 * 使用方式：
 *   const ws = require('../../utils/websocket');
 *   ws.connect();                     // 建立连接
 *   ws.on('message', callback);       // 监听新消息
 *   ws.on('order_update', callback);  // 监听订单更新
 *   ws.sendChat(conversationId, text); // 发送聊天消息
 *   ws.disconnect();                  // 断开连接
 */

const app = getApp();

// 事件总线
const listeners = {};

function emit(event, data) {
  const cbs = listeners[event] || [];
  cbs.forEach(function (cb) { try { cb(data); } catch (e) { console.error('WS回调异常:', e); } });
}

let socketTask = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

/** 建立 WebSocket 连接 */
function connect() {
  const token = wx.getStorageSync('token');
  if (!token) {
    console.warn('[WS] 未登录，跳过连接');
    return;
  }

  if (socketTask) {
    // 已有连接，检查状态
    return;
  }

  const wsUrl = (app.globalData.wsBase || app.globalData.apiBase.replace('http', 'ws')) + '/ws?token=' + encodeURIComponent(token);

  console.log('[WS] 正在连接...');
  socketTask = wx.connectSocket({
    url: wsUrl,
    success: function () {
      console.log('[WS] 连接中...');
    },
    fail: function (err) {
      console.error('[WS] 连接失败:', err);
      socketTask = null;
      scheduleReconnect();
    },
  });

  socketTask.onOpen(function () {
    console.log('[WS] 已连接');
    reconnectAttempts = 0;
    emit('connected');
  });

  socketTask.onMessage(function (res) {
    try {
      const msg = JSON.parse(res.data);
      handleMessage(msg);
    } catch (e) {
      console.error('[WS] 消息解析失败:', e);
    }
  });

  socketTask.onClose(function (res) {
    console.log('[WS] 已断开, code:', res.code);
    socketTask = null;
    emit('disconnected');
    // 非正常关闭则重连
    if (res.code !== 1000) {
      scheduleReconnect();
    }
  });

  socketTask.onError(function (err) {
    console.error('[WS] 错误:', err);
    socketTask = null;
    scheduleReconnect();
  });
}

/** 处理收到的消息 */
function handleMessage(msg) {
  switch (msg.type) {
    case 'chat_message':
      emit('message', msg.data);
      break;
    case 'order_update':
      emit('order_update', msg.data);
      break;
    case 'notification':
      emit('notification', msg.data);
      break;
    case 'typing':
      emit('typing', msg.data);
      break;
    case 'pong':
      break;
    default:
      console.log('[WS] 未知消息类型:', msg.type);
  }
}

/** 发送聊天消息 */
function sendChat(conversationId, data) {
  send({
    type: 'chat_message',
    conversationId: conversationId,
    data: data,
  });
}

/** 发送通用消息 */
function send(data) {
  if (!socketTask) {
    console.warn('[WS] 未连接');
    return false;
  }
  socketTask.send({
    data: JSON.stringify(data),
    fail: function (err) {
      console.error('[WS] 发送失败:', err);
    },
  });
  return true;
}

/** 心跳保活 */
function startHeartbeat() {
  setInterval(function () {
    if (socketTask) {
      socketTask.send({ data: JSON.stringify({ type: 'ping' }) });
    }
  }, 30000);
}

/** 重连调度 */
function scheduleReconnect() {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.warn('[WS] 重连次数达到上限，停止重连');
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;
  console.log('[WS] ' + delay / 1000 + '秒后第' + reconnectAttempts + '次重连...');
  reconnectTimer = setTimeout(function () {
    reconnectTimer = null;
    connect();
  }, delay);
}

/** 断开连接 */
function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = MAX_RECONNECT; // 禁止自动重连
  if (socketTask) {
    socketTask.close({ code: 1000 });
    socketTask = null;
  }
}

/** 注册监听 */
function on(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
}

/** 移除监听 */
function off(event, callback) {
  if (!listeners[event]) return;
  if (callback) {
    listeners[event] = listeners[event].filter(function (cb) { return cb !== callback; });
  } else {
    listeners[event] = [];
  }
}

module.exports = {
  connect: connect,
  disconnect: disconnect,
  send: send,
  sendChat: sendChat,
  on: on,
  off: off,
  isConnected: function () { return !!socketTask; },
};
