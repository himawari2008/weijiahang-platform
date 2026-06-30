const app = getApp();

Page({
  data: {
    addresses: [],
    selectMode: false,    // true = 从结算页进来，选完返回
  },

  onLoad(options) {
    if (options.selectMode === '1') {
      this.setData({ selectMode: true });
    }
  },

  onShow() {
    this._reload();
  },

  _reload() {
    try {
      var addresses = wx.getStorageSync('addresses') || [];
    } catch (e) {
      addresses = [];
    }
    this.setData({ addresses: addresses });
  },

  /** 点击地址项 */
  onTapItem(e) {
    var addr = e.currentTarget.dataset.addr;
    if (this.data.selectMode) {
      // 选择模式：存入 globalData 并返回
      app.globalData.selectedAddress = addr;
      wx.navigateBack();
    } else {
      // 管理模式：进入编辑
      wx.navigateTo({ url: '/pages/address-edit/address-edit?id=' + addr.id });
    }
  },

  /** 新增地址 */
  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },
});
