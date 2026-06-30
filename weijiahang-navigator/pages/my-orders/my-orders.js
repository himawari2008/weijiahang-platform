var app = getApp();
var api = require('../../utils/api');

Page({
  data: {
    // Tab 切换
    currentTab: 'active',       // 'active' | 'history'
    tabOptions: [
      { key: 'active', label: '进行中' },
      { key: 'history', label: '已完成' }
    ],

    // 订单数据
    activeOrders: [],
    historyOrders: [],
    displayOrders: [],           // 当前 tab 展示的订单（已预计算完）

    // 状态
    loading: true,
    refreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    loadError: false,
    errorMsg: '',

    // 空态
    emptyText: '暂无进行中的订单',
    emptyHint: '新订单将通过接单大厅获取',
  },

  /* ========== 生命周期 ========== */

  onLoad: function () {
    this.loadOrders('active');
  },

  onShow: function () {
    // 每次显示刷新
    this.loadOrders(this.data.currentTab, true);
  },

  onPullDownRefresh: function () {
    this.setData({ refreshing: true, page: 1 });
    this.loadOrders(this.data.currentTab, true);
  },

  /* ========== 加载订单 ========== */

  loadOrders: function (tab, silent) {
    var that = this;

    if (!silent) {
      that.setData({ loading: true, loadError: false, errorMsg: '' });
    }

    var status = tab === 'active' ? 'active' : 'completed';

    api.getMyOrders(status).then(function (data) {
      var list = data.list || data;
      if (!Array.isArray(list)) list = [];

      // 预计算展示字段（WXML 不能使用 .filter() .toFixed() .slice()）
      var computedOrders = that._prepareOrders(list, tab);

      var dataObj = {};
      if (tab === 'active') {
        dataObj.activeOrders = list;
        dataObj.displayOrders = computedOrders;
        dataObj.emptyText = '暂无进行中的订单';
        dataObj.emptyHint = '新订单将通过接单大厅获取';
      } else {
        dataObj.historyOrders = list;
        dataObj.displayOrders = computedOrders;
        dataObj.emptyText = '暂无历史订单';
        dataObj.emptyHint = '完成订单后会在这里出现';
      }

      dataObj.loading = false;
      dataObj.refreshing = false;
      dataObj.loadError = false;
      dataObj.hasMore = list.length >= that.data.pageSize;

      that.setData(dataObj);
      wx.stopPullDownRefresh();

    }).catch(function (err) {
      var errMsg = (err && err.message) || '加载失败';
      that.setData({
        loading: false,
        refreshing: false,
        loadError: true,
        errorMsg: errMsg
      });
      wx.stopPullDownRefresh();

      if (!silent) {
        wx.showToast({ title: errMsg, icon: 'none' });
      }
    });
  },

  /**
   * 预计算订单展示字段
   * 所有 WXML 需要的格式化值都在这里完成
   */
  _prepareOrders: function (orders, tab) {
    var result = [];
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      var status = o.status || '';
      var serviceType = o.serviceType || o.type || 'navigation';
      var amount = o.amount || 0;
      var income = o.income || o.navigatorIncome || Math.round(amount * 0.8);

      // 状态标签预计算
      var statusLabel = '';
      var statusClass = '';
      var statusDotClass = '';
      switch (status) {
        case 'accepted':
          statusLabel = '已接单';
          statusClass = 's-accepted';
          statusDotClass = 'dot-accepted';
          break;
        case 'arrived':
          statusLabel = '已到达';
          statusClass = 's-arrived';
          statusDotClass = 'dot-arrived';
          break;
        case 'serving':
          statusLabel = '服务中';
          statusClass = 's-serving';
          statusDotClass = 'dot-serving';
          break;
        case 'completed':
          statusLabel = '已完成';
          statusClass = 's-completed';
          statusDotClass = 'dot-completed';
          break;
        case 'cancelled':
          statusLabel = '已取消';
          statusClass = 's-cancelled';
          statusDotClass = 'dot-cancelled';
          break;
        default:
          statusLabel = '待处理';
          statusClass = 's-pending';
          statusDotClass = 'dot-pending';
      }

      // 服务类型标签
      var typeLabel = '';
      switch (serviceType) {
        case 'navigation': typeLabel = '导航'; break;
        case 'accompany': typeLabel = '陪逛'; break;
        case 'inspection': typeLabel = '验货'; break;
        default: typeLabel = '服务';
      }

      // 时间字段
      var createdAt = o.createdAt || o.createTime || '';
      var completedAt = o.completedAt || o.completeTime || '';

      // 金额文本
      var amountText = String(amount);
      var incomeText = String(income);

      // 店铺名称
      var shopName = o.shopName || o.marketName || '未知店铺';

      // 倒计时（进行中订单）
      var countdownText = '';
      var isUrgent = false;
      if (tab === 'active' && status === 'accepted') {
        // 计算从接单到现在的剩余时间（15分钟窗口）
        var acceptTime = o.acceptedAt || o.createdAt;
        if (acceptTime) {
          var acceptTs = typeof acceptTime === 'number' ? acceptTime : new Date(acceptTime).getTime();
          var elapsed = Date.now() - acceptTs;
          var remainingMs = 15 * 60 * 1000 - elapsed;
          var remainingMin = Math.max(0, Math.ceil(remainingMs / 60000));
          countdownText = '剩余' + String(remainingMin) + '分钟';
          isUrgent = remainingMin <= 3;
        }
      }

      result.push({
        id: o.id,
        orderNo: o.orderNo || o.id,
        status: status,
        statusLabel: statusLabel,
        statusClass: statusClass,
        statusDotClass: statusDotClass,
        serviceType: serviceType,
        typeLabel: typeLabel,
        amount: amount,
        amountText: amountText,
        income: income,
        incomeText: incomeText,
        shopName: shopName,
        description: o.description || '',
        category: o.category || '',
        customerName: o.customerName || '',
        customerPhone: o.customerPhone || '',
        createdAt: createdAt,
        completedAt: completedAt,
        countdownText: countdownText,
        isUrgent: isUrgent,
        address: o.shopAddress || o.address || '',
        marketName: o.marketName || '',
        remark: o.remark || ''
      });
    }

    // 进行中排序：先按时间倒序
    return result;
  },

  /* ========== Tab 切换 ========== */

  onTabChange: function (e) {
    var tab = e.currentTarget.dataset.key;
    if (tab === this.data.currentTab) return;

    this.setData({
      currentTab: tab,
      displayOrders: [],
      loading: true
    });

    this.loadOrders(tab);
  },

  /* ========== 点击订单 ========== */

  onOrderTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id });
    }
  },

  /* ========== 刷新 ========== */

  onRefresh: function () {
    this.setData({ refreshing: true, page: 1 });
    this.loadOrders(this.data.currentTab, true);
  },

  onRetry: function () {
    this.loadOrders(this.data.currentTab);
  }
});
