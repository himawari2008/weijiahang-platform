/**
 * 为家航 · 店铺详情页
 * 对标淘宝/京东店铺页 — 完整 O2O 建材店铺体验
 * 功能：店铺信息 · 位置电话 · 搜索筛选排序 · 双列商品网格 · 规格选择底部弹窗 · 记忆模式
 */
var api = require('../../utils/api.js');

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

/* ═══ 页面 ═══ */
Page({
  data: {
    shop: {},
    shopId: '',

    /* 搜索 + 分类 + 排序 */
    keyword: '',
    activeCat: '',
    sortBy: 'sales',     // 'sales' | 'price_asc' | 'price_desc'
    categories: [],

    /* 商品 */
    allProducts: [],
    filteredProducts: [],

    /* 已选商品（记忆模式） */
    pickedProduct: null,
    highlightedId: '',
    scrollToId: '',

    /* 收藏 */
    isFavorited: false,

    /* 底部规格弹窗 */
    showSheet: false,
    sheetProduct: null,
    sheetQty: 30,
  },

  /* ═══════════════════════════════════════
     Lifecycle
     ═══════════════════════════════════════ */

  /* ═══ API → 前端店铺字段标准化 ═══ */
  _normalizeShop: function (apiShop, fallbackId, fallbackName) {
    if (!apiShop) {
      return {
        id: fallbackId || '',
        name: fallbackName || '店铺',
        mainCategory: '', logo: '',
        rating: 4.5, reviewCount: 0, followers: 0, productCount: 0,
        building: '', rowNo: '', shopNo: '', floor: 1,
        address: '', phone: '', businessHours: '',
        tags: [], categories: ['全部'], announcement: '',
      };
    }
    // 构建地址
    var addrParts = [];
    if (apiShop.market && apiShop.market.name) addrParts.push(apiShop.market.name);
    if (apiShop.building) addrParts.push(apiShop.building);
    if (apiShop.rowNo) addrParts.push(apiShop.rowNo);
    if (apiShop.shopNo) addrParts.push(apiShop.shopNo + '号');
    var address = addrParts.join(' ');

    // 商品分类：从API的categories数组 + '全部'
    var categories = ['全部'];
    if (Array.isArray(apiShop.categories) && apiShop.categories.length > 0) {
      categories = categories.concat(apiShop.categories);
    } else if (apiShop.category) {
      categories.push(apiShop.category);
    }

    return {
      id: apiShop.id,
      name: apiShop.name || fallbackName || '店铺',
      mainCategory: apiShop.category || '',
      logo: apiShop.logo || '',
      rating: apiShop.rating || 4.5,
      reviewCount: apiShop.reviewCount || 0,
      followers: apiShop.followers || 0,
      productCount: apiShop.productCount || 0,
      building: apiShop.building || '',
      rowNo: apiShop.rowNo || '',
      shopNo: apiShop.shopNo || '',
      floor: apiShop.floor || 1,
      address: address || apiShop.address || '',
      phone: apiShop.phone || '',
      businessHours: apiShop.businessHours || '',
      tags: Array.isArray(apiShop.tags) ? apiShop.tags : [],
      categories: categories,
      announcement: apiShop.announcement || '',
    };
  },

  onLoad(options) {
    var that = this;
    // 安全解码所有参数（防双重编码/未解码）
    var shopId = safeDecode(options.shopId || options.id || '');
    var shopName = safeDecode(options.shopName || options.name || '');

    // API优先：并行获取店铺详情+商品列表
    if (shopId) {
      var shopPromise = api.getShopDetail(shopId).catch(function () { return null; });
      var productsPromise = api.getShopProducts(shopId).catch(function () { return []; });

      Promise.all([shopPromise, productsPromise]).then(function (results) {
        var apiShop = results[0];
        var products = Array.isArray(results[1]) ? results[1] : (results[1].list || []);

        var shop = that._normalizeShop(apiShop, shopId, shopName);
        // URL传入了shopName时，以URL为准
        if (shopName) shop.name = shopName;

        that.setData({
          shop: shop,
          shopId: shopId,
          categories: shop.categories || ['全部'],
          allProducts: products,
          filteredProducts: that._applySort('sales', products),
        });

        that._restorePicked(options, shopId, shop);
        that.checkFavorite();
      }).catch(function () {
        // API完全失败，用空数据
        var shop = that._normalizeShop(null, shopId, shopName);
        that.setData({
          shop: shop, shopId: shopId,
          categories: ['全部'], allProducts: [], filteredProducts: [],
        });
        that.checkFavorite();
      });
    } else {
      // 无shopId，用空数据
      var shop = that._normalizeShop(null, shopId, shopName);
      that.setData({
        shop: shop, shopId: shopId,
        categories: ['全部'], allProducts: [], filteredProducts: [],
      });
      that.checkFavorite();
    }
  },

  /** 恢复记忆：优先 URL 带入 → storage 记忆 */
  _restorePicked: function (options, shopId, shop) {
    var pickedName = safeDecode(options.productName || '');
    var pickedPrice = parseFloat(options.productPrice) || 0;
    var pickedSpec = safeDecode(options.productSpec || '');

    if (pickedName) {
      var picked = {
        id: '', name: pickedName, price: pickedPrice, spec: pickedSpec, qty: 1,
        shopId: shopId, shopName: shop.name,
      };
      this.setData({ pickedProduct: picked, highlightedId: '' });
      this._rememberPick(picked);
    } else {
      var remembered = this._recallPick();
      if (remembered && remembered.shopId === shopId) {
        this.setData({ pickedProduct: remembered });
      }
    }
  },

  onShow() {
    this.checkFavorite();
    // 恢复记忆
    if (!this.data.pickedProduct) {
      var remembered = this._recallPick();
      if (remembered && remembered.shopId === this.data.shopId) {
        this.setData({ pickedProduct: remembered });
      }
    }
  },

  /* ═══════════════════════════════════════
     记忆模式
     ═══════════════════════════════════════ */

  _rememberPick(p) {
    if (!p) return;
    p.shopId = this.data.shopId;
    p.shopName = this.data.shop.name;
    try { wx.setStorageSync('picked_product', p); } catch (e) { }
  },

  _recallPick() {
    try { return wx.getStorageSync('picked_product') || null; } catch (e) { return null; }
  },

  /* ═══════════════════════════════════════
     收藏
     ═══════════════════════════════════════ */

  checkFavorite() {
    try { var favs = wx.getStorageSync('fav_shops') || []; } catch (e) { favs = []; }
    var found = false;
    for (var i = 0; i < favs.length; i++) {
      if (favs[i].id === this.data.shopId) { found = true; break; }
    }
    if (found !== this.data.isFavorited) {
      this.setData({ isFavorited: found });
    }
  },

  onToggleFavorite() {
    var newVal = !this.data.isFavorited;
    var shop = this.data.shop;
    this.setData({ isFavorited: newVal });
    wx.showToast({ title: newVal ? '已收藏店铺' : '已取消收藏', icon: 'success', duration: 1000 });

    try { var favs = wx.getStorageSync('fav_shops') || []; } catch (e) { favs = []; }
    if (newVal) {
      var exists = false;
      for (var i = 0; i < favs.length; i++) {
        if (favs[i].id === shop.id) { exists = true; break; }
      }
      if (!exists) {
        favs.push({
          id: shop.id, name: shop.name, rating: shop.rating,
          building: shop.building, addr: (shop.rowNo || '') + (shop.shopNo || ''),
        });
      }
    } else {
      favs = favs.filter(function (f) { return f.id !== shop.id; });
    }
    wx.setStorageSync('fav_shops', favs);
  },

  /* ═══════════════════════════════════════
     搜索 + 分类 + 排序
     ═══════════════════════════════════════ */

  onSearch(e) {
    var kw = e.detail.value;
    this.setData({ keyword: kw });
    this._applyFilter(kw, this.data.activeCat, this.data.sortBy);
  },

  onCatTap(e) {
    var cat = e.currentTarget.dataset.cat;
    var activeCat = cat === '全部' ? '' : cat;
    this.setData({ activeCat: activeCat });
    this._applyFilter(this.data.keyword, activeCat, this.data.sortBy);
  },

  onSort(e) {
    var sortBy = e.currentTarget.dataset.sort;
    this.setData({ sortBy: sortBy });
    this._applyFilter(this.data.keyword, this.data.activeCat, sortBy);
  },

  _applyFilter(kw, cat, sortBy) {
    var list = this.data.allProducts.slice();
    if (kw) { list = list.filter(function (p) { return p.name.indexOf(kw) >= 0; }); }
    if (cat) { list = list.filter(function (p) { return p.category === cat; }); }
    list = this._applySort(sortBy, list);
    this.setData({ filteredProducts: list });
  },

  _applySort(sortBy, list) {
    var sorted = list.slice();
    if (sortBy === 'price_asc') {
      sorted.sort(function (a, b) { return a.price - b.price; });
    } else if (sortBy === 'price_desc') {
      sorted.sort(function (a, b) { return b.price - a.price; });
    } else {
      // 默认：按销量降序
      sorted.sort(function (a, b) { return (b.sales || 0) - (a.sales || 0); });
    }
    return sorted;
  },

  /* ═══════════════════════════════════════
     商品点击 → 底部规格弹窗
     ═══════════════════════════════════════ */

  onProductTap(e) {
    var d = e.currentTarget.dataset;
    var product = {
      id: safeDecode(d.id),
      name: safeDecode(d.name),
      price: parseFloat(d.price) || 0,
      spec: safeDecode(d.spec || ''),
      unit: safeDecode(d.unit || '㎡'),
      category: safeDecode(d.category || ''),
      sales: parseInt(d.sales) || 0,
    };
    this.setData({
      highlightedId: product.id,
      sheetProduct: product,
      sheetQty: 30,
      showSheet: true,
    });
  },

  /* ── 弹窗操作 ── */
  onSheetClose() {
    this.setData({ showSheet: false, sheetProduct: null });
  },
  noop() { },

  onSheetQtyMinus() { var v = this.data.sheetQty; if (v > 1) this.setData({ sheetQty: v - 1 }); },
  onSheetQtyPlus() { var v = this.data.sheetQty; this.setData({ sheetQty: v + 1 }); },
  onSheetQtyInput(e) {
    var v = parseInt(e.detail.value) || 0;
    this.setData({ sheetQty: Math.max(1, v) });
  },
  onSheetQtyPreset(e) {
    var v = parseInt(e.currentTarget.dataset.v) || 30;
    this.setData({ sheetQty: v });
  },

  /** 加入购物车 */
  onSheetAddCart() {
    var p = this.data.sheetProduct;
    var qty = this.data.sheetQty;
    if (!p || qty <= 0) return;

    this._upsertCart(p, qty);
    this.setData({ showSheet: false, sheetProduct: null });
    this._updateCartBadge();
    wx.showToast({ title: '已加入购物车 (' + qty + (p.unit || '㎡') + ')', icon: 'success' });
  },

  /** 立即购买（底部栏） */
  onBuyNow() {
    // 如果有弹窗中的商品，用弹窗数据
    if (this.data.showSheet && this.data.sheetProduct && this.data.sheetQty > 0) {
      this._upsertCart(this.data.sheetProduct, this.data.sheetQty);
      this.setData({ showSheet: false, sheetProduct: null });
      this._updateCartBadge();
      wx.navigateTo({ url: '/pages/settle/settle?context=direct' });
      return;
    }
    // 如果有记忆的选中商品，直接购买
    var picked = this.data.pickedProduct;
    if (picked && picked.name) {
      var qty = picked.qty || 1;
      if (qty <= 0) qty = 1;
      this._upsertCart({ id: picked.id, name: picked.name, price: picked.price, spec: picked.spec || '', unit: picked.unit || '㎡' }, qty);
      this._updateCartBadge();
      wx.navigateTo({ url: '/pages/settle/settle?context=direct' });
      return;
    }
    // 没有选中商品 → 提示
    wx.showToast({ title: '请先选择商品', icon: 'none' });
  },

  /** 弹窗中：立即购买 */
  onSheetBuyNow() {
    var p = this.data.sheetProduct;
    var qty = this.data.sheetQty;
    if (!p || qty <= 0) return;

    this._upsertCart(p, qty);
    this.setData({ showSheet: false, sheetProduct: null });
    this._updateCartBadge();
    wx.navigateTo({ url: '/pages/settle/settle?context=direct' });
  },

  /** 购物车增/改 */
  _upsertCart(product, qty) {
    try { var cart = wx.getStorageSync('cart') || []; } catch (e) { cart = []; }
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === product.id) { idx = i; break; }
    }
    var item = {
      id: product.id, name: product.name, price: product.price,
      spec: product.spec, unit: product.unit,
      shopId: this.data.shopId, shopName: this.data.shop.name,
      qty: qty, image: product.image || '',
    };
    if (idx >= 0) { cart[idx] = item; }
    else { cart.push(item); }
    wx.setStorageSync('cart', cart);

    // 记忆选中
    this.setData({ pickedProduct: item });
    this._rememberPick(item);
  },

  _updateCartBadge() {
    try {
      var cart = wx.getStorageSync('cart') || [];
      if (cart.length > 0) {
        wx.setTabBarBadge({ index: 3, text: String(cart.length) });
      } else {
        wx.removeTabBarBadge({ index: 3 });
      }
    } catch (e) { }
  },

  /* ── 点击已选商品条 → 弹出规格弹窗 ── */
  onPickedTap() {
    if (!this.data.pickedProduct) return;
    var p = this.data.pickedProduct;
    this.setData({
      sheetProduct: {
        id: p.id, name: p.name, price: p.price,
        spec: p.spec || '', unit: p.unit || '㎡',
      },
      sheetQty: p.qty || 30,
      showSheet: true,
    });
  },

  /* ═══════════════════════════════════════
     商品详情页
     ═══════════════════════════════════════ */

  onGoProductDetail(e) {
    var d = e.currentTarget.dataset;
    var params = [
      'id=' + encodeURIComponent(safeDecode(d.id)),
      'name=' + encodeURIComponent(safeDecode(d.name)),
      'price=' + (parseFloat(d.price) || 0),
      'spec=' + encodeURIComponent(safeDecode(d.spec || '')),
      'shopId=' + encodeURIComponent(this.data.shopId),
      'shopName=' + encodeURIComponent(this.data.shop.name),
      'sales=' + (parseInt(d.sales) || 0),
    ];
    wx.navigateTo({ url: '/pages/product-detail/product-detail?' + params.join('&') });
  },

  /* ═══════════════════════════════════════
     底部栏操作
     ═══════════════════════════════════════ */

  /** 在线咨询 */
  onChatMerchant() {
    var s = this.data.shop;
    wx.navigateTo({
      url: '/pages/chat/chat?id=' + encodeURIComponent(s.id) +
        '&name=' + encodeURIComponent(s.name) + '&type=shop'
    });
  },

  /** 约领航员 */
  onBookNavigator() {
    var s = this.data.shop;
    wx.navigateTo({
      url: '/pages/settle/settle?context=navigator&shopName=' + encodeURIComponent(s.name) +
        '&shopId=' + encodeURIComponent(s.id)
    });
  },

  /** 拨打电话 */
  onCallPhone() {
    var phone = this.data.shop.phone;
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: phone });
  },

  /** 导航到店 */
  onNavigate() {
    wx.navigateTo({ url: '/pages/map/map?marketId=' + this.data.shopId });
  },

  /** 分享店铺 */
  onShare() {
    // 由 onShareAppMessage 处理
  },

  /** 分享配置 */
  onShareAppMessage() {
    var s = this.data.shop;
    return {
      title: s.name + ' - ' + (s.address || '为家航建材市场'),
      path: '/pages/shop-detail/shop-detail?shopId=' + encodeURIComponent(s.id) + '&shopName=' + encodeURIComponent(s.name),
    };
  },
});
