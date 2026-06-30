/**
 * 为家航 · 市场详情页
 * 上半：地图导航（可收起）| 下半：该市场商品瀑布流
 * 无图标 · 纯文字分类 · 无卡片阴影
 */
var app = getApp();
var api = require('../../utils/api.js');

Page({
  data: {
    marketId: 0,
    market: {},
    shops: [],

    /* 地图 */
    mapCenter: { lat: 34.2990, lng: 108.9470 },
    mapScale: 15,
    markers: [],
    circles: [],
    mapCollapsed: false,

    /* 搜索 */
    showSearchBar: false,
    keyword: '',

    /* 分类 & 排序 */
    currentCate: '',
    sortBy: 'hot',

    /* 商品 */
    allGoods: [],
    goodsList: [],
    loading: true,
    hasMore: true,
    pageSize: 20,
    currentPage: 1,
  },

  /* ═══════════════════════════════════════
     Lifecycle
     ═══════════════════════════════════════ */
  onLoad(options) {
    var that = this;
    var marketId = options.marketId || '1';

    this.setData({ marketId: marketId });

    // API优先：获取市场详情+店铺+商品
    var apiMarketId = marketId; // 可能是UUID或数字ID

    // 并行获取市场详情和商品
    var marketPromise = api.get('/markets/' + apiMarketId, {}, true);
    var shopsPromise = api.get('/markets/' + apiMarketId + '/shops', {}, true);
    var goodsPromise = api.searchProducts({ marketId: apiMarketId, sort: 'sales', limit: 30 });

    Promise.all([marketPromise, shopsPromise, goodsPromise]).then(function (results) {
      var market = results[0];
      var shops = Array.isArray(results[1]) ? results[1] : (results[1].list || results[1].items || []);
      var goods = Array.isArray(results[2]) ? results[2] : (results[2].list || results[2].items || []);

      // 转换坐标
      if (market) {
        market.lat = market.latitude;
        market.lng = market.longitude;
      }

      that.setData({
        market: market || {},
        shops: shops,
        allGoods: goods,
        mapCenter: { lat: market.latitude || 34.299, lng: market.longitude || 108.947 },
        mapScale: 16,
      });

      that._renderMarkers(market, shops);
      that._renderCircles(market);
      that._filterAndSortGoods();
      that._initUserLocation();
      that.setData({ loading: false });
    }).catch(function () {
      // API不可用，显示空状态
      that.setData({
        market: {}, shops: [], allGoods: [],
        mapCenter: { lat: 34.299, lng: 108.947 },
        mapScale: 15, loading: false,
      });
      wx.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    });
  },

  onReady() {
    this.mapCtx = wx.createMapContext('marketMap');
  },

  /* ═══════════════════════════════════════
     地图渲染
     ═══════════════════════════════════════ */
  _renderMarkers(market, shops) {
    var markers = [];

    // 市场标记
    markers.push({
      id: 10000,
      latitude: market.lat,
      longitude: market.lng,
      width: 32,
      height: 32,
      anchor: { x: 0.5, y: 1 },
      callout: {
        content: market.name,
        color: '#1A1A1A',
        fontSize: 13,
        borderRadius: 8,
        bgColor: '#ffffff',
        padding: 8,
        display: 'ALWAYS',
        textAlign: 'center',
      },
      zIndex: 10,
    });

    // 店铺标记（围绕市场散开）
    for (var i = 0; i < shops.length; i++) {
      var s = shops[i];
      var offsetLat = Math.cos(i * 1.2) * 0.0006;
      var offsetLng = Math.sin(i * 1.2) * 0.0006;

      // marker id 必须是数字，用索引生成（UUID无法parseInt）
      markers.push({
        id: 20000 + i,
        latitude: market.lat + offsetLat,
        longitude: market.lng + offsetLng,
        width: 20,
        height: 20,
        anchor: { x: 0.5, y: 0.5 },
        callout: {
          content: s.name,
          color: '#333333',
          fontSize: 11,
          borderRadius: 6,
          bgColor: '#ffffff',
          padding: 6,
          display: 'BYCLICK',
          textAlign: 'center',
        },
        zIndex: 5,
      });
    }

    this.setData({ markers: markers });
  },

  _renderCircles(market) {
    this.setData({
      circles: [{
        latitude: market.lat,
        longitude: market.lng,
        radius: 800,
        color: '#FF6B3540',
        fillColor: '#FF6B3510',
        strokeWidth: 2,
      }],
    });
  },

  /* ═══════════════════════════════════════
     用户定位
     ═══════════════════════════════════════ */
  _initUserLocation() {
    var that = this;
    app.getCurrentLocation().then(function (result) {
      if (result && result.location) {
        // 不强制移动地图，保留在市场位置
      }
    }).catch(function () {});
  },

  onLocateMe() {
    var that = this;
    app.getCurrentLocation().then(function (result) {
      if (result && result.location) {
        that.setData({
          mapCenter: {
            lat: result.location.latitude,
            lng: result.location.longitude,
          },
          mapScale: 16,
        });
        if (that.mapCtx) {
          that.mapCtx.moveToLocation({
            latitude: result.location.latitude,
            longitude: result.location.longitude,
          });
        }
        wx.showToast({ title: '已定位', icon: 'success', duration: 800 });
      } else {
        wx.showToast({ title: '定位失败，请授权位置', icon: 'none' });
      }
    }).catch(function () {
      wx.showToast({ title: '定位失败，请授权位置', icon: 'none' });
    });
  },

  /* ═══════════════════════════════════════
     地图交互
     ═══════════════════════════════════════ */
  onMarkerTap(e) {
    var markerId = e.detail.markerId;
    // 市场标记(ID=10000)被点击 — 不做导航
    if (markerId === 10000) return;
    // 店铺标记(ID=20000+i)被点击 → 导航到店铺详情
    var shopIndex = markerId - 20000;
    var shop = this.data.shops[shopIndex];
    if (shop) {
      wx.navigateTo({
        url: '/pages/shop-detail/shop-detail?shopId=' + encodeURIComponent(shop.id) +
             '&shopName=' + encodeURIComponent(shop.name),
      });
    }
  },

  /** 收起/展开地图 */
  onToggleMap() {
    this.setData({ mapCollapsed: true, showSearchBar: true });
  },

  onExpandMap() {
    this.setData({ mapCollapsed: false, showSearchBar: false, keyword: '' });
  },

  /* ═══════════════════════════════════════
     搜索
     ═══════════════════════════════════════ */
  onSearchFocus() {
    this.setData({ showSearchBar: true });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearchConfirm(e) {
    var kw = (e.detail.value || '').trim();
    if (!kw) return;
    // 按名称搜索商品
    var filtered = this.data.allGoods.filter(function (g) {
      return g.name.indexOf(kw) >= 0 || g.shopName.indexOf(kw) >= 0 || g.cate.indexOf(kw) >= 0;
    });
    this.setData({
      goodsList: filtered,
      hasMore: false,
      keyword: kw,
    });
  },

  onClearSearch() {
    this.setData({ keyword: '' });
    this._filterAndSortGoods();
  },

  /* ═══════════════════════════════════════
     分类 & 排序
     ═══════════════════════════════════════ */
  onCateChange(e) {
    var cate = e.currentTarget.dataset.cate;
    this.setData({ currentCate: cate });
    this._filterAndSortGoods();
  },

  onSortChange(e) {
    var sort = e.currentTarget.dataset.sort;
    this.setData({ sortBy: sort });
    this._filterAndSortGoods();
  },

  _filterAndSortGoods() {
    var list = this.data.allGoods.slice();
    var cate = this.data.currentCate;
    var sort = this.data.sortBy;

    // 分类过滤
    if (cate) {
      list = list.filter(function (g) { return g.cate === cate; });
    }

    // 排序
    if (sort === 'new') {
      list = list.filter(function (g) { return g.isNew; });
    } else if (sort === 'price_asc') {
      list.sort(function (a, b) { return a.price - b.price; });
    } else if (sort === 'price_desc') {
      list.sort(function (a, b) { return b.price - a.price; });
    } else {
      // hot
      list.sort(function (a, b) { return b.sales - a.sales; });
    }

    this.setData({
      goodsList: list,
      hasMore: list.length > this.data.pageSize,
      currentPage: 1,
    });
  },

  /* ═══════════════════════════════════════
     加载更多
     ═══════════════════════════════════════ */
  onLoadMore() {
    if (!this.data.hasMore) return;
    // Mock 环境：简单分页
    var total = this.data.allGoods.length;
    var current = this.data.goodsList.length;
    if (current >= total) {
      this.setData({ hasMore: false });
      return;
    }
    // 实际场景中这里会发请求加载下一页
    this.setData({ hasMore: false }); // mock: 无更多
  },

  /* ═══════════════════════════════════════
     商品点击
     ═══════════════════════════════════════ */
  onGoodsTap(e) {
    var d = e.currentTarget.dataset;
    var params = [
      'id=' + encodeURIComponent(d.id),
      'name=' + encodeURIComponent(d.name),
      'price=' + d.price,
      'spec=' + encodeURIComponent(d.spec || ''),
      'shopName=' + encodeURIComponent(d.shop || ''),
    ];
    wx.navigateTo({ url: '/pages/product-detail/product-detail?' + params.join('&') });
  },

  onQuickAddCart(e) {
    var id = e.currentTarget.dataset.id;
    var goods = null;
    var list = this.data.goodsList;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { goods = list[i]; break; }
    }
    if (!goods) return;

    try {
      var cart = wx.getStorageSync('cart') || [];
    } catch (err) {
      cart = [];
    }

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

    if (idx >= 0) { cart[idx] = item; }
    else { cart.push(item); }

    wx.setStorageSync('cart', cart);

    try {
      if (cart.length > 0) {
        wx.setTabBarBadge({ index: 3, text: String(cart.length) });
      } else {
        wx.removeTabBarBadge({ index: 3 });
      }
    } catch (e) {}

    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1200 });
  },

  /* ═══════════════════════════════════════
     导航
     ═══════════════════════════════════════ */
  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onShareAppMessage() {
    var m = this.data.market;
    return {
      title: (m.name || '建材市场') + ' — 买建材，先领航',
      path: '/pages/market-detail/market-detail?marketId=' + this.data.marketId,
    };
  },
});
