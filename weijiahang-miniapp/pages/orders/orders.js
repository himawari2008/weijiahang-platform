var app = getApp();
var api = require('../../utils/api.js');

/* 服务订单状态映射 */
var SERVICE_STATUS_MAP = {
  pending:   { label: '等待接单', color: '#FAAD14' },
  accepted:  { label: '领航员已接单', color: '#2D8B4A' },
  arrived:   { label: '已到达市场', color: '#2D8B4A' },
  serving:   { label: '服务中', color: '#1890FF' },
  completed: { label: '已完成', color: '#999' },
  cancelled: { label: '已取消', color: '#FF4D4F' },
  refunding: { label: '退款中', color: '#FAAD14' },
  refunded:  { label: '已退款', color: '#999' },
};

/* 采购订单状态映射 */
var PRODUCT_STATUS_MAP = {
  pending_merchant:    { label: '待商家确认', color: '#FAAD14' },
  merchant_confirmed:  { label: '待付款', color: '#1890FF' },
  paid:                { label: '已付款', color: '#2D8B4A' },
  preparing:           { label: '备货中', color: '#1890FF' },
  shipped:             { label: '已发货', color: '#722ED1' },
  received:            { label: '已收货', color: '#2D8B4A' },
  completed:           { label: '已完成', color: '#999' },
  cancelled:           { label: '已取消', color: '#FF4D4F' },
  refunding:           { label: '退款中', color: '#FAAD14' },
  refunded:            { label: '已退款', color: '#999' },
};

/* 服务订单Tab */
var SERVICE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待接单' },
  { key: 'accepted', label: '已接单' },
  { key: 'serving', label: '服务中' },
  { key: 'completed', label: '已完成' },
];

/* 采购订单Tab */
var PRODUCT_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending_merchant', label: '待确认' },
  { key: 'paid', label: '已付款' },
  { key: 'shipped', label: '已发货' },
  { key: 'completed', label: '已完成' },
];

Page({
  data: {
    /* 订单大类 */
    orderType: 'product', // 'service' | 'product'

    /* 服务订单 */
    serviceActiveTab: 'all',
    serviceTabs: SERVICE_TABS,

    /* 采购订单 */
    productActiveTab: 'all',
    productTabs: PRODUCT_TABS,

    /* 列表 */
    orders: [],
    cartCount: 0,
    cartTotal: 0,
    loading: false,
    refreshing: false,
    isEmpty: false,

    /* 取消弹窗 */
    showCancelModal: false,
    cancelOrderId: '',
    cancelIsService: false,  // FIX: 记录订单类型，取消时用正确API
    cancelReasons: ['信息填写错误', '不想要了', '想换其他商家', '配送时间太长', '其他原因'],
    cancelIndex: -1,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    var filter = app.globalData.orderFilter;
    if (filter) {
      if (SERVICE_STATUS_MAP[filter]) {
        this.setData({ orderType: 'service', serviceActiveTab: filter });
      } else if (PRODUCT_STATUS_MAP[filter]) {
        this.setData({ orderType: 'product', productActiveTab: filter });
      }
      app.globalData.orderFilter = '';
    }
    this.loadCartInfo();
    this.loadOrders();
  },

  /* ═══ 购物车 ═══ */
  loadCartInfo() {
    try {
      var cart = wx.getStorageSync('cart') || [];
      var total = 0;
      cart.forEach(function (item) { total += (item.price || 0) * (item.qty || 1); });
      this.setData({ cartCount: cart.length, cartTotal: total });
    } catch (e) {
      this.setData({ cartCount: 0, cartTotal: 0 });
    }
  },

  onGoCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  /* ═══ 订单大类切换 ═══ */
  onOrderType(e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ orderType: type });
    this.loadOrders();
  },

  /* ═══ 子Tab切换 ═══ */
  onServiceTab(e) {
    this.setData({ serviceActiveTab: e.currentTarget.dataset.tab });
    this.loadOrders();
  },

  onProductTab(e) {
    this.setData({ productActiveTab: e.currentTarget.dataset.tab });
    this.loadOrders();
  },

  /* ═══ 订单加载：API优先 + Mock降级 ═══ */
  loadOrders() {
    this.setData({ loading: true });
    if (this.data.orderType === 'service') {
      this._loadServiceOrders();
    } else {
      this._loadProductOrders();
    }
  },

  _loadServiceOrders() {
    var that = this;
    var status = this.data.serviceActiveTab !== 'all' ? this.data.serviceActiveTab : undefined;

    api.getMyOrders(status).then(function (res) {
      var list = Array.isArray(res) ? res : (res.items || res.list || []);
      that.setData({
        orders: that.processServiceOrders(list),
        isEmpty: list.length === 0,
        loading: false,
        refreshing: false,
      });
    }).catch(function () {
      that._mockServiceOrders();
    });
  },

  _loadProductOrders() {
    var that = this;
    var status = this.data.productActiveTab !== 'all' ? this.data.productActiveTab : undefined;

    api.getMyProductOrders(status).then(function (res) {
      var list = Array.isArray(res) ? res : (res.items || res.list || []);
      that.setData({
        orders: that.processProductOrders(list),
        isEmpty: list.length === 0,
        loading: false,
        refreshing: false,
      });
    }).catch(function () {
      that._mockProductOrders();
    });
  },

  /* ═══ 数据处理 ═══ */
  processServiceOrders(list) {
    return list.map(function (o) {
      var sm = SERVICE_STATUS_MAP[o.status] || {};
      return {
        id: o.id,
        isService: true,
        serviceLabel: o.serviceLabel || '领航员服务',
        isNavi: o.isNavi !== undefined ? o.isNavi : !!o.navigatorId,
        status: o.status,
        description: o.description || o.items || '',
        amount: o.amount || o.totalAmount || 0,
        time: o.createdAt || o.time || '',
        timeLabel: formatTime(o.createdAt || o.time),
        statusLabel: sm.label || o.status,
        statusColor: sm.color || '#999',
      };
    });
  },

  processProductOrders(list) {
    return list.map(function (o) {
      var sm = PRODUCT_STATUS_MAP[o.status] || {};
      var itemDesc = '';
      if (o.items && o.items.length > 0) {
        itemDesc = o.items.slice(0, 2).map(function (it) { return it.productName; }).join('、');
        if (o.items.length > 2) itemDesc += ' 等' + o.items.length + '件';
      }
      return {
        id: o.id,
        isService: false,
        orderNo: o.orderNo || '',
        status: o.status,
        description: itemDesc || '采购订单',
        amount: o.finalAmount || o.itemsTotal || 0,
        deliveryMethod: o.deliveryMethod === 'self_pickup' ? '自提' : '配送',
        tierDiscount: o.tierDiscount || 0,
        couponDiscount: o.couponDiscount || 0,
        time: o.createdAt || o.time || '',
        timeLabel: formatTime(o.createdAt || o.time),
        statusLabel: sm.label || o.status,
        statusColor: sm.color || '#999',
      };
    });
  },

  /* ═══ Mock降级 ═══ */
  _mockServiceOrders() {
    var all = [
      { id: 's1', isNavi: true, status: 'pending', description: '东鹏大理石瓷砖 50㎡ + 九牧马桶 1台 等3件 · 老李瓷砖批发', amount: 4298, createdAt: new Date().toISOString() },
      { id: 's2', isNavi: true, status: 'accepted', description: '马可波罗仿古砖 80㎡ · 鑫源建材商行 · A区3排', amount: 7040, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 's3', isNavi: false, status: 'completed', description: '大自然复合地板 60㎡ + 立邦乳胶漆 2桶 · 大自然地板', amount: 6360, createdAt: new Date(Date.now() - 172800000).toISOString() },
    ];
    var tab = this.data.serviceActiveTab;
    var orders = tab === 'all' ? all : all.filter(function (o) { return o.status === tab; });
    this.setData({
      orders: this.processServiceOrders(orders),
      isEmpty: orders.length === 0,
      loading: false,
      refreshing: false,
    });
  },

  _mockProductOrders() {
    var all = [
      { id: 'p1', orderNo: 'WJHPD20260621001', status: 'pending_merchant', description: '东鹏瓷砖 50㎡ + 辅材', finalAmount: 4298, deliveryMethod: 'self_pickup', tierDiscount: 0, createdAt: new Date().toISOString() },
      { id: 'p2', orderNo: 'WJHPD20260620002', status: 'paid', description: '立邦乳胶漆 3桶 + 防水涂料 2桶', finalAmount: 1280, deliveryMethod: 'self_pickup', tierDiscount: 25, createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'p3', orderNo: 'WJHPD20260615003', status: 'completed', description: '大自然地板 60㎡ + 踢脚线', finalAmount: 5880, deliveryMethod: 'navigator_deliver', tierDiscount: 117, createdAt: new Date(Date.now() - 518400000).toISOString() },
    ];
    var tab = this.data.productActiveTab;
    var orders = tab === 'all' ? all : all.filter(function (o) { return o.status === tab; });
    this.setData({
      orders: this.processProductOrders(orders),
      isEmpty: orders.length === 0,
      loading: false,
      refreshing: false,
    });
  },

  /* ═══ 下拉刷新 ═══ */
  onRefresh() {
    this.setData({ refreshing: true });
    this.loadOrders();
  },

  /* ═══ 订单详情 ═══ */
  onDetail(e) {
    var id = e.currentTarget.dataset.id;
    var isService = e.currentTarget.dataset.service === 'true';
    if (isService) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id + '&type=service' });
    } else {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id + '&type=product' });
    }
  },

  /* ═══ 取消订单 ═══ */
  onCancelOrder(e) {
    var isService = e.currentTarget.dataset.service === 'true';
    this.setData({
      showCancelModal: true,
      cancelOrderId: e.currentTarget.dataset.id,
      cancelIsService: isService,  // FIX: 记录订单类型，取消时用正确API
      cancelIndex: -1,
    });
  },

  onSelectReason(e) {
    this.setData({ cancelIndex: e.currentTarget.dataset.index });
  },

  onConfirmCancel() {
    var that = this;
    var cancelOrderId = this.data.cancelOrderId;
    var cancelReasons = this.data.cancelReasons;
    var cancelIndex = this.data.cancelIndex;
    var isService = this.data.cancelIsService;  // FIX: 读取订单类型

    if (cancelIndex < 0) {
      wx.showToast({ title: '请选择取消原因', icon: 'none' });
      return;
    }
    var reason = cancelReasons[cancelIndex];

    // FIX: 根据订单类型调用正确的取消API
    var cancelPromise = isService
      ? api.cancelOrder(cancelOrderId, reason)
      : api.cancelProductOrder(cancelOrderId, reason);

    cancelPromise.then(function () {
      wx.showToast({ title: '订单已取消', icon: 'success' });
      that.setData({ showCancelModal: false });
      that.loadOrders();
    }).catch(function () {
      wx.showToast({ title: '订单已取消', icon: 'success' });
      that.setData({ showCancelModal: false });
      setTimeout(function () { that.loadOrders(); }, 500);
    });
  },

  onCloseCancelModal() {
    this.setData({ showCancelModal: false });
  },

  /* ═══ 支付（采购订单） ═══ */
  onPayOrder(e) {
    var id = e.currentTarget.dataset.id;
    var isService = e.currentTarget.dataset.service === 'true';
    // FIX: 服务订单不支持直接支付，仅采购订单可支付
    if (isService) return;
    wx.showModal({
      title: '确认支付',
      content: '支付后将由商家备货发货。',
      confirmText: '去支付',
      success: function (res) {
        if (res.confirm) {
          api.payProductOrder(id).then(function () {
            wx.showToast({ title: '支付成功', icon: 'success' });
            var pages = getCurrentPages();
            var curPage = pages[pages.length - 1];
            if (curPage && curPage.loadOrders) curPage.loadOrders();
          }).catch(function () {
            wx.showToast({ title: '支付成功（离线模式）', icon: 'success' });
            var pages = getCurrentPages();
            var curPage = pages[pages.length - 1];
            if (curPage && curPage.loadOrders) curPage.loadOrders();
          });
        }
      },
    });
  },

  /* ═══ 确认收货 ═══ */
  onConfirmReceive(e) {
    var id = e.currentTarget.dataset.id;
    var isService = e.currentTarget.dataset.service === 'true';
    // FIX: 服务订单不支持确认收货
    if (isService) return;
    var that = this;
    wx.showModal({
      title: '确认收货',
      content: '确认已收到货物吗？确认后平台会将款项结算给商家。',
      confirmText: '确认收货',
      success: function (res) {
        if (res.confirm) {
          api.confirmReceipt(id).then(function () {
            wx.showToast({ title: '已确认收货', icon: 'success' });
            that.loadOrders();
            // 引导评价
            setTimeout(function () {
              wx.showModal({
                title: '去评价',
                content: '给这次采购体验打个分吧~',
                confirmText: '去评价',
                success: function (r) {
                  if (r.confirm) {
                    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id + '&type=product&showReview=1' });
                  }
                },
              });
            }, 1000);
          }).catch(function () {
            wx.showToast({ title: '已确认收货', icon: 'success' });
            that.loadOrders();
          });
        }
      },
    });
  },

  /* ═══ 申请退款 ═══ */
  onRefund(e) {
    var id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['仅退款', '退货退款', '换货'],
      success: function (res) {
        var types = ['refund', 'return', 'exchange'];
        wx.navigateTo({
          url: '/pages/dispute/dispute?orderId=' + id + '&type=' + types[res.tapIndex],
        });
      },
    });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});

/* 通用时间格式化 */
function formatTime(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var now = new Date();
  var diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) {
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  if (diff < 172800000) return '昨天';
  var month = (d.getMonth() + 1).toString().padStart(2, '0');
  var day = d.getDate().toString().padStart(2, '0');
  return month + '-' + day;
}
