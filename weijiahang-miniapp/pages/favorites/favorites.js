Page({
  data: {
    tab: 'shop',     // 'shop' | 'goods'
    shops: [],
    goods: [],
    loading: true,
  },

  onShow() {
    this.loadFavorites();
  },

  loadFavorites() {
    try {
      var favShops = wx.getStorageSync('fav_shops') || [];
    } catch (e) { favShops = []; }
    try {
      var favGoods = wx.getStorageSync('fav_goods') || [];
    } catch (e) { favGoods = []; }
    this.setData({ shops: favShops, goods: favGoods, loading: false });
  },

  onTabChange(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  /* 店铺 */
  onTapShop(e) {
    var shop = e.currentTarget.dataset.shop;
    wx.navigateTo({
      url: '/pages/shop-detail/shop-detail?shopId=' + encodeURIComponent(shop.id) + '&shopName=' + encodeURIComponent(shop.name),
    });
  },

  onRemoveShopFav(e) {
    var that = this;
    var idx = e.currentTarget.dataset.index;
    var shops = this.data.shops.slice();
    var shop = shops[idx];
    wx.showModal({
      title: '取消收藏',
      content: '确定不再收藏「' + shop.name + '」？',
      confirmColor: '#FF6B35',
      success: function (res) {
        if (res.confirm) {
          shops.splice(idx, 1);
          wx.setStorageSync('fav_shops', shops);
          that.setData({ shops: shops });
          wx.showToast({ title: '已取消', icon: 'none' });
        }
      },
    });
  },

  /* 商品 */
  onTapGoods(e) {
    var d = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/product-detail/product-detail?id=' + encodeURIComponent(d.id) + '&name=' + encodeURIComponent(d.name) + '&price=' + d.price,
    });
  },

  onRemoveGoodsFav(e) {
    var that = this;
    var idx = e.currentTarget.dataset.index;
    var goods = this.data.goods.slice();
    var g = goods[idx];
    wx.showModal({
      title: '取消收藏',
      content: '确定不再收藏「' + g.name + '」？',
      confirmColor: '#FF6B35',
      success: function (res) {
        if (res.confirm) {
          goods.splice(idx, 1);
          wx.setStorageSync('fav_goods', goods);
          that.setData({ goods: goods });
          wx.showToast({ title: '已取消', icon: 'none' });
        }
      },
    });
  },

  /* 快速加购 */
  onQuickAddCart(e) {
    var id = e.currentTarget.dataset.id;
    var goods = this.data.goods.find(function (g) { return g.id === id; });
    if (!goods) return;
    try {
      var cart = wx.getStorageSync('cart') || [];
    } catch (err) { cart = []; }
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === goods.id) { idx = i; break; }
    }
    var item = {
      id: goods.id, name: goods.name, price: goods.price,
      spec: goods.spec || '', unit: goods.unit || '㎡',
      shopId: goods.shopId || '', shopName: goods.shopName || '',
      qty: (idx >= 0 ? cart[idx].qty + 1 : 1), image: goods.image || '',
    };
    if (idx >= 0) { cart[idx] = item; } else { cart.push(item); }
    wx.setStorageSync('cart', cart);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  onBack() { wx.navigateBack(); },
  onGoExplore() { wx.switchTab({ url: '/pages/index/index' }); },
});
