/**
 * 为家航 C端 — API请求封装（完整版）
 * 对接 weijiahang-server 全部模块
 */
var app = getApp();

var request = function (url, options) {
  var method = options && options.method ? options.method : 'GET';
  var data = options && options.data ? options.data : {};
  var needAuth = options && options.needAuth !== undefined ? options.needAuth : true;
  var silent = options && options.silent; // 静默模式，不弹toast
  var token = wx.getStorageSync('token');
  var userId = wx.getStorageSync('userId') || '';

  return new Promise(function (resolve, reject) {
    wx.request({
      url: app.globalData.apiBase + url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': needAuth && token ? 'Bearer ' + token : '',
        'x-user-id': userId,
      },
      success: function (res) {
        var statusCode = res.statusCode;
        var resp = res.data;
        if (statusCode >= 200 && statusCode < 300 && resp.code === 200) {
          resolve(resp.data);
        } else if (statusCode === 401) {
          app.wxLogin().then(function () {
            request(url, options).then(resolve).catch(reject);
          }).catch(reject);
        } else {
          if (!silent) {
            wx.showToast({ title: resp.message || '请求失败', icon: 'none' });
          }
          reject(new Error(resp.message || 'HTTP ' + statusCode));
        }
      },
      fail: function (err) {
        if (!silent) {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        }
        reject(err);
      },
    });
  });
};

var api = {
  get: function (url, data, silent) { return request(url, { method: 'GET', data: data, silent: silent }); },
  post: function (url, data, silent) { return request(url, { method: 'POST', data: data, silent: silent }); },
  put: function (url, data, silent) { return request(url, { method: 'PUT', data: data, silent: silent }); },
  patch: function (url, data, silent) { return request(url, { method: 'PATCH', data: data, silent: silent }); },
  delete: function (url, data, silent) { return request(url, { method: 'DELETE', data: data, silent: silent }); },

  /* ═══════════════════════════════════════
     认证 (auth)
     ═══════════════════════════════════════ */
  wxLogin: function (code) { return api.post('/auth/wx-login', { code: code }, true); },
  getProfile: function () { return api.get('/auth/profile'); },
  refreshToken: function () { return api.post('/auth/refresh'); },

  /* ═══════════════════════════════════════
     市场 (markets)
     ═══════════════════════════════════════ */
  getMarkets: function (city) { return api.get('/markets', city ? { city: city } : {}); },
  getMarketDetail: function (id) { return api.get('/markets/' + id); },
  getMarketShops: function (marketId) { return api.get('/markets/' + marketId + '/shops'); },
  getMarketsByCity: function (city) { return api.get('/markets/by-city/' + city); },
  getActiveCities: function () { return api.get('/markets/city/list', {}, true); },

  /* ═══════════════════════════════════════
     店铺 (shops)
     ═══════════════════════════════════════ */
  searchShops: function (params) { return api.get('/shops', params); },
  getShopDetail: function (id) { return api.get('/shops/' + id); },
  getMarketShopMarkers: function (marketId) { return api.get('/shops/market/' + marketId); },

  /* ═══════════════════════════════════════
     商品 (products)
     ═══════════════════════════════════════ */
  /* 商品字段标准化：API字段 → 前端模板字段 */
  _normalizeProduct: function (p) {
    if (!p) return p;
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      cate: p.category,           // 兼容旧模板
      spec: p.spec || '',
      price: p.price || 0,
      unit: p.priceUnit || '㎡',  // priceUnit → unit
      image: Array.isArray(p.images) ? (p.images[0] || '') : (p.images || ''),
      images: p.images || '',
      sales: p.salesCount || 0,   // salesCount → sales
      salesCount: p.salesCount || 0,
      shopId: p.shopId || '',
      shopName: p.shop ? p.shop.name : (p.shopName || ''),
      shopRating: p.shop ? (p.shop.rating || 5.0) : (p.shopRating || 5.0),
      shop: p.shop || null,
      description: p.description || '',
      isOnSale: p.isOnSale,
      isHot: p.productGrade === 'premium',
      isNew: p.productGrade === 'premium',
      productGrade: p.productGrade || 'standard',
      gradeLabel: p.gradeLabel || '标准款',
      stock: p.stock,
      sortOrder: p.sortOrder || 0,
      minOrderQty: p.minOrderQty || 1,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  },

  _normalizeProducts: function (list) {
    var that = this;
    if (!list || !list.length) return [];
    return list.map(function(p) { return that._normalizeProduct(p); });
  },

  searchProducts: function (params) {
    var that = this;
    return api.get('/products', params).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      var normalized = that._normalizeProducts(list);
      return { list: normalized, total: res.total || normalized.length };
    });
  },
  getProductDetail: function (id) {
    var that = this;
    return api.get('/products/' + id).then(function (p) {
      return that._normalizeProduct(p);
    });
  },
  getShopProducts: function (shopId) {
    var that = this;
    return api.get('/products/shop/' + shopId).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      return that._normalizeProducts(list);
    });
  },
  getHotCategories: function () { return api.get('/products/categories/hot'); },

  /* ═══════════════════════════════════════
     AI (ai)
     ═══════════════════════════════════════ */
  aiChat: function (data) { return api.post('/ai/chat', data); },
  aiCalcMaterials: function (data) { return api.post('/ai/material-calc', data); },
  aiStreamChat: function (data) {
    return request('/ai/chat/stream', { method: 'POST', data: data });
  },

  /* ═══════════════════════════════════════
     订单 (orders) — 领航员服务订单
     ═══════════════════════════════════════ */
  createOrder: function (data) { return api.post('/orders', data); },
  getMyOrders: function (status) { return api.get('/orders/my', status ? { status: status } : {}); },
  getOrderDetail: function (id) { return api.get('/orders/' + id); },
  cancelOrder: function (id, reason) { return api.post('/orders/' + id + '/cancel', { reason: reason }); },
  confirmOrder: function (id) { return api.post('/orders/' + id + '/confirm'); },

  /* ═══════════════════════════════════════
     领航员 (navigators)
     ═══════════════════════════════════════ */
  getNavigators: function (marketId) { return api.get('/navigators/available/' + marketId); },
  getNavigatorDetail: function (id) { return api.get('/navigators/' + id); },

  /* ═══════════════════════════════════════
     评价 (reviews)
     ═══════════════════════════════════════ */
  getShopReviews: function (shopId, page, pageSize) {
    return api.get('/reviews/shop/' + shopId, { page: page || 1, pageSize: pageSize || 20 });
  },
  getNavigatorReviews: function (navId, page, pageSize) {
    return api.get('/reviews/navigator/' + navId, { page: page || 1, pageSize: pageSize || 20 });
  },
  createReview: function (data) { return api.post('/reviews', data); },

  /* ═══════════════════════════════════════
     收藏 (favorites)
     ═══════════════════════════════════════ */
  getFavorites: function (type) { return api.get('/users/favorites', { type: type || 'shop' }); },
  addFavorite: function (shopId) { return api.post('/users/favorites', { shopId: shopId }); },
  removeFavorite: function (shopId) { return api.delete('/users/favorites/' + shopId); },

  /* ═══════════════════════════════════════
     用户 (users)
     ═══════════════════════════════════════ */
  updateProfile: function (data) { return api.patch('/users/profile', data); },
  getAddresses: function () { return api.get('/users/addresses'); },
  createAddress: function (data) { return api.post('/users/addresses', data); },
  updateAddress: function (id, data) { return api.put('/users/addresses/' + id, data); },
  deleteAddress: function (id) { return api.delete('/users/addresses/' + id); },

  /* ═══════════════════════════════════════
     采购订单 (product-orders) — Phase 2 核心交易链路
     ═══════════════════════════════════════ */
  createProductOrder: function (data) { return api.post('/product-orders', data); },
  getMyProductOrders: function (status) { return api.get('/product-orders/my', status ? { status: status } : {}); },
  getProductOrderDetail: function (id) { return api.get('/product-orders/' + id); },
  cancelProductOrder: function (id, reason) { return api.put('/product-orders/' + id + '/cancel', { reason: reason }); },
  payProductOrder: function (id, method) { return api.put('/product-orders/' + id + '/pay', { paymentMethod: method || 'wechat_pay' }); },
  confirmReceipt: function (id) { return api.put('/product-orders/' + id + '/confirm-receipt'); },
  requestRefund: function (id, reason, amount) { return api.put('/product-orders/' + id + '/refund', { reason: reason, amount: amount }); },

  /* ═══════════════════════════════════════
     定价引擎 (pricing) — Phase 2
     ═══════════════════════════════════════ */
  calculatePricing: function (data) { return api.post('/pricing/calculate', data, true); },
  estimateDeliveryFee: function (data) { return api.post('/pricing/delivery-fee', data, true); },

  /* ═══════════════════════════════════════
     客户分层 (customer-tiers) — Phase 1
     ═══════════════════════════════════════ */
  getTierInfo: function () { return api.get('/customer-tiers/mine', {}, true); },
  getTierConfig: function (customerType) { return api.get('/customer-tiers/config', customerType ? { customerType: customerType } : {}, true); },

  /* ═══════════════════════════════════════
     优惠券 (coupons) — Phase 3
     ═══════════════════════════════════════ */
  getUserCoupons: function (status) { return api.get('/users/coupons', status ? { status: status } : {}, true); },
  claimCoupon: function (couponId) { return api.post('/users/coupons/' + couponId + '/claim'); },
  getAvailableCoupons: function (amount, category) {
    return api.get('/coupons/available', { amount: amount, category: category }, true);
  },

  /* ═══════════════════════════════════════
     导航 (navigation) — BLE室内定位
     ═══════════════════════════════════════ */
  getMarketMap: function (marketId, floor) {
    return api.get('/navigation/map/' + marketId, floor ? { floor: floor } : {});
  },
  getIndoorRoute: function (marketId, params) {
    return api.get('/navigation/route/' + marketId, params);
  },
  reportPosition: function (data) { return api.post('/navigation/position', data); },
  getBeacons: function (marketId, floor) {
    return api.get('/navigation/beacons/' + marketId, floor ? { floor: floor } : {});
  },
};

module.exports = api;
