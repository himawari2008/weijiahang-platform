Page({
  data: {
    shopGroups: [],
    totalEstimate: 0,
    shopCount: 0,
    itemCount: 0,
    isEmpty: true,
    allSelected: false,
    recommendGoods: [
      { id: 'r1', name: '东鹏大理石瓷砖 800x800 亮面灰', price: 128, unit: '㎡', shopId: 's1', shopName: '老李瓷砖批发', image: '' },
      { id: 'r2', name: '大自然强化复合地板 12mm防水', price: 98, unit: '㎡', shopId: 's5', shopName: '大自然地板', image: '' },
      { id: 'r3', name: '立邦净味120乳胶漆 18L白', price: 280, unit: '桶', shopId: 's6', shopName: '立邦官方授权店', image: '' },
      { id: 'r4', name: '九牧虹吸式马桶 超漩节水', price: 899, unit: '台', shopId: 's4', shopName: '九牧卫浴专卖', image: '' },
    ],
  },

  onShow() {
    this.loadCart();
  },

  loadCart() {
    try {
      var cart = wx.getStorageSync('cart') || [];
    } catch (e) {
      cart = [];
    }

    // 按店铺分组
    var groupMap = {};
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      var sid = item.shopId || 'unknown';
      if (!groupMap[sid]) {
        groupMap[sid] = { shopId: sid, shopName: item.shopName || '未知店铺', items: [], shopTotal: 0 };
      }
      groupMap[sid].items.push(item);
      groupMap[sid].shopTotal += (item.price || 0) * (item.qty || 1);
    }

    var shopGroups = [];
    var totalEstimate = 0;
    for (var key in groupMap) {
      if (groupMap.hasOwnProperty(key)) {
        shopGroups.push(groupMap[key]);
        totalEstimate += groupMap[key].shopTotal;
      }
    }

    var itemCount = cart.length;
    var shopCount = shopGroups.length;

    this.setData({
      shopGroups: shopGroups,
      totalEstimate: totalEstimate,
      shopCount: shopCount,
      itemCount: itemCount,
      isEmpty: cart.length === 0,
    });

    // 更新角标
    if (itemCount > 0) {
      wx.setTabBarBadge({ index: 3, text: '' + itemCount });
    } else {
      wx.removeTabBarBadge({ index: 3 });
    }
  },

  /** 修改数量 */
  onQtyChange(e) {
    var id = e.currentTarget.dataset.id;
    var delta = parseInt(e.currentTarget.dataset.d) || 0;
    var cart = wx.getStorageSync('cart') || [];
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) {
        cart[i].qty = Math.max(1, (cart[i].qty || 1) + delta);
        break;
      }
    }
    wx.setStorageSync('cart', cart);
    this.loadCart();
  },

  /** 移除 */
  onRemove(e) {
    var id = e.currentTarget.dataset.id;
    var cart = (wx.getStorageSync('cart') || []).filter(function(c) { return c.id !== id; });
    wx.setStorageSync('cart', cart);
    this.loadCart();
    wx.showToast({ title: '已移除', icon: 'none' });
  },

  /** 清空 */
  onClear() {
    var that = this;
    wx.showModal({
      title: '清空购物车',
      content: '确定清空所有商品吗？',
      success: function(res) {
        if (res.confirm) {
          wx.setStorageSync('cart', []);
          wx.removeTabBarBadge({ index: 3 });
          that.setData({ shopGroups: [], totalEstimate: 0, itemCount: 0, shopCount: 0, isEmpty: true });
        }
      }
    });
  },

  /** 去店铺 */
  onGoShop(e) {
    var sid = e.currentTarget.dataset.shopid;
    var sname = e.currentTarget.dataset.shopname;
    wx.navigateTo({ url: '/pages/shop-detail/shop-detail?shopId=' + encodeURIComponent(sid) + '&shopName=' + encodeURIComponent(sname) });
  },

  // ===== 去结算 =====

  /** 去统一结算页 */
  onGoSettle() {
    wx.navigateTo({ url: '/pages/settle/settle?context=cart' });
  },

  /** 约领航员集货配送（快捷入口） */
  onCheckoutConsolidate() {
    wx.navigateTo({ url: '/pages/settle/settle?context=navigator&serviceType=consolidate&shopCount=' + this.data.shopCount });
  },

  /** 全选/取消全选 */
  onSelectAll() {
    var next = !this.data.allSelected;
    this.setData({ allSelected: next });
  },

  /** 去商品详情 */
  onRecoGoodsTap(e) {
    var d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + d.id + '&name=' + encodeURIComponent(d.name) + '&price=' + d.price + '&shopId=' + encodeURIComponent(d.shopid || '') + '&shopName=' + encodeURIComponent(d.shopname || '') });
  },

  /** 空状态 — 去首页 */
  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
