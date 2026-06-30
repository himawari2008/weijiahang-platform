/**
 * 为家航 · 启动页
 * 首次 → 引导页 | 非首次 → 首页
 * 2 秒品牌展示
 */
Page({
  data: {
    animStarted: false,
  },

  onLoad() {
    var that = this;
    // 延迟 100ms 启动动画（等页面渲染完）
    setTimeout(function() {
      that.setData({ animStarted: true });
    }, 100);

    // 3.2 秒后跳转（等指南针旋转 + 文字动画完整播放）
    setTimeout(function() {
      that.goNext();
    }, 3200);
  },

  goNext() {
    // 判断是否首次打开
    var hasOnboarded = wx.getStorageSync('has_onboarded_v1');
    if (hasOnboarded) {
      wx.switchTab({ url: '/pages/index/index' });
    } else {
      wx.redirectTo({ url: '/pages/onboarding/onboarding' });
    }
  },
});
