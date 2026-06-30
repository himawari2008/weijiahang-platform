// ============================================
// 为家航领航员 — 统一 API 请求封装
// 所有页面必须通过此模块发起 HTTP 请求
// 统一处理：token 鉴权、401 自动重试、响应解包、错误兜底
// ============================================
var config = require('./config');

/**
 * 核心请求方法
 * @param {string} url - API 路径（不含 base）
 * @param {object} options - { method, data, needAuth, showError }
 * @returns {Promise<any>} 返回 res.data.data（已解包）
 */
function request(url, options) {
  options = options || {};
  var method = options.method || 'GET';
  var data = options.data || {};
  var needAuth = options.needAuth !== undefined ? options.needAuth : true;
  var showError = options.showError !== undefined ? options.showError : true;

  var token = '';
  try {
    token = wx.getStorageSync('nav_token') || '';
  } catch (e) {
    token = '';
  }

  return new Promise(function (resolve, reject) {
    var header = { 'Content-Type': 'application/json' };
    if (needAuth && token) {
      header['Authorization'] = 'Bearer ' + token;
    }

    wx.request({
      url: config.API_BASE + url,
      method: method,
      data: data,
      header: header,
      timeout: config.REQUEST_TIMEOUT,
      success: function (res) {
        var statusCode = res.statusCode;
        var resp = res.data;

        // 接受 code: 200 或 code: 0 两种成功格式
        var isOk = (statusCode >= 200 && statusCode < 300) &&
                   (resp && (resp.code === 200 || resp.code === 0));

        if (isOk) {
          // 部分接口返回 data 字段，部分直接返回对象
          resolve(resp.data !== undefined ? resp.data : resp);
        } else if (statusCode === 401 || (resp && resp.code === 401)) {
          // token 过期，尝试自动重登录后重试
          var app = getApp();
          if (app && app.wxLogin) {
            app.wxLogin().then(function () {
              request(url, options).then(resolve).catch(reject);
            }).catch(function () {
              reject(new Error('登录已过期，请重新登录'));
            });
          } else {
            reject(new Error('登录已过期，请重新登录'));
          }
        } else {
          if (showError) {
            wx.showToast({
              title: (resp && resp.message) || '请求失败',
              icon: 'none',
              duration: 2000
            });
          }
          reject(new Error((resp && resp.message) || ('HTTP ' + statusCode)));
        }
      },
      fail: function (err) {
        if (showError) {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none', duration: 2000 });
        }
        reject(err);
      }
    });
  });
}

// ============================================
// 公开 API
// ============================================
var api = {
  // ---- 快捷方法 ----
  get: function (url, data, opts) { return request(url, Object.assign({ method: 'GET', data: data }, opts || {})); },
  post: function (url, data, opts) { return request(url, Object.assign({ method: 'POST', data: data }, opts || {})); },
  put: function (url, data, opts) { return request(url, Object.assign({ method: 'PUT', data: data }, opts || {})); },
  del: function (url, data, opts) { return request(url, Object.assign({ method: 'DELETE', data: data }, opts || {})); },
  /** 无认证请求（用于登录等公开端点） */
  getPublic: function (url, data) { return api.get(url, data, { needAuth: false }); },
  postPublic: function (url, data) { return api.post(url, data, { needAuth: false }); },

  // ---- 认证 ----
  /** 微信登录 */
  wxLogin: function (code) {
    return request('/auth/wx-login', {
      method: 'POST',
      data: { code: code },
      needAuth: false,
      showError: false
    });
  },

  // ---- 领航员资料 ----
  getProfile: function () { return api.get('/navigators/profile'); },
  updateProfile: function (data) { return api.put('/navigators/profile', data); },
  updateLocation: function (lat, lng, marketId) {
    return api.post('/navigators/location', { lat: lat, lng: lng, marketId: marketId });
  },
  toggleOnline: function (isOnline) { return api.post('/navigators/online', { isOnline: isOnline }); },
  /** 注册领航员 */
  register: function (data) { return api.post('/navigators/register', data); },

  // ---- 订单 ----
  /** 获取可用订单列表 */
  getAvailableOrders: function (marketId) {
    return api.get('/orders/available', marketId ? { marketId: marketId } : {});
  },
  /** 获取领航员自己的订单列表 */
  getMyOrders: function (status) { return api.get('/navigators/orders', status ? { status: status } : {}); },
  /** 获取订单详情 */
  getOrderDetail: function (id) { return api.get('/orders/' + id); },
  /** 接单 */
  acceptOrder: function (orderId) { return api.post('/orders/' + orderId + '/accept'); },
  /** 到达 */
  arriveOrder: function (orderId) { return api.post('/orders/' + orderId + '/arrive'); },
  /** 开始服务 */
  startServing: function (orderId) { return api.post('/orders/' + orderId + '/start-serving'); },
  /** 完成订单 */
  completeOrder: function (orderId) { return api.post('/orders/' + orderId + '/complete'); },
  /** 提交验货报告 */
  submitInspection: function (orderId, data) { return api.post('/orders/' + orderId + '/inspection', data); },
  /** 请求转单 */
  requestTransfer: function (orderId, reason) {
    return api.post('/orders/' + orderId + '/request-transfer', { reason: reason });
  },

  // ---- 收益 ----
  getEarnings: function () { return api.get('/navigators/earnings'); },
  /** 申请提现 */
  withdraw: function (data) { return api.post('/navigators/withdraw', data); },

  // ---- 等级体系 ----
  /** 获取领航员等级信息 */
  getTierInfo: function () { return api.get('/navigator-tier/me'); },
  /** 获取指定领航员等级（按ID） */
  getTierById: function (id) { return api.get('/navigator-tier/' + id); },

  // ---- 勋章 ----
  /** 获取领航员勋章列表 */
  getBadges: function (navId) { return api.get('/gamification/badges/' + (navId || 'me')); },

  // ---- 排行榜 ----
  /** 获取排行榜 */
  getLeaderboard: function (params) {
    // params: { type: 'income'|'rating'|'efficiency', period: 'week'|'month', marketId }
    var qs = '';
    if (params) {
      var parts = [];
      if (params.type) parts.push('type=' + params.type);
      if (params.period) parts.push('period=' + params.period);
      if (params.marketId) parts.push('marketId=' + params.marketId);
      qs = parts.length > 0 ? '?' + parts.join('&') : '';
    }
    return api.get('/navigators/leaderboard' + qs);
  },

  // ---- 培训 ----
  /** 获取培训课程列表 */
  getCourses: function (category) {
    return api.get('/training/courses' + (category ? '?category=' + category : ''));
  },
  /** 获取课程详情 */
  getCourseDetail: function (courseId) { return api.get('/training/courses/' + courseId); },
  /** 获取考试题目 */
  getExamQuestions: function (courseId) {
    return api.get('/training/exam/questions?courseId=' + (courseId || ''));
  },
  /** 提交考试 */
  submitExam: function (data) { return api.post('/training/exam/submit', data); },
  /** 获取培训进度 */
  getTrainingProgress: function () { return api.get('/training/progress'); },
  /** 更新培训进度 */
  updateTrainingProgress: function (courseId, data) {
    return api.put('/training/progress/' + courseId, data);
  },

  // ---- 数据分析 ----
  /** 获取领航员数据统计 */
  getDataStats: function () { return api.get('/analytics/navigator/current'); },
  /** 获取月度报告 */
  getMonthlyReport: function (month) {
    return api.get('/analytics/navigator/monthly-report' + (month ? '?month=' + month : ''));
  },

  // ---- 通知 ----
  /** 获取通知列表 */
  getNotifications: function (params) {
    var qs = '';
    if (params) {
      var parts = [];
      if (params.type) parts.push('type=' + params.type);
      if (params.page) parts.push('page=' + params.page);
      if (params.pageSize) parts.push('pageSize=' + params.pageSize);
      qs = parts.length > 0 ? '?' + parts.join('&') : '';
    }
    return api.get('/notifications' + qs);
  },
  /** 未读通知数 */
  getUnreadCount: function () { return api.get('/notifications/unread-count'); },
  /** 标记已读 */
  markRead: function (id) { return api.put('/notifications/' + id + '/read'); },
  /** 全部已读 */
  markAllRead: function () { return api.put('/notifications/read-all'); },

  // ---- 疲劳监测 ----
  /** 上线记录 */
  recordOnline: function () { return api.post('/fatigue/online'); },
  /** 下线记录 */
  recordOffline: function () { return api.post('/fatigue/offline'); },
  /** 获取今日在线统计 */
  getTodayStats: function (navId) { return api.get('/fatigue/today/' + navId); },
  /** 获取休息奖励资格 */
  getRestReward: function (navId) { return api.get('/fatigue/rest-reward/' + navId); },

  // ---- 反馈 ----
  /** 提交反馈 */
  submitFeedback: function (data) { return api.post('/feedback', data); },

  // ---- 偏好设置 ----
  /** 获取听单偏好 */
  getPreferences: function () { return api.get('/navigators/preferences'); },
  /** 更新听单偏好 */
  updatePreferences: function (data) { return api.put('/navigators/preferences', data); },

  /* ═══ 市场（公共接口） ═══ */
  /** 获取市场列表 */
  getMarkets: function (city) { return api.getPublic('/markets', city ? { city: city } : {}); },
  /** 获取城市列表 */
  getActiveCities: function () { return api.getPublic('/markets/city/list'); },
  /** 获取市场内店铺 */
  getMarketShops: function (marketId) { return api.getPublic('/markets/' + marketId + '/shops'); },
};

module.exports = api;
