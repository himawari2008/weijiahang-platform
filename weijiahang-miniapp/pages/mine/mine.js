const app = getApp();

Page({
  data: {
    user: {}, isLogin: false,
    pendingCount: 0,
    cartCount: 0,
    historyCount: 0,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    var user = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (user) {
      // 种子积分/VIP数据（首次）
      if (!user.points) {
        user.points = Math.floor(Math.random() * 80 + 20);
        user.vipLevel = user.points >= 500 ? 3 : user.points >= 200 ? 2 : user.points >= 50 ? 1 : 0;
        user.vipProgress = Math.min(100, Math.floor((user.points % 200) / 200 * 100));
        user.vipNeed = 200 - (user.points % 200);
        wx.setStorageSync('userInfo', user);
      }
      this.setData({ user: user, isLogin: true });
    }

    // 购物车计数
    try {
      var cart = wx.getStorageSync('cart') || [];
      this.setData({ cartCount: cart.length });
    } catch (e) {
      this.setData({ cartCount: 0 });
    }

    // 待接单计数（mock）
    this.setData({ pendingCount: 0 });

    // 浏览历史计数
    try {
      var history = wx.getStorageSync('browseHistory') || [];
      this.setData({ historyCount: history.length });
    } catch(e) {
      this.setData({ historyCount: 0 });
    }
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },

  onLogin() {
    app.wxLogin().then(function(user) {
      this.setData({ user: user, isLogin: true });
    }.bind(this));
  },

  onOrderTab(e) {
    var status = e.currentTarget.dataset.status;
    app.globalData.orderFilter = status;
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  onAllOrders() {
    app.globalData.orderFilter = '';
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  onAddressList() {
    wx.navigateTo({ url: '/pages/address-list/address-list' });
  },

  onGoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  onMyFavorites() { wx.navigateTo({ url: '/pages/favorites/favorites' }); },

  onMaterialList() {
    var list = wx.getStorageSync('material_list');
    if (list) {
      wx.navigateTo({ url: '/pages/ai-calc/ai-calc' });
    } else {
      wx.showToast({ title: '暂无材料清单，先去AI算一算', icon: 'none' });
    }
  },

  onFeedback() { wx.navigateTo({ url: '/pages/feedback/feedback' }); },
  onService() { wx.navigateTo({ url: '/pages/service/service' }); },

  onBrowseHistory() {
    var history = wx.getStorageSync('browseHistory') || [];
    if (history.length === 0) {
      wx.showToast({ title: '暂无浏览记录', icon: 'none' });
    } else {
      wx.showToast({ title: '共' + history.length + '条浏览记录', icon: 'none' });
    }
  },

  onCoupons() {
    wx.navigateTo({ url: '/pages/coupons/coupons' });
  },

  onSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onAbout() {
    wx.showModal({
      title: '为家航',
      content: '为家领航\n买建材，先领航\n\n线下市场导航 + AI材料计算 + 领航员代看验货\n\nVersion 1.0',
      showCancel: false,
      confirmText: '我知道了',
    });
  },

  /* ── 签到领积分 ── */
  onDailyCheckin() {
    var today = new Date().toDateString();
    var lastCheckin = wx.getStorageSync('last_checkin_date');
    if (lastCheckin === today) {
      wx.showToast({ title: '今日已签到', icon: 'none' });
      return;
    }
    // 模拟积分增加
    var user = this.data.user;
    var earnedPoints = Math.floor(Math.random() * 10 + 5);
    user.points = (user.points || 0) + earnedPoints;
    user.vipLevel = user.points >= 500 ? 3 : user.points >= 200 ? 2 : user.points >= 50 ? 1 : 0;
    user.vipProgress = Math.min(100, ((user.points % 200) / 200 * 100).toFixed(0));
    user.vipNeed = 200 - (user.points % 200);
    wx.setStorageSync('userInfo', user);
    wx.setStorageSync('last_checkin_date', today);
    this.setData({ user: user });
    wx.showToast({ title: '+'+earnedPoints+' 领航积分', icon: 'none' });
  },

  /* ── 邀请有礼 ── */
  onInviteFriends() {
    wx.showModal({
      title: '邀请有礼',
      content: '每邀请1位好友注册，双方各得50领航积分！\n\n积分可兑换运费券、验货服务等',
      confirmText: '立即邀请',
      success: function(res) {
        if (res.confirm) {
          wx.showToast({ title: '分享功能开发中', icon: 'none' });
        }
      }
    });
  },
});
