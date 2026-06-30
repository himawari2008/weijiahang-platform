var config = require('./utils/config');
var socketUtil = require('./utils/socket');
var api = require('./utils/api');

App({
  globalData: {
    navInfo: null,
    token: null,
    apiBase: config.API_BASE,
    isOnline: false,
    currentLocation: null,
    todayEarn: 268,
    socket: null,
    navigatorId: '',
    _loginPromise: null,  // 防重复登录的Promise缓存
  },

  onLaunch: function () {
    var that = this;

    // 1. 恢复登录态
    var t = wx.getStorageSync('nav_token');
    if (t) that.globalData.token = t;

    var stored = wx.getStorageSync('nav_info');
    if (stored) {
      that.globalData.navInfo = stored;
      that.globalData.navigatorId = stored.id || '';
    }

    // 2. 自动登录（静默，延迟1秒让页面先渲染）
    if (!that.globalData.token) {
      setTimeout(function () { that.autoLogin(); }, 1000);
    }

    // 3. 启动 WebSocket（登录后才建立）
    if (that.globalData.token) {
      that.initSocket();
    }
  },

  /**
   * 静默自动登录（仅在无token时调用，防重复）
   */
  autoLogin: function () {
    var that = this;
    if (that.globalData.token) return;

    // 防重复：如果已有进行中的登录请求，复用同一个Promise
    if (that.globalData._loginPromise) return;
    that.globalData._loginPromise = true;

    wx.login({
      success: function (res) {
        if (res.code) {
          api.wxLogin(res.code).then(function (d) {
            that.globalData.token = d.accessToken;
            wx.setStorageSync('nav_token', d.accessToken);

            if (d.user) {
              that.globalData.navInfo = d.user;
              that.globalData.navigatorId = d.user.id || '';
              wx.setStorageSync('nav_info', d.user);
            }

            that.globalData._loginPromise = null;
            // 登录后初始化 WebSocket
            that.initSocket();
          }).catch(function () {
            that.globalData._loginPromise = null;
            console.log('静默登录失败，用户可手动登录');
          });
        } else {
          that.globalData._loginPromise = null;
        }
      },
      fail: function () {
        that.globalData._loginPromise = null;
      }
    });
  },

  /**
   * 初始化 WebSocket 连接
   */
  initSocket: function () {
    var that = this;
    try {
      var socket = socketUtil.getSocket();
      var navInfo = that.globalData.navInfo || {};
      var marketId = navInfo.currentMarketId || '';

      socket.connect({
        type: 'navigator',
        id: navInfo.id || 'unknown',
        marketId: marketId,
        token: that.globalData.token || ''
      });

      that.globalData.socket = socket;

      // 监听强制下线
      socket.on('system:force_offline', function (data) {
        wx.showModal({
          title: '强制下线',
          content: (data && data.message) || '您已连续在线超过12小时，请休息',
          showCancel: false,
          success: function () {
            that.globalData.isOnline = false;
            var pages = getCurrentPages();
            for (var i = 0; i < pages.length; i++) {
              if (pages[i].route === 'pages/index/index') {
                pages[i].setData({ isOnline: false });
                break;
              }
            }
          }
        });
      });

      // 监听断线通知
      socket.on('disconnect', function () {
        console.log('[app] WebSocket 已断开');
      });

      // 监听重连
      socket.on('connect', function () {
        console.log('[app] WebSocket 已重连');
        var pages = getCurrentPages();
        for (var i = 0; i < pages.length; i++) {
          if (pages[i].route === 'pages/index/index') {
            if (typeof pages[i]._onWSReconnect === 'function') {
              pages[i]._onWSReconnect();
            }
            break;
          }
        }
      });

    } catch (e) {
      console.error('[app] WebSocket 初始化失败', e);
    }
  },

  /**
   * 用户手动登录（从注册/我的页面调用）
   */
  wxLogin: function () {
    var that = this;
    return new Promise(function (resolve, reject) {
      wx.login({
        success: function (res) {
          if (!res.code) {
            reject(new Error('获取登录凭证失败'));
            return;
          }
          api.wxLogin(res.code).then(function (d) {
            that.globalData.token = d.accessToken;
            that.globalData.navigatorId = (d.user && d.user.id) || '';
            wx.setStorageSync('nav_token', d.accessToken);
            if (d.user) {
              that.globalData.navInfo = d.user;
              wx.setStorageSync('nav_info', d.user);
            }
            resolve(d.user);
          }).catch(reject);
        },
        fail: reject
      });
    });
  },

  /**
   * 启动位置上报
   */
  startLocationReport: function () {
    var that = this;
    wx.startLocationUpdateBackground({
      success: function () {
        wx.onLocationChange(function (res) {
          that.globalData.currentLocation = res;
        });
      },
      fail: function () {
        // 静默失败，位置上报非必须
      }
    });
  }
});
