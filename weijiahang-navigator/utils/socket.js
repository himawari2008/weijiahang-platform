/**
 * 为家航 WebSocket 客户端
 * 封装 wx.connectSocket，提供类 Socket.IO 的 API
 * 支持心跳保活、指数退避重连、事件系统
 */
class SocketClient {
  /**
   * @param {string} url - WebSocket 服务器地址
   * @param {object} options - 可选配置 { maxReconnect, heartbeatInterval }
   */
  constructor(url, options) {
    options = options || {};
    this.url = url;
    this.options = options;
    this.socketTask = null;
    this.listeners = {};
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnect || 10;
    this.heartbeatInterval = options.heartbeatInterval || 25000;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.urlWithQuery = url;
  }

  /**
   * 建立连接
   * @param {object} query - URL 查询参数 { type, id, marketId }
   */
  connect(query) {
    query = query || {};
    var qs = '';
    var keys = Object.keys(query);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (i > 0) qs += '&';
      qs += k + '=' + encodeURIComponent(query[k] || '');
    }
    this.urlWithQuery = qs ? this.url + '?' + qs : this.url;
    this._doConnect();
  }

  _doConnect() {
    var that = this;

    this.socketTask = wx.connectSocket({
      url: that.urlWithQuery,
      success: function () {
        // 静默，连接成功与否由 onOpen/onError 处理
      },
      fail: function (err) {
        // 模拟器/开发环境 WebSocket 不可用是正常情况
        console.log('[WS] 连接暂不可用（HTTP 降级运行）');
      }
    });

    this.socketTask.onOpen(function () {
      that.connected = true;
      that.reconnectAttempts = 0;
      console.log('[WS] 已连接');
      that._startHeartbeat();
      that._emit('connect');
    });

    this.socketTask.onMessage(function (res) {
      try {
        var msg = JSON.parse(res.data);
        var event = msg.event || msg.type;
        var data = msg.data || msg;
        that._emit(event, data);
        that._emit('message', msg);
      } catch (e) {
        // 忽略非 JSON 消息
      }
    });

    this.socketTask.onClose(function () {
      that.connected = false;
      that._stopHeartbeat();
      that._emit('disconnect');
      // 仅真机环境尝试重连，模拟器不重连
      try {
        var sys = wx.getSystemInfoSync();
        if (sys.platform === 'devtools') return;
      } catch (e) {}
      that._reconnect();
    });

    this.socketTask.onError(function (err) {
      // 模拟器中 WebSocket 不可用是预期的，不刷错误日志
      try {
        var sys = wx.getSystemInfoSync();
        if (sys.platform === 'devtools') {
          that._emit('ws_unavailable');
          return;
        }
      } catch (e) {}
      console.log('[WS] 连接失败，HTTP 降级');
      that._emit('ws_unavailable', err);
    });
  }

  /**
   * 指数退避重连
   */
  _reconnect() {
    var that = this;
    if (that.reconnectAttempts >= that.maxReconnectAttempts) {
      console.log('[WS] 重连次数已达上限');
      that._emit('reconnect_failed');
      return;
    }
    var delay = Math.min(30000, 1000 * Math.pow(2, that.reconnectAttempts));
    that.reconnectAttempts++;
    console.log('[WS] ' + Math.round(delay / 1000) + '秒后第' + that.reconnectAttempts + '次重连');
    that._emit('reconnecting', { attempt: that.reconnectAttempts, delay: delay });
    that.reconnectTimer = setTimeout(function () {
      that._doConnect();
    }, delay);
  }

  /**
   * 启动心跳
   */
  _startHeartbeat() {
    var that = this;
    that.heartbeatTimer = setInterval(function () {
      if (that.connected && that.socketTask) {
        that.socketTask.send({
          data: JSON.stringify({
            event: 'navigator:heartbeat',
            data: { timestamp: Date.now() }
          })
        });
      }
    }, that.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 注册事件监听
   * @param {string} event - 事件名
   * @param {function} callback - 回调
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(function (cb) {
        return cb !== callback;
      });
    }
    return this;
  }

  /**
   * 内部触发事件
   */
  _emit(event, data) {
    var cbs = this.listeners[event];
    if (cbs) {
      for (var i = 0; i < cbs.length; i++) {
        try {
          cbs[i](data);
        } catch (e) {
          console.error('[WS] 事件处理错误', e);
        }
      }
    }
  }

  /**
   * 发送消息
   * @param {string} event - 事件名
   * @param {*} data - 数据
   */
  emit(event, data) {
    if (this.connected && this.socketTask) {
      this.socketTask.send({
        data: JSON.stringify({ event: event, data: data })
      });
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socketTask) {
      this.socketTask.close();
    }
    this.connected = false;
  }
}

/**
 * 获取 WebSocket 单例
 * 使用集中配置模块获取 WS 地址
 */
var config = require('./config');
var instance = null;

function getSocket() {
  if (!instance) {
    instance = new SocketClient(config.WS_BASE + '/orders');
  }
  return instance;
}

module.exports = { SocketClient: SocketClient, getSocket: getSocket };
