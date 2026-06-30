/**
 * 为家航 · Feed 聚合页
 * 根据 ?type= 参数展示不同内容：
 *   goods → 精选好货（含热销/新品/性价比标签）
 *   inspo → 装修灵感
 *   flash → 限时特惠列表
 */
var api = require('../../utils/api.js');

/* 各类型对应标题和是否显示二级标签 */
var TYPE_CONFIG = {
  goods: { title: '精选好货', showTabs: true },
  inspo: { title: '装修灵感', showTabs: false },
  flash: { title: '限时特惠', showTabs: false },
};

Page({
  data: {
    feedType: 'goods',
    showTabs: false,
    activeTab: 'hot',
    loading: true,

    /* 商品（用于 goods 类型） */
    goodsList: [],

    /* 特惠（用于 flash 类型） */
    flashDeals: [],

    /* 灵感（用于 inspo 类型） */
    inspoList: [],

    /* 当前城市 */
    currentCity: '西安',
  },

  /* ═══════════════════════════════════════
     Lifecycle
     ═══════════════════════════════════════ */
  onLoad(options) {
    var type = options.type || 'goods';
    var config = TYPE_CONFIG[type] || TYPE_CONFIG.goods;

    wx.setNavigationBarTitle({ title: config.title });

    var app = getApp();
    var city = app.getCurrentCity ? app.getCurrentCity() : '西安';
    if (city === '定位中…' || !city) city = '西安';

    this.setData({
      feedType: type,
      showTabs: config.showTabs,
      currentCity: city,
    });

    this._loadContent(type, city);

    var that = this;
    setTimeout(function () {
      that.setData({ loading: false });
    }, 300);
  },

  onShow() {
    /* 更新城市（如果用户切换了） */
    var app = getApp();
    var city = app.getCurrentCity ? app.getCurrentCity() : this.data.currentCity;
    if (city && city !== '定位中…' && city !== this.data.currentCity) {
      this.setData({ currentCity: city });
      this._loadContent(this.data.feedType, city);
    }
  },

  /* ═══════════════════════════════════════
     数据加载
     ═══════════════════════════════════════ */
  _loadContent(type, city) {
    if (type === 'goods') {
      this._loadGoods(this.data.activeTab, city);
    } else if (type === 'inspo') {
      this._loadInspo();
    } else if (type === 'flash') {
      this._loadFlash(city);
    }
  },

  _loadGoods(tab, city) {
    var that = this;
    var sortBy = 'sales';
    if (tab === 'new') sortBy = 'newest';
    else if (tab === 'cheap') sortBy = 'price_asc';

    api.searchProducts({ city: city, sort: sortBy, limit: 30 }).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      that.setData({ goodsList: list });
    }).catch(function () {
      that.setData({ goodsList: [] });
    });
  },

  _loadInspo() {
    // 装修灵感为编辑精选内容，暂无独立API
    this.setData({ inspoList: [] });
  },

  _loadFlash(city) {
    var that = this;
    // 限时特惠：按折扣力度排序
    api.searchProducts({ city: city, sort: 'price_asc', limit: 20 }).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      that.setData({ flashDeals: list });
    }).catch(function () {
      that.setData({ flashDeals: [] });
    });
  },

  /* ═══════════════════════════════════════
     标签切换（精选好货的 热销/新品/性价比）
     ═══════════════════════════════════════ */
  onTabChange(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this._loadGoods(tab, this.data.currentCity);
  },

  /* ═══════════════════════════════════════
     商品/特惠/灵感点击
     ═══════════════════════════════════════ */
  onItemTap(e) {
    var d = e.currentTarget.dataset;
    var itemType = d.type;

    if (itemType === 'goods') {
      var params = [
        'id=' + encodeURIComponent(d.id),
        'name=' + encodeURIComponent(d.name),
        'price=' + d.price,
        'spec=' + encodeURIComponent(d.spec || ''),
        'unit=' + encodeURIComponent(d.unit || '㎡'),
        'shopId=' + encodeURIComponent(d.shopid || ''),
        'shopName=' + encodeURIComponent(d.shopname || ''),
        'sales=' + (d.sales || 0),
      ];
      wx.navigateTo({ url: '/pages/product-detail/product-detail?' + params.join('&') });
    } else if (itemType === 'flash') {
      var params = [
        'id=' + encodeURIComponent(d.id),
        'name=' + encodeURIComponent(d.name),
        'price=' + d.price,
        'spec=' + encodeURIComponent(d.spec || ''),
        'unit=' + encodeURIComponent(d.unit || '㎡'),
        'shopId=' + encodeURIComponent(d.shopid || ''),
        'shopName=' + encodeURIComponent(d.shopname || ''),
      ];
      wx.navigateTo({ url: '/pages/product-detail/product-detail?' + params.join('&') });
    } else if (itemType === 'inspo') {
      var items = this.data.inspoList;
      var item = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === d.id) { item = items[i]; break; }
      }
      if (item) {
        wx.showModal({
          title: item.title,
          content: '【风格】' + item.style + '\n' +
            '【面积】' + item.area + '平米\n' +
            '【预算】' + item.cost + '万\n' +
            '【配色】' + (item.colors || '') + '\n\n' +
            '【设计要点】\n' + (item.desc || ''),
          showCancel: true,
          cancelText: '关闭',
          confirmText: '去逛逛材料',
          success: function (res) {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/shop-list/shop-list' });
            }
          },
        });
      }
    }
  },

  /* ═══ 快速加购 ═══ */
  onQuickAddCart(e) {
    var id = e.currentTarget.dataset.id;
    var goods = null;
    var list = this.data.goodsList;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { goods = list[i]; break; }
    }
    if (!goods) return;

    try { var cart = wx.getStorageSync('cart') || []; }
    catch (err) { cart = []; }

    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === goods.id) { idx = i; break; }
    }

    var item = {
      id: goods.id, name: goods.name, price: goods.price,
      spec: goods.spec, unit: goods.unit || '㎡',
      shopId: goods.shopId, shopName: goods.shopName,
      qty: (idx >= 0 ? cart[idx].qty + 1 : 1), image: goods.image || '',
    };
    if (idx >= 0) { cart[idx] = item; } else { cart.push(item); }

    wx.setStorageSync('cart', cart);
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1200 });
  },

  /* ═══ 下拉刷新 ═══ */
  onPullDownRefresh() {
    this._loadContent(this.data.feedType, this.data.currentCity);
    setTimeout(function () { wx.stopPullDownRefresh(); }, 400);
  },

  /* ═══ 上滑加载更多（预留） ═══ */
  onReachBottom() {
    /* Mock 阶段无分页数据，实际接入 API 时实现 */
  },

  /* ═══ 分享 ═══ */
  onShareAppMessage() {
    var config = TYPE_CONFIG[this.data.feedType] || TYPE_CONFIG.goods;
    return {
      title: config.title + ' — 买建材，先领航',
      path: '/pages/feed/feed?type=' + this.data.feedType,
    };
  },
});
