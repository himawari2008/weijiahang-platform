const app = getApp();

Page({
  data: {
    activeTab: 'unused',  // unused / used / expired
    coupons: [],
    loading: false,
    isEmpty: false,
  },

  onLoad() {
    this.loadCoupons();
  },

  onShow() {
    this.loadCoupons();
  },

  loadCoupons() {
    this.setData({ loading: true });
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${app.globalData.apiBase}/users/coupons?status=${this.data.activeTab}`,
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + (token || '') },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          const coupons = this.processCoupons(res.data.data || []);
          this.setData({ coupons, isEmpty: coupons.length === 0, loading: false });
          return;
        }
        this.loadLocalCoupons();
      },
      fail: () => {
        this.loadLocalCoupons();
      },
    });
  },

  processCoupons(list) {
    return list.map((c) => ({
      id: c.id,
      name: c.name || c.title || '优惠券',
      amount: c.amount || c.value || 0,
      minAmount: c.minAmount || c.minOrder || 0,
      type: c.type || '满减券',
      validFrom: c.validFrom || c.startTime || '',
      validTo: c.validTo || c.endTime || '',
      status: c.status || 'unused',
      shopName: c.shopName || '',
      shopId: c.shopId || '',
      desc: c.desc || c.description || '',
    }));
  },

  loadLocalCoupons() {
    // 本地模拟优惠券
    const mockCoupons = {
      unused: [
        { id: 1, name: '新人专享券', amount: 50, minAmount: 200, type: '满减券', validFrom: '2026-06-01', validTo: '2026-07-01', desc: '新用户首单满200减50' },
        { id: 2, name: '瓷砖品类券', amount: 100, minAmount: 500, type: '品类券', validFrom: '2026-06-15', validTo: '2026-06-30', desc: '瓷砖品类满500减100', shopName: '老李瓷砖批发' },
      ],
      used: [
        { id: 3, name: '618大促券', amount: 200, minAmount: 1000, type: '满减券', validFrom: '2026-06-15', validTo: '2026-06-20', desc: '618建材大促', status: 'used' },
      ],
      expired: [
        { id: 4, name: '五一特惠券', amount: 30, minAmount: 100, type: '满减券', validFrom: '2026-05-01', validTo: '2026-05-07', desc: '五一建材特惠', status: 'expired' },
      ],
    };

    const coupons = this.processCoupons(mockCoupons[this.data.activeTab] || []);
    this.setData({ coupons, isEmpty: coupons.length === 0, loading: false });
  },

  onTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    this.loadCoupons();
  },

  /** 使用优惠券 */
  onUseCoupon(e) {
    const { id, amount, minamount } = e.currentTarget.dataset;
    wx.showModal({
      title: '使用优惠券',
      content: `满${minamount}元可用，去挑好建材吧！`,
      confirmText: '去逛逛',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/index/index' });
        }
      },
    });
  },
});
