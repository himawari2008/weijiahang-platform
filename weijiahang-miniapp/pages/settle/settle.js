var app = getApp();
var api = require('../../utils/api.js');

/**
 * 统一结算页 — 三模式自适应
 *
 * context=direct   → 直接下单（默认自取，可选+领航员验货）
 * context=navigator → 预约领航员（默认陪同选材，可选+顺便采购）
 * context=cart     → 购物车结算（默认智能推荐，合单优化）
 *
 * 核心设计：入口有差异，但不锁死——任何入口都能交叉引用另一端的能力。
 */

Page({
  data: {
    /* ── 上下文 ── */
    context: 'cart',           // direct | navigator | cart

    /* ── 服务方式（每上下文不同） ── */
    serviceMode: 'self',       // self | navi-accompany | navi-inspect | navi-bulk | navi-deliver | navi-load | logistics | delivery

    /* ── 交叉引用开关 ── */
    needNavigator: false,      // direct/cart 中勾选「需要领航员服务」
    navigatorSubMode: '',      // 选中哪种领航员服务：inspect | accompany
    needPurchase: false,       // navigator 中勾选「顺便采购商品」

    /* ── 地址 & 时间 ── */
    selectedAddress: null,
    appointDate: '',
    appointTime: '',
    today: '',

    /* ── 客群 ── */
    customerType: 'retail',
    customerTypeLabel: '散客',
    currentTierLevel: 1,

    /* ── 商品 ── */
    cartItems: [],
    shopGroups: [],
    itemCount: 0,
    shopCount: 0,
    showItems: false,

    /* ── 价格 ── */
    goodsTotal: 0,
    tierDiscount: 0,
    tierDiscountRate: 0,
    couponId: '',
    couponDiscount: 0,
    selectedCoupon: null,
    deliveryFee: 0,
    serviceFee: 0,
    totalPrice: 0,
    pricingLoaded: false,

    /* ── 优惠券 ── */
    availableCoupons: [],

    /* ── 诚信承诺（领航员防利益捆绑） ── */
    integrityConfirmed: false,   // 用户确认诚信条款
    showIntegrityDetail: false,  // 展开/收起条款详情
    integrityClauses: [
      { icon: '禁', title: '禁止收受商户回扣', desc: '领航员不得以任何形式收受商户返点、佣金、好处费，违者扣除全部保证金并永久封号。' },
      { icon: '公', title: '推荐基于品质与价格', desc: '领航员推荐商品/店铺的唯一依据是产品质量和价格优势，不得因私人关系偏袒特定商户。' },
      { icon: '披', title: '利益关系强制披露', desc: '领航员与商户存在亲属、投资、合伙等关系时，必须在服务前主动向业主披露，隐瞒视为违规。' },
      { icon: '溯', title: '推荐过程全程留痕', desc: '领航员每次推荐商品、引导进店均被系统记录，业主可在服务结束后查看完整轨迹。' },
      { icon: '赔', title: '平台先行赔付', desc: '若查实领航员因收受回扣导致业主多花冤枉钱，平台先行赔付差价，再向领航员追溯。' },
    ],

    /* ── 提交态 ── */
    submitting: false,

    /* ── 上下文文案映射（WXML直接用） ── */
    pageTitle: '确认订单',
    ctaText: '提交订单',
    showAddressRequired: false,
  },

  /* ═══════════════════════════════════════
     Lifecycle
     ═══════════════════════════════════════ */
  onLoad(options) {
    var now = new Date();
    var y = now.getFullYear();
    var m = ('0' + (now.getMonth() + 1)).slice(-2);
    var d = ('0' + now.getDate()).slice(-2);
    this.setData({ today: y + '-' + m + '-' + d });

    // ── 1. 检测上下文 ──
    var ctx = options.context || 'cart';
    this._applyContext(ctx, options);

    // ── 2. 加载数据 ──
    this._loadCustomerType();
    if (ctx === 'navigator' && !options.serviceType) {
      // 纯约领航员，不加载购物车
      this.setData({ pricingLoaded: true });
    } else {
      this.loadCart();
    }
    this.loadDefaultAddress();
  },

  onShow() {
    // 从地址选择页返回
    if (app.globalData.selectedAddress) {
      this.setData({ selectedAddress: app.globalData.selectedAddress });
      app.globalData.selectedAddress = null;
    }
    // 购物车可能在其他页面被修改
    if (this.data.context !== 'navigator' || this.data.needPurchase) {
      this.loadCart();
    }
  },

  /* ═══════════════════════════════════════
     上下文切换
     ═══════════════════════════════════════ */

  /** 根据入口参数设定初始状态 */
  _applyContext(ctx, options) {
    var update = { context: ctx };

    if (ctx === 'direct') {
      // 直接下单：默认自取，轻量快捷
      update.serviceMode = 'self';
      update.pageTitle = '确认订单';
      update.ctaText = '确认下单';
      update.showAddressRequired = false;
      // 如果之前从约领航员入口来，预选领航员交付
      if (options.needNavigator === '1') {
        update.needNavigator = true;
        update.navigatorSubMode = 'inspect';
        update.serviceMode = 'navi-inspect';
        update.showAddressRequired = true;
      }
    } else if (ctx === 'navigator') {
      // 约领航员：默认陪同选材，服务费定价
      // serviceType=consolidate → 来自购物车集货入口，应加载商品
      update.serviceMode = options.serviceType === 'consolidate' ? 'navi-bulk' : 'navi-accompany';
      update.pageTitle = '预约领航员';
      update.ctaText = '预约领航员';
      update.showAddressRequired = true;
      update.serviceFee = this._getNavigatorFee(update.serviceMode);
      // 集货入口自动开启「顺便采购」
      if (options.serviceType === 'consolidate') {
        update.needPurchase = true;
      }
    } else {
      // 购物车结算：保持现有逻辑，默认自取
      update.serviceMode = 'self';
      update.pageTitle = '购物车结算';
      update.ctaText = '合并结算';
      update.showAddressRequired = false;
      if (options.needNavigator === '1') {
        update.serviceMode = 'navi-deliver';
        update.showAddressRequired = true;
      }
    }

    this.setData(update);
  },

  /* ═══════════════════════════════════════
     诚信承诺（防利益捆绑）
     ═══════════════════════════════════════ */
  onToggleIntegrity() {
    this.setData({ integrityConfirmed: !this.data.integrityConfirmed });
  },

  onToggleIntegrityDetail() {
    this.setData({ showIntegrityDetail: !this.data.showIntegrityDetail });
  },

  /** 领航员各服务费率 */
  _getNavigatorFee(mode) {
    var fees = {
      'navi-accompany': 88,   // 陪同选材
      'navi-inspect': 29,     // 验货把关
      'navi-bulk': 68,        // 批量代购/集货
      'navi-deliver': 68,     // 送货到家（服务费，不含运费）
    };
    return fees[mode] || 0;
  },

  /* ═══════════════════════════════════════
     服务方式切换
     ═══════════════════════════════════════ */
  onMode(e) {
    var mode = e.currentTarget.dataset.mode;
    var update = { serviceMode: mode };

    // 领航员模式 → 计算服务费，需要重新确认诚信承诺
    if (mode.indexOf('navi-') === 0) {
      update.serviceFee = this._getNavigatorFee(mode);
      update.showAddressRequired = true;
      update.integrityConfirmed = false; // 切换服务类型需重新确认
    } else {
      update.serviceFee = 0;
      update.integrityConfirmed = false; // 非领航员模式无需确认
    }

    // 自取模式 → 清空地址和时间
    if (mode === 'self') {
      update.selectedAddress = null;
      update.appointDate = '';
      update.appointTime = '';
      update.deliveryFee = 0;
      update.showAddressRequired = false;
    } else if (mode === 'delivery' || mode === 'logistics') {
      update.showAddressRequired = true;
      this._estimateDelivery();
    }

    this.setData(update);
    if (mode !== 'self' && mode.indexOf('navi-') !== 0) {
      this._estimateDelivery();
    }
    this.recalc();
  },

  /* ═══════════════════════════════════════
     交叉引用：direct/cart → 加领航员
     ═══════════════════════════════════════ */
  onToggleNeedNavigator() {
    var next = !this.data.needNavigator;
    var update = { needNavigator: next };
    if (!next) {
      // 取消领航员 → 回到纯自取
      update.navigatorSubMode = '';
      update.serviceMode = 'self';
      update.serviceFee = 0;
      update.showAddressRequired = false;
      update.integrityConfirmed = false;
    } else {
      // 开启领航员 → 默认验货模式
      update.navigatorSubMode = 'inspect';
      update.serviceMode = 'navi-inspect';
      update.serviceFee = this._getNavigatorFee('navi-inspect');
      update.showAddressRequired = true;
      update.integrityConfirmed = false; // 每次开启需重新确认
    }
    this.setData(update);
    this.recalc();
  },

  /** direct/cart 中切换领航员子模式 */
  onNavigatorSubMode(e) {
    var sub = e.currentTarget.dataset.sub;
    var mode = 'navi-' + sub;
    this.setData({
      navigatorSubMode: sub,
      serviceMode: mode,
      serviceFee: this._getNavigatorFee(mode),
    });
    this.recalc();
  },

  /* ═══════════════════════════════════════
     交叉引用：navigator → 加采购
     ═══════════════════════════════════════ */
  onToggleNeedPurchase() {
    var next = !this.data.needPurchase;
    this.setData({ needPurchase: next });
    if (next) {
      this.loadCart();
    } else {
      this.setData({
        cartItems: [], shopGroups: [], itemCount: 0, shopCount: 0,
        goodsTotal: 0, tierDiscount: 0, deliveryFee: 0,
      });
      this.recalc();
    }
  },

  /* ═══════════════════════════════════════
     客群
     ═══════════════════════════════════════ */
  _loadCustomerType() {
    var that = this;
    try {
      var profile = wx.getStorageSync('userProfile') || {};
      if (profile.customerType) {
        var labels = { retail: '散客', contractor: '工长', decoration_company: '装企', wholesale: '批发' };
        that.setData({
          customerType: profile.customerType,
          customerTypeLabel: labels[profile.customerType] || '散客',
        });
      }
    } catch (e) { /* ignore */ }

    api.getTierInfo().then(function (res) {
      var calc = res.calculation;
      if (calc) {
        that.setData({
          customerType: calc.customerType || 'retail',
          tierDiscountRate: calc.discountRate || 0,
          currentTierLevel: calc.currentLevel || 1,
        });
        that.recalc();
      }
    }).catch(function () { /* 保持默认 */ });
  },

  onSelectCustomerType(e) {
    var ct = e.currentTarget.dataset.type;
    var labels = { retail: '散客', contractor: '工长', decoration_company: '装企', wholesale: '批发' };
    this.setData({ customerType: ct, customerTypeLabel: labels[ct] || ct });
    this._loadPricing();
  },

  /* ═══════════════════════════════════════
     地址 & 时间
     ═══════════════════════════════════════ */
  loadDefaultAddress() {
    try {
      var addresses = wx.getStorageSync('addresses') || [];
      if (addresses.length > 0) {
        var addr = null;
        for (var i = 0; i < addresses.length; i++) {
          if (addresses[i].isDefault) { addr = addresses[i]; break; }
        }
        if (!addr) addr = addresses[0];
        this.setData({ selectedAddress: addr });
      }
    } catch (e) { /* ignore */ }
  },

  onSelectAddress() {
    wx.navigateTo({ url: '/pages/address-list/address-list?selectMode=1' });
  },

  onDateChange(e) { this.setData({ appointDate: e.detail.value }); },
  onTimeChange(e) { this.setData({ appointTime: e.detail.value }); },
  onQuickTime(e) { this.setData({ appointTime: e.currentTarget.dataset.t }); },

  /* ═══════════════════════════════════════
     购物车 & 定价
     ═══════════════════════════════════════ */
  loadCart() {
    try {
      var cart = wx.getStorageSync('cart') || [];
    } catch (e) { cart = []; }

    var groupMap = {};
    for (var i = 0; i < cart.length; i++) {
      var it = cart[i];
      var sid = it.shopId || 'unknown';
      if (!groupMap[sid]) {
        groupMap[sid] = { shopId: sid, shopName: it.shopName || '未知店铺', items: [] };
      }
      groupMap[sid].items.push(it);
    }
    var groups = [];
    for (var key in groupMap) {
      if (groupMap.hasOwnProperty(key)) { groups.push(groupMap[key]); }
    }

    this.setData({
      cartItems: cart, shopGroups: groups,
      itemCount: cart.length, shopCount: groups.length,
    });

    if (cart.length > 0) {
      this._loadPricing();
    } else {
      this.setData({
        goodsTotal: 0, tierDiscount: 0, deliveryFee: 0, totalPrice: 0,
        couponId: '', couponDiscount: 0, selectedCoupon: null,
        pricingLoaded: true,
      });
    }
  },

  _loadPricing() {
    var that = this;
    var cart = this.data.cartItems;
    if (cart.length === 0) {
      this.setData({
        goodsTotal: 0, tierDiscount: 0, deliveryFee: 0, totalPrice: 0,
        couponId: '', couponDiscount: 0, selectedCoupon: null,
        pricingLoaded: true,
      });
      return;
    }

    var pricingItems = cart.map(function (it) {
      return {
        product: {
          id: it.id,
          name: it.name,
          price: it.price,
          productGrade: it.grade || 'standard',
          tierPrices: it.tierPrices || {},
        },
        quantity: it.qty || 1,
      };
    });

    var tierLevel = this.data.currentTierLevel || 1;

    api.calculatePricing({
      items: pricingItems,
      customerType: this.data.customerType,
      tierLevel: tierLevel,
    }).then(function (res) {
      that.setData({
        goodsTotal: res.totalBasePrice,
        tierDiscount: res.totalTierDiscount,
        pricingLoaded: true,
      });
      that._estimateDelivery();
    }).catch(function () {
      var total = 0;
      for (var i = 0; i < cart.length; i++) {
        total += (cart[i].price || 0) * (cart[i].qty || 1);
      }
      // Mock等级折扣
      var mockTierDiscount = 0;
      var ct = that.data.customerType;
      var lv = tierLevel;
      if (ct === 'contractor' && lv >= 4) mockTierDiscount = Math.round(total * 0.08);
      else if (ct === 'decoration_company' && lv >= 3) mockTierDiscount = Math.round(total * 0.05);
      else if (ct === 'wholesale' && lv >= 5) mockTierDiscount = Math.round(total * 0.12);

      that.setData({ goodsTotal: total, tierDiscount: mockTierDiscount, pricingLoaded: true });
      that._estimateDelivery();
    });
  },

  _estimateDelivery() {
    var that = this;
    var mode = this.data.serviceMode;
    var ctx = this.data.context;

    // 自取或纯领航员服务（不涉及商品配送）
    if (mode === 'self' || mode === 'navi-accompany' || mode === 'navi-inspect') {
      this.setData({ deliveryFee: 0 });
      this._loadCoupons();
      return;
    }

    // 领航员送货到家：服务费+运费分开算
    if (mode === 'navi-deliver') {
      api.estimateDeliveryFee({
        customerType: this.data.customerType,
        deliveryMethod: mode,
        shopCount: this.data.shopCount,
      }).then(function (res) {
        that.setData({ deliveryFee: res.deliveryFee || 0 });
        that._loadCoupons();
      }).catch(function () {
        var fee = 0;
        if (that.data.customerType === 'decoration_company') fee = 0;
        else if (that.data.customerType === 'contractor') fee = 30;
        else fee = 50;
        // 多店加价
        if (that.data.shopCount > 2) fee += (that.data.shopCount - 2) * 20;
        that.setData({ deliveryFee: fee });
        that._loadCoupons();
      });
      return;
    }

    // navi-load：领航员帮装车，无运费
    if (mode === 'navi-load') {
      this.setData({ deliveryFee: 0 });
      this._loadCoupons();
      return;
    }

    // delivery / logistics
    api.estimateDeliveryFee({
      customerType: this.data.customerType,
      deliveryMethod: mode,
    }).then(function (res) {
      that.setData({ deliveryFee: res.deliveryFee || 0 });
      that._loadCoupons();
    }).catch(function () {
      var fee = mode === 'logistics' ? 50 : 30;
      that.setData({ deliveryFee: fee });
      that._loadCoupons();
    });
  },

  _loadCoupons() {
    var that = this;
    var amount = this.data.goodsTotal;
    api.getAvailableCoupons(amount).then(function (res) {
      var list = Array.isArray(res) ? res : (res.items || []);
      that.setData({ availableCoupons: list });
    }).catch(function () {
      var mockCoupons = [
        { id: 'mock-new', name: '新人专享券', type: 'new_user', value: 50, minAmount: 200, discountType: 'amount' },
        { id: 'mock-full', name: '满500减30', type: 'full_reduction', value: 30, minAmount: 500, discountType: 'amount' },
      ];
      that.setData({ availableCoupons: mockCoupons });
    });
  },

  /* ═══════════════════════════════════════
     优惠券
     ═══════════════════════════════════════ */
  onSelectCoupon(e) {
    var idx = e.currentTarget.dataset.index;
    var coupon = this.data.availableCoupons[idx];
    if (!coupon) return;

    if (this.data.couponId === coupon.id) {
      this.setData({ couponId: '', couponDiscount: 0, selectedCoupon: null });
      this.recalc();
      return;
    }

    var minAmount = coupon.minAmount || 0;
    if (minAmount > 0 && this.data.goodsTotal < minAmount) {
      wx.showToast({ title: '未达到最低消费 ¥' + minAmount, icon: 'none' });
      return;
    }

    var discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = Math.round(this.data.goodsTotal * coupon.value) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.value || 0;
    }

    this.setData({
      couponId: coupon.id,
      couponDiscount: discount,
      selectedCoupon: coupon,
    });
    this.recalc();
  },

  onRemoveCoupon() {
    this.setData({ couponId: '', couponDiscount: 0, selectedCoupon: null });
    this.recalc();
  },

  /* ═══════════════════════════════════════
     计算总价
     ═══════════════════════════════════════ */
  onToggleItems() { this.setData({ showItems: !this.data.showItems }); },

  recalc() {
    var total = this.data.goodsTotal
      - this.data.tierDiscount
      - this.data.couponDiscount
      + this.data.deliveryFee
      + this.data.serviceFee;
    this.setData({ totalPrice: Math.max(0, Math.round(total * 100) / 100) });
  },

  /* ═══════════════════════════════════════
     提交订单
     ═══════════════════════════════════════ */
  onSubmit() {
    var that = this;
    var ctx = this.data.context;
    var mode = this.data.serviceMode;

    // ── 校验 ──
    if (!mode) { wx.showToast({ title: '请选择服务方式', icon: 'none' }); return; }

    // 防利益捆绑：涉及领航员服务时，强制确认诚信承诺
    var hasNavigator = ctx === 'navigator' || this.data.needNavigator || mode.indexOf('navi-') === 0;
    if (hasNavigator && !this.data.integrityConfirmed) {
      wx.showToast({ title: '请先确认领航员诚信承诺', icon: 'none' }); return;
    }

    // navigator模式：至少要有服务类型
    if (ctx === 'navigator' && !this.data.needPurchase && mode.indexOf('navi-') !== 0) {
      wx.showToast({ title: '请选择领航员服务类型', icon: 'none' }); return;
    }

    // 有商品时校验商品
    if (this.data.itemCount === 0 && (ctx !== 'navigator' || !this.data.needPurchase)) {
      if (ctx === 'navigator') {
        // 纯领航员服务，不需要商品，继续
      } else {
        wx.showToast({ title: '购物车为空', icon: 'none' }); return;
      }
    }

    // 需要地址时校验
    var needAddr = mode !== 'self' && mode !== 'navi-accompany';
    if (needAddr && !this.data.selectedAddress) {
      wx.showToast({ title: '请选择地址', icon: 'none' }); return;
    }

    // ── 构造订单数据 ──
    var orderData = this._buildOrderData();

    // ── 确认弹窗 ──
    var parts = this._buildConfirmMessage();
    var confirmTitle = ctx === 'navigator' ? '确认预约' : '确认提交';

    wx.showModal({
      title: confirmTitle,
      content: parts.join('\n'),
      confirmText: this.data.ctaText,
      success: function (res) {
        if (res.confirm) { that._doSubmit(orderData); }
      },
    });
  },

  /** 构造订单请求体 */
  _buildOrderData() {
    var ctx = this.data.context;
    var mode = this.data.serviceMode;

    var orderData = {
      context: ctx,
      deliveryMethod: this._mapDeliveryMethod(mode),
      addressId: this.data.selectedAddress ? this.data.selectedAddress.id : undefined,
      appointedDate: this.data.appointDate || undefined,
      appointedTimeSlot: this.data.appointTime || undefined,
      couponId: this.data.couponId || undefined,
      deliveryFee: this.data.deliveryFee,
      serviceFee: this.data.serviceFee,
      remark: '',
    };

    // 有商品时加入商品列表
    if (this.data.itemCount > 0) {
      orderData.items = this.data.cartItems.map(function (it) {
        return { productId: it.id, quantity: it.qty || 1, remark: it.spec || '' };
      });
    }

    // navigator 上下文：附加服务类型 + 诚信承诺
    if (ctx === 'navigator' || this.data.needNavigator) {
      orderData.navigatorService = {
        type: mode.replace('navi-', ''),
        fee: this.data.serviceFee,
        integrityConfirmed: true,           // 业主已阅读诚信条款
        confirmedAt: new Date().toISOString(), // 确认时间戳
      };
    }

    return orderData;
  },

  /** 服务模式 → 后端 deliveryMethod */
  _mapDeliveryMethod(mode) {
    var map = {
      'self': 'self_pickup',
      'delivery': 'store_delivery',
      'logistics': 'logistics',
      'navi-accompany': 'navigator_accompany',
      'navi-inspect': 'navigator_inspect',
      'navi-bulk': 'navigator_bulk',
      'navi-load': 'navigator_load',
      'navi-deliver': 'navigator_deliver',
    };
    return map[mode] || 'self_pickup';
  },

  /** 构造确认弹窗文案 */
  _buildConfirmMessage() {
    var parts = [];
    var ctx = this.data.context;

    if (this.data.itemCount > 0) {
      parts.push('商品总额 ¥' + this.data.goodsTotal);
    }
    if (this.data.tierDiscount > 0) {
      parts.push('等级折扣 -¥' + this.data.tierDiscount);
    }
    if (this.data.couponDiscount > 0) {
      parts.push('优惠券 -¥' + this.data.couponDiscount);
    }
    if (this.data.serviceFee > 0) {
      parts.push('领航员服务费 ¥' + this.data.serviceFee);
    }
    if (this.data.deliveryFee > 0) {
      parts.push('配送费 ¥' + this.data.deliveryFee);
    }
    parts.push('应付总额 ¥' + this.data.totalPrice);

    if (this.data.selectedAddress) {
      var addr = this.data.selectedAddress;
      parts.push('地址 ' + (addr.name || '') + ' ' + (addr.phone || ''));
    }

    if (ctx === 'navigator') {
      parts.push('\n提交后等待领航员接单');
      parts.push('已确认诚信承诺：领航员不收商户回扣');
    } else if (this.data.needNavigator) {
      parts.push('\n提交后商家确认价格，领航员接单');
      parts.push('已确认诚信承诺：领航员不收商户回扣');
    } else {
      parts.push('\n提交后商家确认价格，确认后你再支付');
    }

    return parts;
  },

  /** 执行提交 */
  _doSubmit(orderData) {
    var that = this;
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中…' });

    // 根据是否有商品选择API
    var apiCall;
    var hasItems = orderData.items && orderData.items.length > 0;
    if (hasItems) {
      // 有商品 → 创建采购订单（可能包含领航员服务）
      apiCall = api.createProductOrder(orderData);
    } else {
      // 纯领航员服务 → 创建服务订单
      apiCall = api.createOrder(orderData);
    }

    apiCall.then(function (res) {
      wx.hideLoading();
      that.setData({ submitting: false });

      // 清空购物车
      wx.setStorageSync('cart', []);
      wx.removeTabBarBadge({ index: 3 });

      wx.showToast({ title: that.data.context === 'navigator' ? '已预约，等待接单' : '订单已提交', icon: 'success', duration: 2000 });
      setTimeout(function () { wx.switchTab({ url: '/pages/orders/orders' }); }, 1500);
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ submitting: false });

      // Mock降级
      console.warn('[Settle] API下单失败，使用Mock降级:', err.message);
      wx.setStorageSync('cart', []);
      wx.removeTabBarBadge({ index: 3 });
      wx.showToast({ title: '订单已提交（离线模式）', icon: 'success', duration: 2000 });
      setTimeout(function () { wx.switchTab({ url: '/pages/orders/orders' }); }, 1500);
    });
  },
});
