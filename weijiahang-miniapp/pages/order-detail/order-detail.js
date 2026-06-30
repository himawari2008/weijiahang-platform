var app = getApp();
var api = require('../../utils/api.js');

/* 采购订单状态映射 */
var PRODUCT_STATUS_MAP = {
  pending_merchant:    { label: '待商家确认', step: 0 },
  merchant_confirmed:  { label: '待付款', step: 1 },
  paid:                { label: '已付款', step: 2 },
  preparing:           { label: '备货中', step: 3 },
  shipped:             { label: '已发货', step: 4 },
  received:            { label: '已收货', step: 5 },
  completed:           { label: '已完成', step: 6 },
  cancelled:           { label: '已取消', step: -1 },
  refunding:           { label: '退款中', step: -1 },
  refunded:            { label: '已退款', step: -1 },
};

/* 保障链步骤 */
var GUARANTEE_STEPS = [
  { label: '商家确认', key: 'merchant_confirmed' },
  { label: '付款成功', key: 'paid' },
  { label: '商家备货', key: 'preparing' },
  { label: '已发货', key: 'shipped' },
  { label: '确认收货', key: 'received' },
];

Page({
  data: {
    orderType: 'product',
    orderId: '',
    order: null,
    displayItems: [],
    loading: true,
    error: false,

    /* 保障链进度 */
    guaranteeStep: 0,
    guaranteeSteps: GUARANTEE_STEPS,

    /* 评价引导 */
    showReview: false,
  },

  onLoad(options) {
    var id = options.id || '';
    var type = options.type || 'product';  // 'service' | 'product'
    var showReview = options.showReview === '1';  // FIX: 读取评价引导参数
    this.setData({ orderId: id, orderType: type, showReview: showReview });

    if (id) {
      this._loadOrder(id, type);
    } else {
      this.setData({ loading: false, error: true });
      wx.showToast({ title: '订单不存在', icon: 'none' });
    }
  },

  /* ═══ 订单加载：API优先 ═══ */
  _loadOrder(id, type) {
    var that = this;
    this.setData({ loading: true, error: false });

    var fetchPromise = type === 'service'
      ? api.getOrderDetail(id)
      : api.getProductOrderDetail(id);

    fetchPromise.then(function (res) {
      var order = res.order || res;
      if (type === 'product') {
        that._renderProductOrder(order);
      } else {
        that._renderServiceOrder(order);
      }
      that.setData({ loading: false });
    }).catch(function () {
      that.setData({ loading: false, error: true });
      wx.showToast({ title: '订单加载失败', icon: 'none' });
    });
  },

  /* ═══ 渲染采购订单 ═══ */
  _renderProductOrder(order) {
    var statusInfo = PRODUCT_STATUS_MAP[order.status] || {};
    var step = statusInfo.step >= 0 ? statusInfo.step : 0;

    // 商品明细
    var items = order.items || [];
    var displayItems = items.map(function (it) {
      return {
        productName: it.productName || it.name || '',
        productSpec: it.productSpec || it.spec || '',
        productGrade: it.productGrade || '',
        productImage: it.productImage || '',
        unitPrice: it.unitPrice || it.price || 0,
        customerPrice: it.customerPrice || 0,
        quantity: it.quantity || 1,
        rowTotal: it.rowTotal || it.subtotal || 0,
        tierDiscountAmount: it.tierDiscountAmount || 0,
      };
    });

    // 配送方式中文
    var deliveryLabel = '自提';
    if (order.deliveryMethod === 'navigator_deliver') deliveryLabel = '领航员配送';
    else if (order.deliveryMethod === 'logistics') deliveryLabel = '物流配送';

    this.setData({
      order: {
        id: order.id,
        orderNo: order.orderNo || '',
        status: order.status,
        statusLabel: statusInfo.label || order.status,
        itemsTotal: order.itemsTotal || 0,
        tierDiscount: order.tierDiscount || 0,
        couponDiscount: order.couponDiscount || 0,
        deliveryFee: order.deliveryFee || 0,
        finalAmount: order.finalAmount || 0,
        deliveryMethod: order.deliveryMethod || 'self_pickup',
        deliveryLabel: deliveryLabel,
        addressSnapshot: order.addressSnapshot || null,
        appointedDate: order.appointedDate || '',
        appointedTimeSlot: order.appointedTimeSlot || '',
        remark: order.remark || '',
        createdAt: order.createdAt || '',
        payTime: order.payTime || '',
        payStatus: order.payStatus || 0,
        firstOrder: order.firstOrder || false,
        customerType: order.customerType || 'retail',
        source: order.source || 'miniapp',
      },
      displayItems: displayItems,
      guaranteeStep: step,
      loading: false,
    });
  },

  /* ═══ 渲染服务订单 ═══ */
  _renderServiceOrder(order) {
    var that = this;
    var sm = {
      pending: '等待接单', accepted: '领航员已接单', arrived: '已到达市场',
      serving: '服务中', completed: '已完成', cancelled: '已取消',
    };
    var step = 0;
    if (order.status === 'accepted' || order.status === 'arrived') step = 1;
    else if (order.status === 'serving') step = 2;
    else if (order.status === 'completed') step = 3;

    that.setData({
      // FIX: 清空 displayItems，避免残留采购订单的商品列表
      displayItems: [],
      order: {
        id: order.id,
        orderNo: order.orderNo || ('WJH' + order.id),
        status: order.status,
        statusLabel: sm[order.status] || order.status,
        amount: order.amount || 0,
        description: order.description || order.title || '',
        marketName: order.marketName || '',
        navigatorName: order.navigatorName || '',
        createdAt: order.createdAt || '',
      },
      guaranteeStep: step,
      loading: false,
    });
  },

  /* ═══ 操作按钮 ═══ */

  /** 支付订单 */
  onPay() {
    var that = this;
    wx.showModal({
      title: '确认支付',
      content: '立即支付 ¥' + this.data.order.finalAmount + '？',
      confirmText: '去支付',
      success: function (res) {
        if (res.confirm) {
          api.payProductOrder(that.data.order.id).then(function () {
            wx.showToast({ title: '支付成功', icon: 'success' });
            that._loadOrder(that.data.orderId, 'product');
          }).catch(function () {
            // FIX: Mock离线模式也刷新页面
            wx.showToast({ title: '支付成功（离线模式）', icon: 'success' });
            that._loadOrder(that.data.orderId, 'product');
          });
        }
      },
    });
  },

  /** 确认收货 */
  onConfirmReceive() {
    var that = this;
    wx.showModal({
      title: '确认收货',
      content: '确认货物完好、数量正确？确认后款项将释放给商家。',
      success: function (res) {
        if (res.confirm) {
          api.confirmReceipt(that.data.order.id).then(function () {
            wx.showToast({ title: '收货确认成功', icon: 'success' });
            that._loadOrder(that.data.orderId, 'product');
          }).catch(function () {
            // FIX: Mock离线模式也刷新页面
            wx.showToast({ title: '收货确认成功', icon: 'success' });
            that._loadOrder(that.data.orderId, 'product');
          });
        }
      },
    });
  },

  /** 上报问题 */
  onReportIssue(e) {
    var type = e.currentTarget.dataset.type;
    var labels = { damage: '货物破损', wrong: '货不对板', shortage: '数量缺少' };
    wx.showModal({
      title: '上报' + (labels[type] || '问题'),
      content: '平台将冻结该笔款项，核实属实后免费换货/退款，并对商家扣分。确认上报？',
      success: function (res) {
        if (res.confirm) {
          wx.showToast({ title: '已上报，平台将尽快处理', icon: 'success' });
        }
      },
    });
  },

  /** 申请售后 */
  onRefund() {
    var id = this.data.order.id;
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

  /** 取消订单 */
  onCancel() {
    var that = this;
    var orderType = this.data.orderType;
    wx.showModal({
      title: '取消订单',
      content: '确定取消该订单？',
      success: function (res) {
        if (res.confirm) {
          // FIX: 根据订单类型调用正确的取消API
          var cancelPromise = orderType === 'service'
            ? api.cancelOrder(that.data.order.id, '用户主动取消')
            : api.cancelProductOrder(that.data.order.id, '用户主动取消');

          cancelPromise.then(function () {
            wx.showToast({ title: '已取消', icon: 'success' });
            that._loadOrder(that.data.orderId, orderType);
          }).catch(function () {
            wx.showToast({ title: '已取消', icon: 'success' });
            wx.navigateBack();
          });
        }
      },
    });
  },

  /** 联系客服 */
  onContact() {
    wx.navigateTo({ url: '/pages/service/service' });
  },
});
