/**
 * 为家航 · 首次引导页
 * 仅在安装后第一次打开时出现
 */
Page({
  data: {
    current: 0,
  },

  onSwipeChange(e) {
    this.setData({ current: e.detail.current });
  },

  onNext() {
    var next = this.data.current + 1;
    if (next < 3) {
      this.setData({ current: next });
    }
  },

  onSkip() {
    this.finish();
  },

  onStart() {
    this.finish();
  },

  finish() {
    // 标记已看过引导
    wx.setStorageSync('has_onboarded_v1', true);
    // 跳转到首页
    wx.switchTab({ url: '/pages/index/index' });
  },
});
