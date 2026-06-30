var app = getApp();

Page({
  data: {
    // 市场
    markets: [], marketNames: [], marketIndex: -1, selectedMarket: null,
    // 集货
    shopCount: 0,
    // 时间
    today: '', appointDate: '', appointTime: '',
    // 服务类型
    serviceType: '',
    // 店铺
    selectedShops: [],
    // 备注
    desc: '',
    // 费用
    servicePrice: 0,
    platformFee: 0,
    navigatorIncome: 0,
    totalPrice: 0,
  },

  onLoad(options) {
    // 设置今天日期
    var now = new Date();
    var y = now.getFullYear();
    var m = ('0' + (now.getMonth() + 1)).slice(-2);
    var d = ('0' + now.getDate()).slice(-2);
    this.setData({ today: y + '-' + m + '-' + d });

    if (options.shopId) {
      this.setData({ selectedShops: [{ id: options.shopId, name: options.shopName }] });
    }
    // 从购物车集货入口进来
    if (options.serviceType === 'consolidate') {
      this.setData({ serviceType: 'consolidate' });
      this.recalc();
    }
    if (options.shopCount) {
      this.setData({ shopCount: parseInt(options.shopCount) || 0 });
    }
    this.loadMarkets();
  },

  loadMarkets() {
    var that = this;
    var api = require('../../utils/api.js');
    api.getMarkets().then(function (list) {
      var markets = (list || []).map(function (m) {
        return { id: m.id, name: m.name };
      });
      that.setData({
        markets: markets,
        marketNames: markets.map(function(m) { return m.name; }),
        navCount: 12,
      });
      if (markets.length > 0) {
        that.setData({ marketIndex: 0, selectedMarket: markets[0] });
        that.runMatching();
      }
    }).catch(function () {
      wx.showToast({ title: '市场加载失败', icon: 'none' });
    });
  },

  runMatching() {
    var that = this;
    that.setData({ matching: true, bestMatch: null });
    // 模拟匹配延迟
    setTimeout(function() {
      that.setData({
        matching: false,
        bestMatch: {
          id: 'n1', name: '张建国', avatar: '', rating: 4.9, exp: 8, orders: 128,
          skills: ['瓷砖', '石材', '砍价'],
          distance: '120m',
          matchReasons: ['距离最近(180m)', '品类高度匹配', '评分最高(4.9)', '当前空闲'],
        },
      });
    }, 800);
  },

  onMarketChange(e) {
    var i = parseInt(e.detail.value);
    this.setData({ marketIndex: i, selectedMarket: this.data.markets[i] });
    this.runMatching();
  },

  // === 时间选择 ===
  onDateChange(e) {
    this.setData({ appointDate: e.detail.value });
  },
  onTimeChange(e) {
    this.setData({ appointTime: e.detail.value });
  },
  onQuickTime(e) {
    this.setData({ appointTime: e.currentTarget.dataset.t });
  },

  onServiceTap(e) {
    this.setData({ serviceType: e.currentTarget.dataset.type });
    this.recalc();
  },

  onAddShop() { wx.navigateTo({ url: '/pages/map/map?focus=search' }); },
  onRemoveShop(e) {
    var id = e.currentTarget.dataset.id;
    var shops = this.data.selectedShops.filter(function(s) { return s.id !== id; });
    this.setData({ selectedShops: shops });
  },
  onDesc(e) { this.setData({ desc: e.detail.value }); },

  recalc() {
    var serviceType = this.data.serviceType;
    var priceMap = { accompany: 88, delivery: 49, urgent: 29, consolidate: 68 };
    var servicePrice = priceMap[serviceType] || 0;
    var platformFee = Math.round(servicePrice * 0.2);
    var navigatorIncome = servicePrice - platformFee;
    this.setData({
      servicePrice: servicePrice,
      platformFee: platformFee,
      navigatorIncome: navigatorIncome,
      totalPrice: servicePrice,
    });
  },

  onSubmit() {
    if (!this.data.serviceType) { wx.showToast({ title: '请选择服务内容', icon: 'none' }); return; }
    if (!this.data.appointDate || !this.data.appointTime) { wx.showToast({ title: '请选择预约时间', icon: 'none' }); return; }

    var order = {
      marketId: this.data.selectedMarket ? this.data.selectedMarket.id : '',
      marketName: this.data.selectedMarket ? this.data.selectedMarket.name : '',
      serviceType: this.data.serviceType,
      appointDate: this.data.appointDate,
      appointTime: this.data.appointTime,
      shops: this.data.selectedShops,
      desc: this.data.desc,
      price: this.data.totalPrice,
    };

    console.log('提交订单', order);
    wx.showToast({ title: '订单已发布，等待领航员接单', icon: 'success', duration: 2000 });
    setTimeout(function() { wx.switchTab({ url: '/pages/orders/orders' }); }, 2000);
  },
});
