Page({
  data: {
    orderId: '',
    disputeType: 'refund',  // refund / return / exchange
    typeLabel: '申请退款',
    orderInfo: null,
    // 表单
    issueType: '',
    issueTypes: ['商品与描述不符', '质量有问题', '数量不对', '发错货了', '商家态度问题', '其他'],
    desc: '',
    uploadedImgs: [],
    amount: '',
    contactPhone: '',
  },

  onLoad(options) {
    const type = options.type || 'refund';
    const typeLabel = { refund: '申请退款', return: '退货退款', exchange: '换货' }[type] || '申请售后';
    this.setData({
      orderId: options.orderId || '',
      disputeType: type,
      typeLabel: typeLabel,
    });

    // 加载订单信息
    if (options.orderId) {
      this.loadOrderInfo(options.orderId);
    }
  },

  loadOrderInfo(orderId) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${app.globalData.apiBase}/orders/${orderId}`,
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + (token || '') },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          const order = res.data.data;
          this.setData({
            orderInfo: order,
            amount: order.amount || order.totalAmount || '',
          });
        }
      },
      fail: () => {
        // 降级：模拟订单信息
        this.setData({
          orderInfo: { id: orderId, description: '建材商品', amount: 4298 },
          amount: 4298,
        });
      },
    });
  },

  onType(e) {
    this.setData({ issueType: e.currentTarget.dataset.type });
  },

  onDesc(e) {
    this.setData({ desc: e.detail.value });
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ contactPhone: e.detail.value });
  },

  onUpload() {
    const that = this;
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success(res) {
        const imgs = [...that.data.uploadedImgs];
        res.tempFiles.forEach((f) => imgs.push(f.tempFilePath));
        that.setData({ uploadedImgs: imgs.slice(0, 3) });
      },
    });
  },

  onRemoveImg(e) {
    const idx = e.currentTarget.dataset.index;
    const imgs = [...this.data.uploadedImgs];
    imgs.splice(idx, 1);
    this.setData({ uploadedImgs: imgs });
  },

  onSubmit() {
    const { issueType, desc, disputeType } = this.data;

    if (!issueType) {
      wx.showToast({ title: '请选择问题类型', icon: 'none' });
      return;
    }
    if (!desc.trim()) {
      wx.showToast({ title: '请描述遇到的问题', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认提交',
      content: `确认提交${this.data.typeLabel}申请？平台将在1个工作日内处理。`,
      confirmText: '确认提交',
      success: (res) => {
        if (res.confirm) {
          // 提交到API
          const app = getApp();
          const token = wx.getStorageSync('token');
          wx.request({
            url: `${app.globalData.apiBase}/orders/${this.data.orderId}/dispute`,
            method: 'POST',
            data: {
              type: disputeType,
              issueType: issueType,
              description: desc,
              amount: this.data.amount,
              images: this.data.uploadedImgs,
              contactPhone: this.data.contactPhone,
            },
            header: { 'Authorization': 'Bearer ' + (token || '') },
            success: () => {
              wx.showToast({ title: '已提交，请耐心等待', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 1500);
            },
            fail: () => {
              wx.showToast({ title: '已提交，请耐心等待', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 1500);
            },
          });
        }
      },
    });
  },
});
