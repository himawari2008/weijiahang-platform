/**
 * 为家航 · 市场导航页
 * 设计参考：高德全屏地图 + 美团底部抽屉 + 滴滴定位
 *
 * 两种模式：
 *   marketId → 展示单个市场，地图居中该市场 + 底部抽屉列店铺
 *   无 marketId → 展示附近所有市场标记 + 抽屉列市场/店铺
 */

var app = getApp();
var api = require('../../utils/api.js');

/* ═══ 默认地图中心（西安） ═══ */
var DEFAULT_CENTER = { lat: 34.2990, lng: 108.9470 };

Page({
  data: {
    /* ── 地图状态 ── */
    mapCenter: DEFAULT_CENTER,
    mapScale: 15,
    markers: [],
    circles: [],

    /* ── 市场数据 ── */
    marketId: 0,
    activeMarket: null,
    allMarkets: [],
    currentMarketId: 0,

    /* ── 楼层 ── */
    floors: [],
    currentFloor: 0,       // 0=全部楼层

    /* ── 店铺 ── */
    allShops: [],
    shops: [],             // 当前楼层过滤后的店铺
    selectedShopId: '',

    /* ── 精选好货（单市场模式） ── */
    marketGoods: [],

    /* ── 搜索 ── */
    showSearch: false,
    keyword: '',
    searchResults: [],

    /* ── 抽屉 ── */
    drawerExpanded: false,
  },

  /* ═══════════════════════════════════════
     Lifecycle
     ═══════════════════════════════════════ */

  onLoad(options) {
    var that = this;
    var marketId = options.marketId || '';  // API UUID 或 mock 数字ID

    this.setData({ marketId: marketId, currentMarketId: marketId });

    // API优先：获取市场列表
    var city = app.getCurrentCity();
    if (city === '定位中…') city = '西安';

    api.get('/markets', { city: city }, true).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      if (list.length > 0) {
        // 转换坐标字段 lat/lng → latitude/longitude（API用longitude/latitude）
        list = list.map(function (m) {
          return {
            id: m.id, name: m.name, city: m.city, district: m.district,
            lat: m.latitude, lng: m.longitude,
            floors: m.floors || [], shopCount: m.shopCount || 0,
            address: m.address, bgColor: '#EBF5FF',
          };
        });
        that.setData({ allMarkets: list });
        if (marketId) {
          that._loadSingleMarketFromAPI(marketId, list);
        } else {
          that._loadAllMarketsFromAPI(list);
        }
        that._initUserLocation();
        return;
      }
      throw new Error('空数据');
    }).catch(function () {
      // API不可用，显示空状态
      that.setData({ allMarkets: [], marketId: '', currentMarketId: '' });
      wx.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    });
  },

  onReady() {
    // 创建地图上下文
    this.mapCtx = wx.createMapContext('navMap');
  },

  onShow() {
    // 每次回到此页，刷新购物车
    this._updateCartBadge();
  },

  /* ═══════════════════════════════════════
     数据加载
     ═══════════════════════════════════════ */

  /** 模式A：API加载单个市场 */
  _loadSingleMarketFromAPI(marketId, allMarkets) {
    var that = this;
    // 在allMarkets中查找匹配的市场
    var market = null;
    for (var i = 0; i < allMarkets.length; i++) {
      if (allMarkets[i].id === marketId) { market = allMarkets[i]; break; }
    }
    if (!market) { market = allMarkets[0]; }

    // 加载店铺
    api.get('/markets/' + marketId + '/shops', {}, true).then(function (shops) {
      var list = Array.isArray(shops) ? shops : (shops.list || shops.items || []);
      list = list.map(function (s) {
        return {
          id: s.id, name: s.name, addr: s.address || '', floor: s.floor || 1,
          rating: s.rating || 4.5, tags: s.tags || [], bgColor: '#EBF5FF',
        };
      });
      that.setData({ allShops: list, shops: list });
      that._renderMarkers(market, list);
    }).catch(function () {
      that.setData({ allShops: [], shops: [] });
      that._renderMarkers(market, []);
    });

    // 加载好货
    api.searchProducts({ marketId: marketId, sort: 'sales', limit: 6 }).then(function (res) {
      var goods = Array.isArray(res) ? res : (res.list || res.items || []);
      that.setData({ marketGoods: goods });
    }).catch(function () {});

    this.setData({
      activeMarket: market,
      floors: market.floors || [],
      currentFloor: 0,
      mapCenter: { lat: market.lat, lng: market.lng },
      mapScale: 16,
    });

    this._renderCircles(market);
  },

  /** 模式B：加载所有市场（从API数据渲染） */
  _loadAllMarkets(allMarkets) {
    var firstMarket = allMarkets[0];

    this.setData({
      activeMarket: null,
      allMarkets: allMarkets,
      currentMarketId: firstMarket ? firstMarket.id : '',
      floors: firstMarket ? (firstMarket.floors || []) : [],
      currentFloor: 0,
      allShops: [],
      shops: [],
    });

    this._renderAllMarketMarkers(allMarkets);
  },

  /** 模式B：API加载所有市场 */
  _loadAllMarketsFromAPI(allMarkets) {
    var firstMarket = allMarkets[0];
    var that = this;

    this.setData({
      activeMarket: null,
      currentMarketId: firstMarket ? firstMarket.id : '',
      floors: firstMarket ? (firstMarket.floors || []) : [],
      currentFloor: 0,
    });

    // 加载第一个市场的店铺
    if (firstMarket) {
      api.get('/markets/' + firstMarket.id + '/shops', {}, true).then(function (shops) {
        var list = Array.isArray(shops) ? shops : (shops.list || shops.items || []);
        list = list.map(function (s) {
          return { id: s.id, name: s.name, addr: s.address || '', floor: s.floor || 1, rating: s.rating || 4.5, tags: s.tags || [], bgColor: '#EBF5FF' };
        });
        that.setData({ allShops: list, shops: list });
      }).catch(function () {
        that.setData({ allShops: [], shops: [] });
      });
    }

    this._renderAllMarketMarkers(allMarkets);
  },

  /** 切换市场（支持Mock数字ID和API UUID） */
  onSwitchMarket(e) {
    var id = e.currentTarget.dataset.id;
    var allMarkets = this.data.allMarkets;

    // 在allMarkets中查找市场
    var market = null;
    for (var i = 0; i < allMarkets.length; i++) {
      if (String(allMarkets[i].id) === String(id)) { market = allMarkets[i]; break; }
    }
    if (!market) return;

    // 加载该市场的店铺
    var that = this;
    api.get('/markets/' + market.id + '/shops', {}, true).then(function (shops) {
      var list = Array.isArray(shops) ? shops : (shops.list || shops.items || []);
      list = list.map(function (s) {
        return { id: s.id, name: s.name, addr: s.address || '', floor: s.floor || 1, rating: s.rating || 4.5, tags: s.tags || [], bgColor: '#EBF5FF' };
      });
      that.setData({ allShops: list, shops: list });
      that._renderMarkers(market, list);
    }).catch(function () {
      // API不可用
      that.setData({ allShops: [], shops: [] });
      wx.showToast({ title: '店铺加载失败', icon: 'none' });
    });

    this.setData({
      currentMarketId: market.id,
      activeMarket: market,
      floors: market.floors || [],
      currentFloor: 0,
    });

    // 飞行到新市场
    if (this.mapCtx) {
      this.mapCtx.moveToLocation({
        latitude: market.lat,
        longitude: market.lng,
      });
    }
  },

  /* ═══════════════════════════════════════
     地图渲染
     ═══════════════════════════════════════ */

  /** 渲染单个市场 + 店铺 markers */
  _renderMarkers(market, shops) {
    var markers = [];

    // 市场大头针（无 iconPath 用默认红色标记）
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

    // 店铺小圆点
    for (var i = 0; i < shops.length; i++) {
      var s = shops[i];
      // 为每个店铺计算偏移位置（围绕市场散开）
      var offsetLat = (Math.cos(i * 1.2) * 0.0006);
      var offsetLng = (Math.sin(i * 1.2) * 0.0006);

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

  /** 渲染所有市场 markers（模式B） */
  _renderAllMarketMarkers(allMarkets) {
    var markers = [];
    for (var i = 0; i < allMarkets.length; i++) {
      var m = allMarkets[i];
      markers.push({
        id: 10000 + i,
        latitude: m.lat,
        longitude: m.lng,
        width: 28,
        height: 28,
        anchor: { x: 0.5, y: 1 },
        callout: {
          content: m.name,
          color: '#1A1A1A',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#ffffff',
          padding: 6,
          display: 'ALWAYS',
          textAlign: 'center',
        },
        zIndex: 8,
      });
    }

    this.setData({ markers: markers });
  },

  /** 渲染市场覆盖范围圈 */
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
        var userLoc = {
          lat: result.location.latitude,
          lng: result.location.longitude,
        };
        // 如果没指定 marketId，把地图移到用户位置
        if (!that.data.marketId) {
          that.setData({ mapCenter: userLoc, mapScale: 13 });
        }
      }
    }).catch(function () {
      // 静默失败，使用默认中心
    });
  },

  /** 点击定位按钮 — 回到用户当前位置 */
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
     地图事件
     ═══════════════════════════════════════ */

  /** 点击地图标记 */
  onMarkerTap(e) {
    var markerId = e.detail.markerId;
    var allMarkets = this.data.allMarkets;

    // 模式B：点了某个市场标记 → 切换到该市场
    if (!this.data.marketId && markerId >= 10000) {
      var idx = markerId - 10000;
      if (allMarkets[idx]) {
        this.onSwitchMarket({ currentTarget: { dataset: { id: allMarkets[idx].id } } });
      }
      return;
    }

    // 模式A：点了店铺标记(ID=20000+i) → 高亮对应店铺
    if (this.data.marketId) {
      var shopIndex = markerId - 20000;
      var shops = this.data.allShops;
      if (shopIndex >= 0 && shopIndex < shops.length) {
        this.setData({ selectedShopId: shops[shopIndex].id, drawerExpanded: true });
      }
    }
  },

  onRegionChange(e) {
    // 视野变化（可选：按视野加载周边市场）
  },

  onMapUpdated() {
    // 地图渲染完成
  },

  /* ═══════════════════════════════════════
     底部抽屉
     ═══════════════════════════════════════ */

  onExpandDrawer() {
    this.setData({ drawerExpanded: true });
  },

  onCollapseDrawer() {
    this.setData({ drawerExpanded: false, showSearch: false });
  },

  /* ═══════════════════════════════════════
     楼层切换
     ═══════════════════════════════════════ */

  onFloorChange(e) {
    var floor = parseInt(e.currentTarget.dataset.floor);
    var currentFloor = (floor === this.data.currentFloor) ? 0 : floor; // 点击同一楼层取消筛选
    this.setData({ currentFloor: currentFloor });
    this._filterShops();
  },

  _filterShops() {
    var floor = this.data.currentFloor;
    var shops = this.data.allShops;
    if (floor > 0) {
      shops = shops.filter(function (s) { return s.floor === floor; });
    }
    this.setData({ shops: shops, selectedShopId: '' });
  },

  /* ═══════════════════════════════════════
     搜索
     ═══════════════════════════════════════ */

  onToggleSearch() {
    var show = !this.data.showSearch;
    this.setData({
      showSearch: show,
      keyword: show ? '' : this.data.keyword,
      searchResults: show ? [] : this.data.searchResults,
    });
  },

  onCancelSearch() {
    this.setData({
      showSearch: false,
      keyword: '',
      searchResults: [],
    });
  },

  onSearchInput(e) {
    var kw = e.detail.value.trim();
    this.setData({ keyword: kw });

    if (kw.length >= 1) {
      var results = this.data.allShops.filter(function (s) {
        return s.name.indexOf(kw) >= 0 || s.addr.indexOf(kw) >= 0;
      });
      this.setData({ searchResults: results });
    } else {
      this.setData({ searchResults: [] });
    }
  },

  /** 选中搜索结果 */
  onSelectShop(e) {
    var shop = e.currentTarget.dataset.shop;
    this.setData({
      showSearch: false,
      keyword: '',
      searchResults: [],
      selectedShopId: shop.id,
      drawerExpanded: true,
    });

    // 切换到店铺所在楼层
    if (shop.floor) {
      this.setData({ currentFloor: shop.floor });
      this._filterShops();
    }

    // 飞行到该店铺在地图上的标记（通过shop在列表中的索引查找marker ID）
    var shops = this.data.allShops;
    for (var i = 0; i < shops.length; i++) {
      if (shops[i].id === shop.id) {
        var markerId = 20000 + i;
        var markers = this.data.markers;
        for (var j = 0; j < markers.length; j++) {
          if (markers[j].id === markerId) {
            if (this.mapCtx) {
              this.mapCtx.moveToLocation({
                latitude: markers[j].latitude,
                longitude: markers[j].longitude,
              });
            }
            break;
          }
        }
        break;
      }
    }
  },

  /* ═══════════════════════════════════════
     店铺点击 — 跳转详情
     ═══════════════════════════════════════ */

  onShopTap(e) {
    var shop = e.currentTarget.dataset.shop;
    this.setData({ selectedShopId: shop.id });

    wx.navigateTo({
      url: '/pages/shop-detail/shop-detail?shopId=' + encodeURIComponent(shop.id) +
           '&shopName=' + encodeURIComponent(shop.name),
    });
  },

  /** 点击市场信息卡 → 进入市场详情页（地图+商品流） */
  onMarketInfoTap() {
    var marketId = this.data.marketId || this.data.currentMarketId;
    if (marketId) {
      wx.navigateTo({ url: '/pages/market-detail/market-detail?marketId=' + marketId });
    }
  },

  /* ═══════════════════════════════════════
     商品点击
     ═══════════════════════════════════════ */

  /** 点击市场好货 → 跳转商品详情 */
  onMarketGoodsTap(e) {
    var id = e.currentTarget.dataset.id;
    var goods = this.data.marketGoods.find(function (g) { return g.id === id; });
    if (!goods) return;

    wx.navigateTo({
      url: '/pages/product-detail/product-detail?' +
           'id=' + encodeURIComponent(goods.id) +
           '&name=' + encodeURIComponent(goods.name) +
           '&price=' + goods.price +
           '&shopName=' + encodeURIComponent(goods.shopName),
    });
  },

  /** 查看全部好货 → 跳转商品列表页 */
  onAllGoods() {
    var marketId = this.data.marketId || this.data.currentMarketId;
    wx.navigateTo({ url: '/pages/shop-list/shop-list?marketId=' + marketId });
  },

  /* ═══════════════════════════════════════
     导航 & 工具
     ═══════════════════════════════════════ */

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  _updateCartBadge() {
    try {
      var cart = wx.getStorageSync('cart') || [];
      if (cart.length > 0) {
        wx.setTabBarBadge({ index: 3, text: String(cart.length) });
      } else {
        wx.removeTabBarBadge({ index: 3 });
      }
    } catch (e) { }
  },

  /** 分享 */
  onShareAppMessage() {
    var m = this.data.activeMarket;
    return {
      title: (m ? m.name : '为家航建材市场') + ' — 买建材，先领航',
      path: '/pages/map/map?marketId=' + (this.data.marketId || this.data.currentMarketId),
    };
  },
});
