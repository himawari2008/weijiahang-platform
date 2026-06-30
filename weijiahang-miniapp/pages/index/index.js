var app = getApp();
var api = require('../../utils/api.js');



Page({
  data: {
    /* 城市 */
    currentCity: '定位中…',
    cityLocated: false,
    cityCovered: true,

    /* 材质纹理分类入口（CSS纹理+文字，无图标无纯色） */
    textureCates: [
      { key: '瓷砖', label: '瓷砖', texture: 'tile' },
      { key: '卫浴', label: '卫浴', texture: 'bath' },
      { key: '地板', label: '地板', texture: 'floor' },
      { key: '涂料', label: '涂料', texture: 'paint' },
      { key: '门窗', label: '门窗', texture: 'door' },
      { key: '石材', label: '石材', texture: 'stone' },
      { key: '辅材', label: '辅材', texture: 'hardware' },
      { key: 'all',  label: '全部', texture: 'all' },
    ],

    /* Banner */
    banners: [
      { id: 'b1', title: '装修季特惠', desc: '瓷砖地板全场低至5折', bg: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', link: '' },
      { id: 'b2', title: '新店开业', desc: '首单9折 · 领航员免费带看', bg: 'linear-gradient(135deg, #1A3A4A, #2A5A6A)', link: '' },
      { id: 'b3', title: '三道把关保障', desc: '货不对板 · 平台先行赔付', bg: 'linear-gradient(135deg, #2D8B4A, #3DA85C)', link: '' },
    ],

    /* 商品流 */
    feedTab: 'hot',
    goodsList: [],

    /* 附近市场 */
    markets: [],

    /* 购物车 */
    cartCount: 0,

    /* 骨架屏 */
    loading: true,
  },

  /* ═══════════════════════════════════════
     Lifecycle
     ═══════════════════════════════════════ */
  onLoad() {
    var that = this;
    this._initCity(function () {
      that._loadMarkets();
      that._loadBanners();
      that.loadGoods(that.data.feedTab);
      setTimeout(function () {
        that.setData({ loading: false });
      }, 800);
    });
  },

  onShow() {
    this.updateCartCount();
    var city = app.getCurrentCity();
    if (city !== this.data.currentCity && city !== '定位中…') {
      this.setData({ currentCity: city });
      this._loadMarkets();
      this.loadGoods(this.data.feedTab);
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  /* ═══════════════════════════════════════
     TabBar — 点击首页图标回到顶部
     ═══════════════════════════════════════ */
  onTabItemTap(item) {
    if (item.index === 0) {
      wx.pageScrollTo({ scrollTop: 0, duration: 300 });
    }
  },

  /* ═══════════════════════════════════════
     城市
     ═══════════════════════════════════════ */
  _initCity(callback) {
    var that = this;
    var cached = app.getCurrentCity();
    var done = false;
    function finish() { if (!done) { done = true; callback(); } }

    this.setData({ currentCity: cached, cityLocated: false });
    finish();

    app.getCurrentLocation().then(function (result) {
      if (result && result.cityInfo && result.cityInfo.city) {
        var city = result.cityInfo.city.replace('市', '');
        app.setCity(result.cityInfo);
        if (city !== that.data.currentCity) {
          that.setData({ currentCity: city, cityLocated: true });
          that._loadMarkets();
          that.loadGoods(that.data.feedTab);
        } else {
          that.setData({ cityLocated: true });
        }
      }
    }).catch(function () {});
  },

  /** 加载市场数据：API优先 + Mock降级 */
  _loadMarkets() {
    var that = this;
    var city = this.data.currentCity;
    if (city === '定位中…') city = '西安';

    // 尝试API获取市场列表
    api.get('/markets', { city: city }, true).then(function (res) {
      var markets = Array.isArray(res) ? res : (res.list || res.items || []);
      if (markets.length > 0) {
        // 转换API字段→模板期望字段（distance需后续通过定位计算）
        var bgColors = ['#EBF5FF', '#FFF5EB', '#FFF0EB', '#EBFFF5', '#E8F5F0', '#FFF8F0', '#F0F5FF'];
        markets = markets.map(function (m, i) {
          return {
            id: m.id, name: m.name, city: m.city,
            storeCount: m.shopCount || 0,
            cateCount: m.cateCount || 8,
            distance: m.distance || '',
            bgColor: m.bgColor || bgColors[i % bgColors.length],
            highlight: m.highlight || '',
          };
        });
        that.setData({ markets: markets, cityCovered: true });
        return;
      }
      throw new Error('空数据');
    }).catch(function () {
      // API不可用，显示空状态
      that.setData({ markets: [], cityCovered: false });
    });
  },

  /** 加载Banner数据：API优先 + Mock降级 */
  _loadBanners() {
    var that = this;
    api.get('/banners/active', { position: 'home' }, true).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      if (list.length > 0) {
        that.setData({ banners: list });
      }
    }).catch(function () {
      // 保持data中预设的Mock Banner，无需操作
    });
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-select/city-select' });
  },

  /* ═══════════════════════════════════════
     材质纹理分类入口
     ═══════════════════════════════════════ */
  onTextureCateTap(e) {
    var key = e.currentTarget.dataset.key;
    if (key === 'all') {
      wx.navigateTo({ url: '/pages/shop-list/shop-list?category=all' });
    } else {
      wx.navigateTo({ url: '/pages/shop-list/shop-list?category=' + key });
    }
  },

  /* ═══════════════════════════════════════
     搜索
     ═══════════════════════════════════════ */
  onSearchTap() {
    wx.navigateTo({ url: '/pages/shop-list/shop-list?focus=search' });
  },

  /* ═══════════════════════════════════════
     Banner
     ═══════════════════════════════════════ */
  onBannerTap(e) {
    var index = parseInt(e.currentTarget.dataset.index) || 0;
    var banner = this.data.banners[index];
    // API Banner含link字段则按link跳转；Mock Banner按位置：前2跳商品列表，其余跳消息
    if (banner && banner.link) {
      if (banner.link.indexOf('/pages/') === 0) {
        wx.navigateTo({ url: banner.link });
      } else {
        wx.navigateTo({ url: '/pages/shop-list/shop-list' });
      }
    } else if (index < 2) {
      wx.navigateTo({ url: '/pages/shop-list/shop-list' });
    } else {
      wx.switchTab({ url: '/pages/messages/messages' });
    }
  },

  /* ═══════════════════════════════════════
     市场 → market-detail（地图+商品流）
     ═══════════════════════════════════════ */
  onMarketTap(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/market-detail/market-detail?marketId=' + id });
  },
  onAllMarkets() {
    wx.navigateTo({ url: '/pages/map/map' });
  },

  /* ═══════════════════════════════════════
     购物车
     ═══════════════════════════════════════ */
  updateCartCount() {
    try {
      var cart = wx.getStorageSync('cart') || [];
      this.setData({ cartCount: cart.length });
      if (cart.length > 0) {
        wx.setTabBarBadge({ index: 3, text: String(cart.length) });
      } else {
        wx.removeTabBarBadge({ index: 3 });
      }
    } catch (e) {}
  },

  onGoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },
  onGoMessages() {
    wx.switchTab({ url: '/pages/messages/messages' });
  },

  /* ═══════════════════════════════════════
     商品流（热销/新品/性价比）— API优先 + Mock降级
     ═══════════════════════════════════════ */
  onFeedTab(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ feedTab: tab });
    this.loadGoods(tab);
  },

  loadGoods(tab) {
    var that = this;
    var city = this.data.currentCity;
    if (city === '定位中…') city = '西安';

    // 确定排序参数
    var sortBy = 'sales';
    if (tab === 'new') sortBy = 'newest';
    else if (tab === 'cheap') sortBy = 'price_asc';

    // 尝试API获取商品
    api.searchProducts({ city: city, sort: sortBy, limit: 30 }).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      if (list.length > 0) {
        that.setData({ goodsList: list });
        return;
      }
      throw new Error('空数据');
    }).catch(function () {
      // API不可用，显示空状态
      that.setData({ goodsList: [] });
    });
  },

  onGoodsTap(e) {
    var d = e.currentTarget.dataset;
    var params = [
      'id=' + encodeURIComponent(d.id),
      'name=' + encodeURIComponent(d.name),
      'price=' + d.price,
      'spec=' + encodeURIComponent(d.spec || ''),
      'shopId=' + encodeURIComponent(d.shopId || ''),
      'shopName=' + encodeURIComponent(d.shop || ''),
      'sales=' + (d.sales || 0),
    ];
    wx.navigateTo({ url: '/pages/product-detail/product-detail?' + params.join('&') });
  },

  /* 快速加购 */
  onQuickAddCart(e) {
    var id = e.currentTarget.dataset.id;
    var goods = this.data.goodsList.find(function (g) { return g.id === id; });
    if (!goods) return;

    var cart;
    try { cart = wx.getStorageSync('cart') || []; }
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
    this.updateCartCount();
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1200 });
  },

  /* ═══════════════════════════════════════
     导航芯片（精选好货/装修灵感/限时特惠）
     ═══════════════════════════════════════ */
  onChipTap(e) {
    var type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: '/pages/feed/feed?type=' + type });
  },
});
