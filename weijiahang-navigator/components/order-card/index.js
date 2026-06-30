// components/order-card/index.js
// 通用订单卡片组件 — 用于首页抢单列表 + 我的订单列表
Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 订单数据（已预计算展示字段）
    order: {
      type: Object,
      value: {},
      observer: '_onOrderChange'
    },
    // 卡片类型：'pending'（待抢单，有倒计时）| 'active'（进行中）| 'history'（已完成）
    cardType: {
      type: String,
      value: 'pending'
    },
    // 是否显示抢单按钮
    showGrabBtn: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 预计算展示字段（在 observer 中填充）
    id: '',
    serviceType: '',
    typeLabel: '',
    typeClass: '',
    description: '',
    amountText: '',
    incomeText: '',
    distance: '',
    address: '',
    timeAgo: '',
    shopsText: '',
    // 倒计时
    countdownText: '',
    countdownPercent: 0,
    isUrgent: false,
    showCountdown: false,
    // 进行中订单状态
    statusLabel: '',
    statusClass: ''
  },

  methods: {
    _onOrderChange: function (order) {
      if (!order || !order.id) return;

      var serviceType = order.serviceType || 'navigation';
      var typeLabelMap = {
        navigation: '导航单',
        accompany: '陪逛单',
        inspection: '验货单'
      };
      var typeClassMap = {
        navigation: 'tc-ceramic',
        accompany: 'tc-wood',
        inspection: 'tc-stone'
      };

      var data = {
        id: order.id,
        serviceType: serviceType,
        typeLabel: typeLabelMap[serviceType] || '服务单',
        typeClass: typeClassMap[serviceType] || '',
        description: order.description || '',
        amountText: String(order.amount || 0),
        incomeText: String(order.income || order.navigatorIncome || 0),
        distance: order.distance || '--',
        address: order.address || '',
        timeAgo: order.timeAgo || '刚刚',
        shopsText: (order.shops || 1) + '家店',
        showCountdown: this.properties.cardType === 'pending',
        countdownText: order.countdownText || '',
        countdownPercent: order.countdownPercent || 0,
        isUrgent: order.isUrgent || false
      };

      // 进行中订单的状态标签
      if (order.status) {
        var statusMap = {
          'accepted': { label: '已接单', cls: 's-accepted' },
          'arrived': { label: '已到达', cls: 's-arrived' },
          'serving': { label: '服务中', cls: 's-serving' },
          'completed': { label: '已完成', cls: 's-completed' },
          'cancelled': { label: '已取消', cls: 's-cancelled' }
        };
        var s = statusMap[order.status] || { label: order.status, cls: '' };
        data.statusLabel = s.label;
        data.statusClass = s.cls;
      }

      this.setData(data);
    },

    /** 点击卡片 */
    onTap: function () {
      this.triggerEvent('tap', { order: this.properties.order });
    },

    /** 点击抢单按钮 */
    onGrab: function () {
      this.triggerEvent('grab', { id: this.properties.order.id });
    }
  }
});
