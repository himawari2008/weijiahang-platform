var app = getApp();
var api = require('../../utils/api');

Page({
  data: {
    navInfo: null,
    isOnline: false,
    balance: 0,
    todayEarn: 0,
    balanceText: '0.00',
    todayEarnText: '0',

    menuGroups: [
      {
        title: '服务设置',
        items: [
          { id: 'listenPref', icon: 'ear', label: '听单偏好', value: '接单条件设置' },
          { id: 'markets', icon: 'location', label: '常驻市场', value: '大明宫建材市场' },
          { id: 'skills', icon: 'skill', label: '擅长品类', value: '瓷砖、地板、卫浴' },
          { id: 'vehicle', icon: 'car', label: '交通工具', value: '面包车' },
          { id: 'online', icon: 'switch', label: '接单开关', isSwitch: true },
        ],
      },
      {
        title: '成长体系',
        items: [
          { id: 'monthly', icon: 'report', label: '月度成绩单', value: '' },
          { id: 'tier', icon: 'tier', label: '等级权益', value: '白银领航员' },
          { id: 'badges', icon: 'medal', label: '勋章墙', value: '已获3枚' },
          { id: 'leaderboard', icon: 'rank', label: '排行榜', value: '第12名' },
        ],
      },
      {
        title: '工具资料',
        items: [
          { id: 'training', icon: 'study', label: '培训中心' },
          { id: 'priceref', icon: 'price', label: '材料价格参考' },
          { id: 'marketmap', icon: 'map', label: '市场地图' },
          { id: 'guide', icon: 'book', label: '领航员指南' },
          { id: 'stats', icon: 'chart', label: '数据统计' },
        ],
      },
      {
        title: '账户安全',
        items: [
          { id: 'verify', icon: 'badge', label: '认证中心' },
          { id: 'payment', icon: 'wallet', label: '收款方式' },
          { id: 'dispute', icon: 'shield', label: '申诉中心' },
        ],
      },
      {
        title: '其他',
        items: [
          { id: 'notify', icon: 'bell', label: '通知设置' },
          { id: 'feedback', icon: 'feedback', label: '帮助反馈' },
          { id: 'privacy', icon: 'lock', label: '隐私协议' },
          { id: 'about', icon: 'info', label: '关于为家航' },
        ],
      },
    ],
  },

  /** 格式化金额字段（WXML不能用.toFixed()/.slice()） */
  _updateDisplay: function () {
    var bal = this.data.balance || 0;
    var today = this.data.todayEarn || 0;
    var navInfo = this.data.navInfo;
    var nameInitial = '领';
    if (navInfo && navInfo.name) {
      nameInitial = navInfo.name.charAt(0);
    }
    this.setData({
      balanceText: bal.toFixed(2),
      todayEarnText: today.toFixed(0),
    });
    if (navInfo) {
      navInfo.nameInitial = nameInitial;
      this.setData({ navInfo: navInfo });
    }
  },

  onLoad: function () {
    this.loadProfile();
  },

  onShow: function () {
    this.loadProfile(true);
  },

  loadProfile: function (silent) {
    var that = this;
    api.getProfile({ showError: !silent }).then(function (d) {
      that.setData({
        navInfo: d.navInfo || null,
        isOnline: d.isOnline || false,
        balance: d.balance || 0,
        todayEarn: d.todayEarn || 0,
      });
      that._updateDisplay();
      app.globalData.navInfo = d.navInfo;
      app.globalData.isOnline = d.isOnline;
    }).catch(function () {
      if (!silent) {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
      }
    });
  },

  onToggleOnline: function () {
    var that = this;
    var newState = !this.data.isOnline;
    api.toggleOnline(newState).then(function () {
      that.setData({ isOnline: newState });
      app.globalData.isOnline = newState;
      wx.showToast({
        title: newState ? '已开启接单' : '已关闭接单',
        icon: 'success',
      });
    }).catch(function () {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  onMenuTap: function (e) {
    var id = e.currentTarget.dataset.id;
    switch (id) {
      case 'markets': this.onMarkets(); break;
      case 'skills': this.onSkills(); break;
      case 'vehicle': this.onVehicle(); break;
      case 'guide': this.onGuide(); break;
      case 'priceref': this.onPriceRef(); break;
      case 'marketmap': wx.navigateTo({ url: '/pages/market-map/market-map' }); break;
      case 'verify': this.onVerify(); break;
      case 'payment': this.onPayment(); break;
      case 'dispute': this.onDispute(); break;
      case 'notify': wx.navigateTo({ url: '/pages/notification/notification' }); break;
      case 'feedback': wx.navigateTo({ url: '/pages/help-feedback/help-feedback' }); break;
      case 'privacy': wx.navigateTo({ url: '/pages/privacy/privacy' }); break;
      case 'about': this.onAbout(); break;
      case 'listenPref': wx.navigateTo({ url: '/pages/listen-preferences/listen-preferences' }); break;
      case 'monthly': wx.navigateTo({ url: '/pages/monthly-report/monthly-report' }); break;
      case 'tier': wx.navigateTo({ url: '/pages/tier-benefits/tier-benefits' }); break;
      case 'badges': wx.navigateTo({ url: '/pages/badges/badges' }); break;
      case 'leaderboard': wx.navigateTo({ url: '/pages/leaderboard/leaderboard' }); break;
      case 'training': wx.navigateTo({ url: '/pages/training/training' }); break;
      case 'stats': wx.navigateTo({ url: '/pages/data-stats/data-stats' }); break;
      default: wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  onMarkets: function () {
    var that = this;
    // API优先获取市场列表
    api.getMarkets().then(function (list) {
      var names = [];
      for (var i = 0; i < list.length; i++) { names.push(list[i].name); }
      if (names.length === 0) {
        wx.showToast({ title: '暂无市场数据', icon: 'none' });
        return;
      }
      that._showMarketPicker(names);
    }).catch(function () {
      wx.showToast({ title: '市场加载失败', icon: 'none' });
    });
  },

  _showMarketPicker: function (marketNames) {
    var that = this;
    wx.showActionSheet({
      itemList: marketNames,
      success: function (res) {
        var selected = marketNames[res.tapIndex];
        var menuGroups = that.data.menuGroups;
        for (var i = 0; i < menuGroups.length; i++) {
          var items = menuGroups[i].items;
          for (var j = 0; j < items.length; j++) {
            if (items[j].id === 'markets') {
              items[j].value = selected;
              break;
            }
          }
        }
        that.setData({ menuGroups: menuGroups });
        wx.showToast({ title: '已更新常驻市场', icon: 'success' });
      },
    });
  },

  onSkills: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['瓷砖', '地板', '卫浴', '涂料', '石材', '辅材', '砍价', '验货'],
      success: function (res) {
        var skills = ['瓷砖', '地板', '卫浴', '涂料', '石材', '辅材', '砍价', '验货'];
        var selected = skills[res.tapIndex];
        var menuGroups = that.data.menuGroups;
        for (var i = 0; i < menuGroups.length; i++) {
          var items = menuGroups[i].items;
          for (var j = 0; j < items.length; j++) {
            if (items[j].id === 'skills') {
              items[j].value = selected;
              break;
            }
          }
        }
        that.setData({ menuGroups: menuGroups });
        wx.showToast({ title: '已更新擅长品类', icon: 'success' });
      },
    });
  },

  onVehicle: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['我有面包车/货车', '我没有车'],
      success: function (res) {
        var vals = ['面包车', '步行/公交'];
        var menuGroups = that.data.menuGroups;
        for (var i = 0; i < menuGroups.length; i++) {
          var items = menuGroups[i].items;
          for (var j = 0; j < items.length; j++) {
            if (items[j].id === 'vehicle') {
              items[j].value = vals[res.tapIndex];
              break;
            }
          }
        }
        that.setData({ menuGroups: menuGroups });
        wx.showToast({ title: '已更新', icon: 'success' });
      },
    });
  },

  onGuide: function () {
    wx.showModal({
      title: '领航员指南',
      content: '你不是骑手，也不是导购。\n\n你是业主在建材市场里的替身。\n\n业主不在市场，你替他去。\n他看不到实物，你视频直播。\n他看不出好坏，你帮他摸、敲、看。\n他不会砍价，你用本地话帮他谈。\n\n平台保障是"买错了能退"，\n你是"一次就买对，根本不用退"。\n\n装修最怕的不是买错——\n是买错耽误工期。\n你帮业主省的不是验货费，\n是瓦工等瓷砖的那两天、\n是木工等地板的那三天、\n是整个工期拖延的损失。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onPriceRef: function () {
    wx.showModal({
      title: '材料价格参考',
      content: '瓷砖：60-300元/㎡\n地板：80-250元/㎡\n卫浴：500-5000元/套\n涂料：150-800元/桶\n辅材：20-100元/袋\n\n以上为西安大明宫市场参考价',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onVerify: function () {
    wx.showModal({
      title: '认证中心',
      content: '身份认证：已完成\n市场知识考核：已通过（92分）\n实地测试：已通过\n\n所有认证已完成，可正常接单',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onPayment: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['微信零钱', '支付宝', '添加银行卡'],
      success: function (res) {
        var paymentMethods = ['微信零钱', '支付宝', '银行卡'];
        wx.showToast({ title: '已设置' + paymentMethods[res.tapIndex], icon: 'success' });
      },
    });
  },

  onDispute: function () {
    wx.showModal({
      title: '申诉中心',
      content: '暂无申诉记录\n\n如遇客户投诉或平台处罚，可在此申诉。\n平台将在1个工作日内处理。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onAbout: function () {
    wx.showModal({
      title: '关于为家航',
      content: '为家航领航员 V1.0\n\n为家航 — 为家领航\n\n线下建材市场O2O智能导航平台。\n你不是骑手，你是市场里最懂行的人。\n平台不抽交易一分钱，你的收入你做主。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onLogout: function () {
    wx.showModal({
      title: '退出登录',
      content: '退出后无法接单和收到通知',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('nav_token');
          wx.removeStorageSync('nav_info');
          app.globalData.token = null;
          app.globalData.navInfo = null;
          app.globalData.isOnline = false;
          wx.reLaunch({ url: '/pages/index/index' });
        }
      },
    });
  },
});
