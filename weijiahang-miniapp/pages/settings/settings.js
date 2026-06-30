const app = getApp();

Page({
  data: {
    notificationEnabled: true,
    soundEnabled: true,
    vibrateEnabled: true,
    cacheSize: '0MB',
  },

  onLoad() {
    // 加载设置
    const settings = wx.getStorageSync('settings') || {};
    this.setData({
      notificationEnabled: settings.notificationEnabled !== false,
      soundEnabled: settings.soundEnabled !== false,
      vibrateEnabled: settings.vibrateEnabled !== false,
    });
    this.calcCacheSize();
  },

  /** 开关通知 */
  onToggleNotification(e) {
    this.setData({ notificationEnabled: e.detail.value });
    this.saveSettings();
  },

  /** 开关声音 */
  onToggleSound(e) {
    this.setData({ soundEnabled: e.detail.value });
    this.saveSettings();
  },

  /** 开关震动 */
  onToggleVibrate(e) {
    this.setData({ vibrateEnabled: e.detail.value });
    this.saveSettings();
  },

  saveSettings() {
    wx.setStorageSync('settings', {
      notificationEnabled: this.data.notificationEnabled,
      soundEnabled: this.data.soundEnabled,
      vibrateEnabled: this.data.vibrateEnabled,
    });
  },

  /** 清除缓存 */
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除图片缓存和临时数据，不会删除你的订单和收藏。',
      confirmText: '确定清除',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中…' });
          // 清除本地存储的非关键数据
          try {
            const keys = ['ai_chat_history', 'browseHistory', 'cart'];
            keys.forEach((k) => wx.removeStorageSync(k));
          } catch (e) {}
          setTimeout(() => {
            wx.hideLoading();
            this.calcCacheSize();
            wx.showToast({ title: '缓存已清除', icon: 'success' });
          }, 800);
        }
      },
    });
  },

  calcCacheSize() {
    // 微信小程序无法直接获取缓存大小，模拟显示
    try {
      const info = wx.getStorageInfoSync();
      const kb = info.currentSize || 0;
      this.setData({ cacheSize: kb > 1024 ? (kb / 1024).toFixed(1) + 'MB' : kb + 'KB' });
    } catch (e) {
      this.setData({ cacheSize: '未知' });
    }
  },

  /** 隐私政策 */
  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  /** 用户协议 */
  onAgreement() {
    wx.navigateTo({ url: '/pages/privacy/privacy?type=agreement' });
  },

  /** 关于 */
  onAbout() {
    wx.showModal({
      title: '为家航',
      content: '为家领航\n买建材，先领航\n\n线下建材市场O2O智能导航平台\nAI材料计算 + 领航员代看验货\n\nVersion 1.0.0',
      showCancel: false,
      confirmText: '我知道了',
    });
  },

  /** 退出登录 */
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录，确定退出吗？',
      confirmText: '退出',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          app.globalData.userInfo = null;
          wx.reLaunch({ url: '/pages/index/index' });
        }
      },
    });
  },
});
