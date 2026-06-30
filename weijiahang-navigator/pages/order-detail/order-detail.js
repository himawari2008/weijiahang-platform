var app = getApp();

Page({
  data: {
    orderId: '',
    order: null,
    statusSteps: [],
    loading: true,
    loadError: false,
    errorMsg: '',

    // map
    mapLat: 34.329,
    mapLng: 108.952,
    markers: [],
    polyline: [],

    // button states
    canArrive: false,
    canServe: false,
    canComplete: false,
    canCallUser: false,
    // 转单相关
    showTransferModal: false,
    transferReason: '',
    transferReasons: ['客户要求更换', '距离太远', '个人原因无法继续', '其他'],
    transferring: false,
  },

  onLoad: function (options) {
    this.setData({ orderId: options.id || '' });
    this.loadOrder();
  },

  onShow: function () {
    // 从验货页返回时刷新订单状态
    if (this.data.order && this.data.order.status === 'serving') {
      this.loadOrder();
    }
  },

  // ========== 数据加载 ==========

  loadOrder: function () {
    var that = this;
    var orderId = this.data.orderId;

    that.setData({ loading: true, loadError: false });

    if (!orderId) {
      // 无订单ID → 显示空状态
      that.setData({
        loading: false,
        order: null,
      });
      wx.showToast({ title: '订单不存在', icon: 'none' });
      return;
    }

    var api = require('../../utils/api');
    api.getOrderDetail(orderId).then(function (order) {
      that.setData({
        loading: false,
        order: order,
        mapLat: order.shopLat || 34.329,
        mapLng: order.shopLng || 108.952,
      });
      that.refreshOrderUI(order);
    }).catch(function (err) {
      that.setData({
        loading: false,
        loadError: true,
        errorMsg: (err && err.message) || '网络异常，请下拉刷新重试',
      });
    });
  },

  refreshOrderUI: function (order) {
    if (!order) return;

    var steps = this.calcSteps(order.status);
    var status = order.status;

    this.setData({
      statusSteps: steps,
      canArrive: status === 'accepted',
      canServe: status === 'arrived',
      canComplete: status === 'serving',
      canCallUser: status === 'accepted' || status === 'arrived' || status === 'serving',
      markers: this.buildMarkers(order),
      polyline: this.buildPolyline(order),
    });
  },

  // ========== 状态步骤 ==========

  calcSteps: function (status) {
    var statusOrder = ['accepted', 'arrived', 'serving', 'completed'];
    var labels = {
      accepted: '已接单',
      arrived: '已到达',
      serving: '服务中',
      completed: '已完成',
    };
    var currentIdx = statusOrder.indexOf(status);
    if (currentIdx === -1) currentIdx = 0;

    var steps = [];
    for (var i = 0; i < statusOrder.length; i++) {
      var key = statusOrder[i];
      var s = i < currentIdx ? 'completed' : i === currentIdx ? 'active' : 'inactive';
      steps.push({
        key: key,
        label: labels[key],
        status: s,
        rightLineClass: '',
      });
    }

    // 给每个步骤设置右侧连接线样式（最后一个步骤没有右侧连线）
    for (var i = 0; i < steps.length; i++) {
      if (i < steps.length - 1) {
        // 线变蓝的前提是：当前步骤已完全完成（不是进行中）
        steps[i].rightLineClass = steps[i].status === 'completed' ? 'line-completed' : 'line-inactive';
      }
    }

    return steps;
  },

  // ========== 地图标注 ==========

  buildMarkers: function (order) {
    var markers = [];
    if (!order) return markers;

    // 店铺标记
    if (order.shopLat && order.shopLng) {
      markers.push({
        id: 1,
        latitude: order.shopLat,
        longitude: order.shopLng,
        title: order.shopName || '店铺',
        iconPath: '/images/marker-shop.png',
        width: 36,
        height: 44,
        callout: {
          content: order.shopName || '目标店铺',
          fontSize: 13,
          padding: 6,
          borderRadius: 4,
          display: 'ALWAYS',
          bgColor: '#ffffff',
          color: '#1A1A2E',
        },
      });
    }

    // 领航员当前位置
    var curLoc = app.globalData.currentLocation;
    if (curLoc && curLoc.latitude && curLoc.longitude) {
      markers.push({
        id: 2,
        latitude: curLoc.latitude,
        longitude: curLoc.longitude,
        title: '我的位置',
        iconPath: '/images/marker-nav.png',
        width: 28,
        height: 28,
      });
    }

    return markers;
  },

  buildPolyline: function (order) {
    var curLoc = app.globalData.currentLocation;
    if (
      curLoc && curLoc.latitude && curLoc.longitude &&
      order && order.shopLat && order.shopLng
    ) {
      return [{
        points: [
          { latitude: curLoc.latitude, longitude: curLoc.longitude },
          { latitude: order.shopLat, longitude: order.shopLng },
        ],
        color: '#1677FF',
        width: 4,
        dottedLine: true,
      }];
    }
    return [];
  },

  // ========== 订单操作 ==========

  onArrive: function () {
    var that = this;
    var orderId = this.data.orderId;
    var order = this.data.order;

    if (!order) return;

    // 无订单ID时模拟操作
    if (!orderId) {
      order.status = 'arrived';
      this.setData({ order: order });
      this.refreshOrderUI(order);
      wx.showToast({ title: '已到达', icon: 'success' });
      return;
    }

    var api = require('../../utils/api');
    api.arriveOrder(orderId).then(function () {
      order.status = 'arrived';
      that.setData({ order: order });
      that.refreshOrderUI(order);
      wx.showToast({ title: '已到达', icon: 'success' });
    }).catch(function (err) {
      wx.showToast({
        title: (err && err.message) || '操作失败',
        icon: 'none',
      });
    });
  },

  onStartService: function () {
    var that = this;
    var orderId = this.data.orderId;
    var order = this.data.order;

    if (!order) return;

    // 无订单ID时模拟操作
    if (!orderId) {
      order.status = 'serving';
      this.setData({ order: order });
      this.refreshOrderUI(order);
      wx.navigateTo({ url: '/pages/inspection/inspection?orderId=' + orderId });
      return;
    }

    var api = require('../../utils/api');
    api.startServing(orderId).then(function () {
      order.status = 'serving';
      that.setData({ order: order });
      that.refreshOrderUI(order);
      wx.navigateTo({ url: '/pages/inspection/inspection?orderId=' + orderId });
    }).catch(function (err) {
      wx.showToast({
        title: (err && err.message) || '操作失败',
        icon: 'none',
      });
    });
  },

  onComplete: function () {
    var that = this;
    var order = this.data.order;
    if (!order) return;

    wx.showModal({
      title: '确认完成',
      content: '确认已完成所有服务项目？完成后将不可撤回。',
      success: function (res) {
        if (res.confirm) {
          var orderId = that.data.orderId;

          // 无订单ID时模拟操作
          if (!orderId) {
            order.status = 'completed';
            that.setData({ order: order });
            that.refreshOrderUI(order);
            wx.showToast({ title: '订单已完成', icon: 'success' });
            return;
          }

          var api = require('../../utils/api');
          api.completeOrder(orderId).then(function () {
            order.status = 'completed';
            that.setData({ order: order });
            that.refreshOrderUI(order);
            wx.showToast({ title: '订单已完成', icon: 'success' });
          }).catch(function (err) {
            wx.showToast({
              title: (err && err.message) || '操作失败',
              icon: 'none',
            });
          });
        }
      },
    });
  },

  // ========== 转单 ==========

  onShowTransfer: function () {
    this.setData({ showTransferModal: true, transferReason: '' });
  },

  onHideTransfer: function () {
    this.setData({ showTransferModal: false, transferReason: '' });
  },

  onSelectTransferReason: function (e) {
    var reason = e.currentTarget.dataset.reason;
    this.setData({ transferReason: reason });
  },

  onConfirmTransfer: function () {
    var that = this;
    var orderId = this.data.orderId;
    var reason = this.data.transferReason;

    if (!reason) {
      wx.showToast({ title: '请选择转单原因', icon: 'none' });
      return;
    }

    that.setData({ transferring: true });

    // 无订单ID时模拟操作
    if (!orderId) {
      wx.showToast({ title: '转单申请已提交', icon: 'success' });
      that.setData({ showTransferModal: false, transferring: false });
      setTimeout(function () {
        wx.navigateBack();
      }, 1200);
      return;
    }

    var api = require('../../utils/api');
    api.requestTransfer(orderId, reason).then(function () {
      wx.showToast({ title: '转单成功，订单已释放', icon: 'success' });
      that.setData({ showTransferModal: false, transferring: false });
      setTimeout(function () {
        wx.navigateBack();
      }, 1500);
    }).catch(function (err) {
      wx.showToast({
        title: (err && err.message) || '转单失败',
        icon: 'none',
      });
      that.setData({ transferring: false });
    });
  },

  // ========== 客户联系 ==========

  onCallUser: function () {
    var order = this.data.order;
    if (!order) return;

    wx.showModal({
      title: '联系客户',
      content: '客户 ' + (order.customerName || '未知') + '\n电话：' + (order.customerPhone || '暂无'),
      confirmText: '拨打电话',
      success: function (res) {
        if (res.confirm && order.customerPhone) {
          wx.makePhoneCall({
            phoneNumber: order.customerPhone,
            fail: function () {
              wx.showToast({ title: '拨号失败', icon: 'none' });
            },
          });
        }
      },
    });
  },

  // ========== 地图操作 ==========

  onOpenMap: function () {
    var order = this.data.order;
    if (!order || !order.shopLat || !order.shopLng) {
      wx.showToast({ title: '暂无店铺位置信息', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude: order.shopLat,
      longitude: order.shopLng,
      name: order.shopName || '目标店铺',
      address: order.shopAddress || '',
      scale: 18,
    });
  },

  onMapError: function () {
    // 地图加载失败时静默处理，不影响页面使用
  },

  // ========== 刷新 ==========

  onPullDownRefresh: function () {
    this.loadOrder();
    wx.stopPullDownRefresh();
  },

  onRefresh: function () {
    this.loadOrder();
  },
});
