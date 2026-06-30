var app = getApp();
var api = require('../../utils/api');

/**
 * 获取市场简称
 */
function getMarketShortName(name) {
  if (!name) return '选择市场';
  return name
    .replace('建材市场', '')
    .replace('工业品市场', '')
    .replace('建材批发市场', '')
    .replace('汽配城', '')
    .replace('家居城北店', '')
    .trim() || name.substr(0, 4);
}

Page({
  data: {
    greeting: '',
    navInfo: null,
    isOnline: false,
    currentMarket: null,
    marketShortName: '选择市场',
    todayStats: { earn: 0, orders: 0, rating: 5.0, totalOrders: 0 },
    ratingText: '5.0',
    filter: 'all',
    orders: [],
    filteredOrders: [],
    filterCounts: {},
    loading: true,
    refreshing: false,
    apiError: false,
    nearbyCount: 0,
    rank: '-',

    // ====== WebSocket 实时相关 ======
    connectionStatus: 'disconnected',
    connectionStatusText: '未连接',
    connectionDotClass: 'dot-disconnected',
    pendingOrders: [],
    activeCountdowns: {},

    // 市场列表（API优先加载）
    markets: [],

    // 筛选选项
    filterOptions: [
      { key: 'all', label: '全部' },
      { key: 'navigation', label: '导航' },
      { key: 'accompany', label: '陪逛' },
      { key: 'inspection', label: '验货' }
    ],

    // 内部定时器句柄
    _countdownTimers: {},
    _wsEventsBound: false,
  },

  /* ========== 生命周期 ========== */

  onLoad: function () {
    this.setGreeting();
    this.loadNavInfo();
    this.loadOrders();
    this._loadMarkets();
    this._initWebSocket();
    this._initAudio();
  },

  onShow: function () {
    this.loadOrders(true);
    this._updateConnectionStatus();
  },

  onUnload: function () {
    this._clearAllCountdowns();
    this._unbindWSEvents();
  },

  /* ========== 问候语 ========== */

  setGreeting: function () {
    var h = new Date().getHours();
    var text = h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好';
    this.setData({ greeting: text });
  },

  /* ========== 领航员资料 ========== */

  loadNavInfo: function () {
    var that = this;

    try {
      var stored = wx.getStorageSync('nav_info');
      if (stored) {
        that.setData({
          navInfo: stored,
          isOnline: stored.isOnline,
          todayStats: stored.todayStats || {
            earn: 0, orders: 0, rating: stored.rating || 5.0, totalOrders: stored.totalOrders || 0
          }
        });
      }
    } catch (e) {}

    api.getProfile().then(function (info) {
      var stats = {
        earn: info.todayEarn || 0,
        orders: info.todayOrders || 0,
        rating: info.rating || 5.0,
        totalOrders: info.totalOrders || 0
      };
      info.todayStats = stats;
      that.setData({
        navInfo: info,
        isOnline: info.isOnline,
        todayStats: stats
      });
      wx.setStorageSync('nav_info', info);
    }).catch(function () {
      if (!that.data.navInfo) {
        that.setData({
          navInfo: { name: '领航员', avatar: '', rating: 5.0, totalOrders: 0 },
          todayStats: { earn: 0, orders: 0, rating: 5.0, totalOrders: 0 }
        });
      }
    });
  },

  /* ========== 订单列表（HTTP 兜底） ========== */

  loadOrders: function (silent) {
    var that = this;
    if (!silent) that.setData({ loading: true, apiError: false });

    var marketId = '';
    if (that.data.currentMarket && that.data.currentMarket.id) {
      marketId = that.data.currentMarket.id;
    }

    api.getAvailableOrders(marketId).then(function (data) {
      var list = data.list || data;
      if (!Array.isArray(list)) list = [];

      var nearbyCount = data.nearbyCount || list.length;
      var rank = data.rank || '-';

      that.setData({
        orders: list,
        nearbyCount: nearbyCount,
        rank: rank,
        loading: false,
        refreshing: false,
        apiError: false
      });
      that._updateFilteredOrders();
    }).catch(function () {
      that.setData({
        orders: [],
        nearbyCount: 0,
        loading: false,
        refreshing: false,
        apiError: true
      });
      that._updateFilteredOrders();
      if (!silent) {
        wx.showToast({ title: '暂时无法获取订单', icon: 'none' });
      }
    });
  },

  /** 加载市场列表：API优先 + Mock降级 */
  _loadMarkets: function () {
    var that = this;
    api.getMarkets().then(function (list) {
      if (list.length > 0) {
        var markets = list.map(function (m) {
          return { id: m.id, name: m.name };
        });
        that.setData({ markets: markets });
      }
    }).catch(function () {
      // 保持Mock初始值
    });
  },

  _updateFilteredOrders: function () {
    var f = this.data.filter;
    var all = this.data.orders;
    var filtered;

    if (f === 'all') {
      filtered = all;
    } else {
      filtered = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].serviceType === f) {
          filtered.push(all[i]);
        }
      }
    }

    var counts = { navigation: 0, accompany: 0, inspection: 0 };
    for (var j = 0; j < all.length; j++) {
      var st = all[j].serviceType;
      if (counts[st] !== undefined) counts[st]++;
    }

    this.setData({ filteredOrders: filtered, filterCounts: counts });
  },

  /* ========== 音频提示 ========== */

  _initAudio: function () {
    var that = this;
    // 播放函数（降级：使用 wx 震动代替，音频在模拟器中不可用）
    that._playAudio = function () {
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
    };
    // 仅在真机环境加载音频（模拟器中InnerAudioContext可能不可用）
    try {
      var systemInfo = wx.getSystemInfoSync();
      if (systemInfo.platform === 'devtools') return;
      var audioCtx = wx.createInnerAudioContext();
      audioCtx.src = 'https://res.wx.qq.com/voice/getvoice?mediaid=MzIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMA==';
      audioCtx.autoplay = false;
      audioCtx.loop = false;
      audioCtx.volume = 0.8;
      that._playAudio = function () {
        try { audioCtx.seek(0); audioCtx.play(); } catch (e) {}
      };

      // 保留引用防止GC
      that._audioCtx = audioCtx;
    } catch (e) {
      that._playAudio = function () {};
    }
  },

  /** 播放新订单音频提示 */
  _playNewOrderSound: function () {
    if (typeof this._playAudio === 'function') {
      this._playAudio();
    }
    // 同时尝试振动（已有）
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
  },

  /* ========== WebSocket 初始化 ========== */

  _initWebSocket: function () {
    var that = this;
    if (that.data._wsEventsBound) return;

    try {
      var socket = app.globalData.socket;
      if (!socket) {
        var socketUtil = require('../../utils/socket');
        socket = socketUtil.getSocket();
        app.globalData.socket = socket;
      }

      socket.on('order:new', that._onNewOrder);
      socket.on('order:timeout', that._onOrderTimeout);
      socket.on('order:assigned', that._onOrderAssigned);
      socket.on('order:grab_result', that._onGrabResult);
      socket.on('connect', that._onWSConnect);
      socket.on('disconnect', that._onWSDisconnect);
      socket.on('reconnecting', that._onWSReconnecting);

      that.data._wsEventsBound = true;
      that._updateConnectionStatus();
    } catch (e) {
      console.error('[index] WebSocket 初始化失败', e);
    }
  },

  _unbindWSEvents: function () {
    try {
      var socket = app.globalData.socket;
      if (socket) {
        socket.off('order:new', this._onNewOrder);
        socket.off('order:timeout', this._onOrderTimeout);
        socket.off('order:assigned', this._onOrderAssigned);
        socket.off('order:grab_result', this._onGrabResult);
        socket.off('connect', this._onWSConnect);
        socket.off('disconnect', this._onWSDisconnect);
        socket.off('reconnecting', this._onWSReconnecting);
      }
    } catch (e) {}
    this.data._wsEventsBound = false;
  },

  /* ========== WebSocket 事件处理 ========== */

  _onWSConnect: function () {
    this._updateConnectionStatus();
    this.loadOrders(true);
  },

  _onWSDisconnect: function () {
    this._updateConnectionStatus();
  },

  _onWSReconnecting: function () {
    this._updateConnectionStatus();
  },

  _onWSReconnect: function () {
    this.loadOrders(true);
    this._updateConnectionStatus();
  },

  _updateConnectionStatus: function () {
    var socket = app.globalData.socket;
    var connected = socket && socket.connected;
    var reconnecting = socket && socket.reconnectAttempts > 0;
    var status, statusText, dotClass;

    if (connected) {
      status = 'connected';
      statusText = '已连接';
      dotClass = 'dot-connected';
    } else if (reconnecting) {
      status = 'reconnecting';
      statusText = '重连中';
      dotClass = 'dot-reconnecting';
    } else {
      status = 'disconnected';
      statusText = '未连接';
      dotClass = 'dot-disconnected';
    }

    this.setData({
      connectionStatus: status,
      connectionStatusText: statusText,
      connectionDotClass: dotClass
    });
  },

  /**
   * 新订单推送
   */
  _onNewOrder: function (data) {
    if (!data || !data.id) return;

    var that = this;
    var order = data;

    var expireAt = data.expireAt || (Date.now() + 15000);
    var expireTime = typeof expireAt === 'number' ? expireAt : new Date(expireAt).getTime();
    var now = Date.now();
    var remaining = Math.max(0, Math.floor((expireTime - now) / 1000));

    var pendingOrder = that._preparePendingOrder(order, remaining);

    var pendingOrders = that.data.pendingOrders;
    var exists = false;
    for (var i = 0; i < pendingOrders.length; i++) {
      if (pendingOrders[i].id === order.id) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      pendingOrders.push(pendingOrder);
    }

    that._startCountdown(order.id, expireTime);

    var orders = that.data.orders;
    var orderExists = false;
    for (var j = 0; j < orders.length; j++) {
      if (orders[j].id === order.id) {
        orderExists = true;
        break;
      }
    }
    if (!orderExists) {
      orders.unshift(order);
    }

    that.setData({
      pendingOrders: pendingOrders,
      orders: orders,
      nearbyCount: parseInt(that.data.nearbyCount || 0) + 1
    });
    that._updateFilteredOrders();

    // 音频 + 振动提示
    that._playNewOrderSound();
  },

  /**
   * 预计算待抢订单展示字段
   */
  _preparePendingOrder: function (order, remaining) {
    var serviceType = order.serviceType || 'navigation';
    var typeLabel = serviceType === 'navigation' ? '导航单'
      : serviceType === 'accompany' ? '陪逛单'
      : serviceType === 'inspection' ? '验货单'
      : '服务单';

    var amount = order.amount || 0;
    var income = order.navigatorIncome || Math.round(amount * 0.8);
    var amountText = String(amount);
    var incomeText = String(income);

    var shops = order.shops || 1;
    var shopsText = String(shops) + '家店';
    var timeAgo = order.timeAgo || '刚刚';
    var distance = order.distance || '100m';

    var countdownText = String(remaining) + 's';
    var countdownPercent = Math.min(100, Math.round((remaining / 15) * 100));
    var isUrgent = remaining <= 5;

    return {
      id: order.id,
      serviceType: serviceType,
      typeLabel: typeLabel,
      description: order.description || '',
      amount: amount,
      amountText: amountText,
      income: income,
      incomeText: incomeText,
      shops: shops,
      shopsText: shopsText,
      timeAgo: timeAgo,
      distance: distance,
      address: order.address || '',
      lat: order.lat || 0,
      lng: order.lng || 0,
      countdownText: countdownText,
      countdownPercent: countdownPercent,
      isUrgent: isUrgent,
      remaining: remaining,
      marketName: order.marketName || ''
    };
  },

  /**
   * 订单超时
   */
  _onOrderTimeout: function (data) {
    var orderId = (data && data.id) || (data && data.orderId);
    if (!orderId) return;

    this._clearCountdown(orderId);

    var pendingOrders = this.data.pendingOrders;
    var remaining = [];
    for (var i = 0; i < pendingOrders.length; i++) {
      if (pendingOrders[i].id !== orderId) {
        remaining.push(pendingOrders[i]);
      }
    }
    this.setData({ pendingOrders: remaining });

    var orders = this.data.orders;
    var ordersRemaining = [];
    for (var j = 0; j < orders.length; j++) {
      if (orders[j].id !== orderId) {
        ordersRemaining.push(orders[j]);
      }
    }
    this.setData({ orders: ordersRemaining });
    this._updateFilteredOrders();
  },

  /**
   * 订单已被分配
   */
  _onOrderAssigned: function (data) {
    var orderId = (data && data.id) || (data && data.orderId);
    var navigatorId = data && data.navigatorId;

    if (!orderId) return;

    this._clearCountdown(orderId);

    var pendingOrders = this.data.pendingOrders;
    var remaining = [];
    for (var i = 0; i < pendingOrders.length; i++) {
      if (pendingOrders[i].id !== orderId) {
        remaining.push(pendingOrders[i]);
      }
    }
    this.setData({ pendingOrders: remaining });

    var orders = this.data.orders;
    var ordersRemaining = [];
    for (var j = 0; j < orders.length; j++) {
      if (orders[j].id !== orderId) {
        ordersRemaining.push(orders[j]);
      }
    }
    this.setData({ orders: ordersRemaining });
    this._updateFilteredOrders();

    var myId = app.globalData.navInfo && app.globalData.navInfo.id;
    if (navigatorId && myId && navigatorId === myId) {
      wx.showToast({ title: '有订单派给你了！', icon: 'none' });
    }
  },

  /**
   * 抢单结果
   */
  _onGrabResult: function (data) {
    if (!data) return;
    var success = data.success;
    var message = data.message || (success ? '抢单成功' : '抢单失败');
    var orderId = data.orderId;

    if (success) {
      wx.showToast({ title: '抢单成功！', icon: 'success' });
      if (orderId) {
        this._clearCountdown(orderId);
        var pendingOrders = this.data.pendingOrders;
        var remaining = [];
        for (var i = 0; i < pendingOrders.length; i++) {
          if (pendingOrders[i].id !== orderId) {
            remaining.push(pendingOrders[i]);
          }
        }
        this.setData({ pendingOrders: remaining });
        wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + orderId });
      }
    } else {
      wx.showToast({ title: message, icon: 'none' });
    }
  },

  /* ========== 倒计时管理 ========== */

  _startCountdown: function (orderId, expireTime) {
    var that = this;
    that._clearCountdown(orderId);

    var timer = setInterval(function () {
      var now = Date.now();
      var remaining = Math.max(0, Math.floor((expireTime - now) / 1000));

      var pendingOrders = that.data.pendingOrders;
      var activeCountdowns = that.data.activeCountdowns;
      var found = false;

      for (var i = 0; i < pendingOrders.length; i++) {
        if (pendingOrders[i].id === orderId) {
          pendingOrders[i].remaining = remaining;
          pendingOrders[i].countdownText = String(remaining) + 's';
          pendingOrders[i].countdownPercent = Math.min(100, Math.round((remaining / 15) * 100));
          pendingOrders[i].isUrgent = remaining <= 5;
          activeCountdowns[orderId] = String(remaining) + 's';
          found = true;
          break;
        }
      }

      if (!found || remaining <= 0) {
        that._clearCountdown(orderId);
        if (remaining <= 0) {
          var newPending = [];
          for (var j = 0; j < pendingOrders.length; j++) {
            if (pendingOrders[j].id !== orderId) {
              newPending.push(pendingOrders[j]);
            }
          }
          if (activeCountdowns[orderId]) {
            delete activeCountdowns[orderId];
          }
          that.setData({
            pendingOrders: newPending,
            activeCountdowns: activeCountdowns
          });
        }
        return;
      }

      that.setData({
        pendingOrders: pendingOrders,
        activeCountdowns: activeCountdowns
      });
    }, 1000);

    that.data._countdownTimers[orderId] = timer;
  },

  _clearCountdown: function (orderId) {
    var timers = this.data._countdownTimers;
    if (timers[orderId]) {
      clearInterval(timers[orderId]);
      delete timers[orderId];
    }
    var activeCountdowns = this.data.activeCountdowns;
    if (activeCountdowns[orderId]) {
      delete activeCountdowns[orderId];
      this.setData({ activeCountdowns: activeCountdowns });
    }
  },

  _clearAllCountdowns: function () {
    var timers = this.data._countdownTimers;
    var keys = Object.keys(timers);
    for (var i = 0; i < keys.length; i++) {
      clearInterval(timers[keys[i]]);
    }
    this.data._countdownTimers = {};
    this.setData({
      pendingOrders: [],
      activeCountdowns: {}
    });
  },

  /* ========== 抢单（点击按钮） ========== */

  onGrabOrder: function (e) {
    var orderId = e.currentTarget.dataset.id;
    var that = this;

    if (!orderId) {
      wx.showToast({ title: '订单信息错误', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认接单',
      content: '接单后请在15分钟内到达指定市场',
      success: function (res) {
        if (res.confirm) {
          // 先通过 WS 发送抢单
          var socket = app.globalData.socket;
          if (socket && socket.connected) {
            socket.emit('navigator:grab', { orderId: orderId });
          }

          // HTTP 兜底
          api.acceptOrder(orderId).then(function () {
            wx.showToast({ title: '接单成功！', icon: 'success' });

            that._clearCountdown(orderId);

            var pendingOrders = that.data.pendingOrders;
            var remaining = [];
            for (var i = 0; i < pendingOrders.length; i++) {
              if (pendingOrders[i].id !== orderId) {
                remaining.push(pendingOrders[i]);
              }
            }
            that.setData({ pendingOrders: remaining });

            var orders = that.data.orders;
            var ordersRemaining = [];
            for (var j = 0; j < orders.length; j++) {
              if (orders[j].id !== orderId) {
                ordersRemaining.push(orders[j]);
              }
            }
            that.setData({ orders: ordersRemaining });
            that._updateFilteredOrders();

            wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + orderId });
          }).catch(function (err) {
            wx.showToast({
              title: err.message || '接单失败，请重试',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  /* ========== 上线/下线 ========== */

  onToggle: function () {
    var that = this;
    var newState = !that.data.isOnline;

    that.setData({ isOnline: newState });

    api.toggleOnline(newState).then(function () {
      wx.showToast({ title: newState ? '已上线，开始接单' : '已下线', icon: 'none' });

      var socket = app.globalData.socket;
      if (socket && socket.connected) {
        socket.emit('navigator:online', { isOnline: newState });
      }
    }).catch(function () {
      wx.showToast({ title: newState ? '已上线，开始接单' : '已下线', icon: 'none' });
    });
  },

  /* ========== 筛选切换 ========== */

  onFilter: function (e) {
    var f = e.currentTarget.dataset.f;
    this.setData({ filter: f });
    this._updateFilteredOrders();
  },

  /* ========== 下拉刷新 ========== */

  onRefresh: function () {
    this.setData({ refreshing: true });
    this.loadOrders();
  },

  /* ========== 切换市场 ========== */

  onSwitchMarket: function () {
    var that = this;
    var markets = that.data.markets;
    var itemList = [];
    for (var i = 0; i < markets.length; i++) {
      itemList.push(markets[i].name);
    }

    wx.showActionSheet({
      itemList: itemList,
      success: function (res) {
        var selected = markets[res.tapIndex];
        var shortName = getMarketShortName(selected.name);
        that.setData({
          currentMarket: selected,
          marketShortName: shortName
        });
        that.loadOrders();
      }
    });
  },

  /* ========== 导航 ========== */

  onGoMyOrders: function () {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' });
  },

  onGoRegister: function () {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});
