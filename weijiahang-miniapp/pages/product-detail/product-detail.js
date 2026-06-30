/**
 * 为家航 · 商品详情页
 * 图片轮播 · 价格 · 店铺卡片 · 保障条 · 规格参数 · 数量弹窗
 */

/* ═══ 工具函数：安全解码 URI（防双重编码/未解码） ═══ */
function safeDecode(val) {
  if (!val || typeof val !== 'string') return val;
  try {
    var once = decodeURIComponent(val);
    if (once !== val) {
      // 已编码过，再试一次防双重编码
      try {
        var twice = decodeURIComponent(once);
        if (twice !== once) return twice;
      } catch (e) { }
      return once;
    }
  } catch (e) { }
  return val;
}

Page({
  data: {
    product: {},
    shop: {},
    images: [],
    currentImage: 0,
    specRows: [],
    expandDesc: false,
    inCart: false,
    cartCount: 0,
    showQtyPicker: false,
    cartQty: 30,
    quickOrderMode: false,
    relatedGoods: [],
  },

  onLoad(options) {
    var that = this;

    // 安全解码所有 URL 参数（防未解码/双重编码）
    var productId = safeDecode(options.id) || 'g1';
    var productName = safeDecode(options.name) || '东鹏大理石瓷砖';
    var productSpec = safeDecode(options.spec) || '800x800mm 亮面 灰色系';
    var productUnit = safeDecode(options.unit) || '㎡';
    var productCate = safeDecode(options.category) || '地砖';
    var productSales = parseInt(options.sales) || 326;
    var productPrice = parseFloat(options.price) || 128;

    var product = {
      id: productId,
      name: productName,
      price: productPrice,
      spec: productSpec,
      unit: productUnit,
      category: productCate,
      sales: productSales,
    };

    var images = [
      { src: '', color: 'linear-gradient(135deg, #E8D5C4 0%, #D5C4B8 100%)' },
      { src: '', color: 'linear-gradient(135deg, #D5C4B8 0%, #C9B8A8 100%)' },
      { src: '', color: 'linear-gradient(135deg, #C9B8A8 0%, #B8A898 100%)' },
    ];

    var specRows = [
      { label: '品牌', value: '东鹏' },
      { label: '系列', value: '大理石瓷砖' },
      { label: '规格', value: product.spec },
      { label: '材质', value: '全抛釉' },
      { label: '表面工艺', value: '亮面' },
      { label: '适用场景', value: '客厅/餐厅/卧室' },
      { label: '防滑等级', value: 'R9' },
      { label: '吸水率', value: '<0.5%' },
      { label: '耐磨度', value: 'PEI 4级' },
    ];

    var shopId = safeDecode(options.shopId) || 's1';
    var shopName = safeDecode(options.shopName) || '老李瓷砖批发';

    var shop = {
      id: shopId,
      name: shopName,
      rating: 4.8,
      building: 'A区', rowNo: '3排', shopNo: '15号',
    };

    var cart = that.loadCart();
    var inCart = false;
    var existingQty = 30;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === product.id) { inCart = true; existingQty = cart[i].qty || 30; break; }
    }

    // 同店推荐（带店铺信息，点击可正确跳转）
    var relatedGoods = [
      { id: 'r1', name: '东鹏全抛釉地砖 800x800 爵士白', price: 148, spec: '800x800mm 亮面 爵士白', unit: '㎡', shopId: shopId, shopName: shopName, bg: 'linear-gradient(180deg, #F5F0EB, #EBE5DD)' },
      { id: 'r2', name: '东鹏仿古砖 600x600 防滑哑光', price: 98, spec: '600x600mm 哑光防滑', unit: '㎡', shopId: shopId, shopName: shopName, bg: 'linear-gradient(180deg, #F0F0F0, #E0E0E0)' },
      { id: 'r3', name: '德高瓷砖胶 玻化砖专用 20kg', price: 58, spec: '20kg 玻化砖专用', unit: '袋', shopId: shopId, shopName: shopName, bg: 'linear-gradient(180deg, #F5F5FF, #EBEBF5)' },
      { id: 'r4', name: '美缝剂 环氧彩砂 哑光灰', price: 68, spec: '3kg 哑光灰 双组份', unit: '桶', shopId: shopId, shopName: shopName, bg: 'linear-gradient(180deg, #F8F8F0, #EFEFE5)' },
    ];

    this.setData({
      product: product, shop: shop, images: images, specRows: specRows,
      inCart: inCart, cartCount: cart.length, cartQty: existingQty,
      relatedGoods: relatedGoods,
    });
  },

  onShow() {
    var cart = this.loadCart();
    var inCart = false;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === this.data.product.id) { inCart = true; break; }
    }
    this.setData({ cartCount: cart.length, inCart: inCart });
  },

  onSwiperChange(e) { this.setData({ currentImage: e.detail.current }); },
  onToggleExpand() { this.setData({ expandDesc: !this.data.expandDesc }); },

  // ===== 数量选择弹窗 =====
  onShowQtyPicker() { this.setData({ showQtyPicker: true }); },
  onHideQtyPicker() {
    this.setData({ showQtyPicker: false, quickOrderMode: false });
  },
  noop() {},

  onQtyMinus() { var v = this.data.cartQty; if (v > 1) this.setData({ cartQty: v - 1 }); },
  onQtyPlus() { var v = this.data.cartQty; this.setData({ cartQty: v + 1 }); },
  onQtyInput(e) {
    var v = parseInt(e.detail.value) || 0;
    this.setData({ cartQty: v });
  },
  onQtyPreset(e) {
    var v = parseInt(e.currentTarget.dataset.v) || 30;
    this.setData({ cartQty: v });
  },

  /** 确认 — 区分"加购物车"和"直接下单"两模式 */
  onConfirmAddCart() {
    var qty = this.data.cartQty;
    if (qty <= 0) { wx.showToast({ title: '请输入数量', icon: 'none' }); return; }

    var p = this.data.product;
    var cart = this.loadCart();
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === p.id) { idx = i; break; }
    }

    var item = {
      id: p.id, name: p.name, price: p.price, spec: p.spec,
      unit: p.unit, shopId: this.data.shop.id, shopName: this.data.shop.name,
      qty: qty, image: '',
    };

    if (idx >= 0) { cart[idx] = item; }
    else { cart.push(item); }
    wx.setStorageSync('cart', cart);

    this.setData({ inCart: true, cartCount: cart.length, showQtyPicker: false });
    this.updateTabBadge();

    // 直接下单模式 → 跳结算页
    if (this.data.quickOrderMode) {
      this.setData({ quickOrderMode: false });
      wx.navigateTo({ url: '/pages/settle/settle?context=direct' });
    } else {
      wx.showToast({ title: '已加入购物车 (' + qty + (p.unit === 'm2' ? '㎡' : p.unit) + ')', icon: 'success' });
    }
  },

  loadCart() {
    try { return wx.getStorageSync('cart') || []; } catch (e) { return []; }
  },

  updateTabBadge() {
    var cart = this.loadCart();
    if (cart.length > 0) {
      wx.setTabBarBadge({ index: 3, text: '' + cart.length });
    } else {
      wx.removeTabBarBadge({ index: 3 });
    }
  },

  onGoCart() { wx.navigateTo({ url: '/pages/cart/cart' }); },

  onGoShop() {
    var s = this.data.shop;
    wx.navigateTo({ url: '/pages/shop-detail/shop-detail?shopId=' + encodeURIComponent(s.id) + '&shopName=' + encodeURIComponent(s.name) });
  },

  onBookNavigator() {
    wx.navigateTo({ url: '/pages/settle/settle?context=navigator' });
  },

  /** 直接下单 → 先弹数量选择 */
  onQuickOrder() {
    this.setData({ quickOrderMode: true, showQtyPicker: true });
  },

  /** 推荐商品 → 带完整参数跳转 */
  onRelatedTap(e) {
    var d = e.currentTarget.dataset;
    var params = [
      'id=' + encodeURIComponent(d.id),
      'name=' + encodeURIComponent(d.name),
      'price=' + d.price,
      'spec=' + encodeURIComponent(d.spec || ''),
      'unit=' + encodeURIComponent(d.unit || '㎡'),
      'shopId=' + encodeURIComponent(d.shopid || ''),
      'shopName=' + encodeURIComponent(d.shopname || ''),
    ];
    wx.navigateTo({ url: '/pages/product-detail/product-detail?' + params.join('&') });
  },

  onChatMerchant() {
    var s = this.data.shop;
    wx.navigateTo({ url: '/pages/chat/chat?id=' + encodeURIComponent(s.id) + '&name=' + encodeURIComponent(s.name) + '&type=shop' });
  },
});
