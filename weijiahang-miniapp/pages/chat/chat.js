const app = getApp();
const ws = require('../../utils/websocket');

Page({
  data: {
    chatId: '',
    chatName: '',
    chatType: '',     // shop / navigator / system
    chatIcon: '店',
    avatarBg: '#FF6B35',
    text: '',
    scrollTo: '',
    msgs: [],
    // 对方状态
    partnerOnline: true,
    partnerTyping: false,
    // 图片预览
    previewImg: '',
  },

  onLoad(options) {
    const { id, name, type } = options;
    const iconMap = { shop: '店', navigator: '领', system: '航' };
    const bgMap = { shop: '#FF6B35', navigator: '#5B9BD5', system: '#999' };
    this.setData({
      chatId: id,
      chatName: name || '对话',
      chatType: type || 'shop',
      chatIcon: iconMap[type] || '店',
      avatarBg: bgMap[type] || '#FF6B35',
    });

    // 加载历史消息
    this.loadHistory(id);

    // 注册WebSocket新消息
    ws.on('message', this.onWsMessage.bind(this));
    ws.on('typing', this.onWsTyping.bind(this));

    // 确保WebSocket已连接
    ws.connect();
  },

  onUnload() {
    ws.off('message', this.onWsMessage);
    ws.off('typing', this.onWsTyping);
  },

  /** 加载历史消息 */
  loadHistory(chatId) {
    // 尝试从API加载
    wx.request({
      url: `${app.globalData.apiBase}/messages/conversations/${chatId}/messages`,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + (wx.getStorageSync('token') || ''),
      },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          const msgs = this.formatMessages(res.data.data || []);
          this.setData({ msgs, scrollTo: msgs.length ? `msg-${msgs[msgs.length - 1].id}` : '' });
          return;
        }
        this.loadLocalHistory(chatId);
      },
      fail: () => {
        this.loadLocalHistory(chatId);
      },
    });
  },

  /** 格式化消息 */
  formatMessages(list) {
    return list.map((m) => ({
      id: m.id,
      from: m.from === 'me' || m.senderId === 'me' ? 'me' : 'other',
      text: m.text || m.content || '',
      image: m.image || m.imageUrl || '',
      orderCard: m.orderCard || null,
      orderId: m.orderId || '',
      time: m.createdAt || m.time || '',
      voicePath: m.voicePath || '',
      voiceDuration: m.voiceDuration || 0,
    }));
  },

  /** 降级：本地模拟消息 */
  loadLocalHistory(chatId) {
    const shopMsgs = [
      { id: 1, from: 'me', text: '你好，请问800×800亮面瓷砖有现货吗？' },
      { id: 2, from: 'other', text: '有的！东鹏和马可波罗都有，你要哪个品牌？价位不一样的。' },
      { id: 3, from: 'me', text: '东鹏的多少钱一平方？' },
      { id: 4, from: 'other', text: '东鹏大理石瓷砖128元/㎡，马可波罗仿古砖88元/㎡。量大可以优惠。' },
      { id: 5, from: 'other', text: '你大概需要多少平方？我可以帮你算一下用量。' },
    ];

    const naviMsgs = [
      { id: 1, from: 'me', text: '你好，我到A区了，你在哪里？' },
      { id: 2, from: 'other', text: '我在A区3排15号，老李瓷砖批发门口等你。你从北门进来往左拐就看到了。' },
      { id: 3, from: 'me', text: '好的，马上到。' },
    ];

    const systemMsgs = [
      { id: 1, from: 'other', text: '你的订单WJH20260618001已完成收货确认，交易保障已生效。如有问题请联系客服。' },
      { id: 2, from: 'other', text: '订单详情：东鹏大理石瓷砖50㎡+九牧马桶1台，总计¥4298。' },
    ];

    const msgs = this.data.chatType === 'navigator' ? naviMsgs
      : this.data.chatType === 'system' ? systemMsgs
      : shopMsgs;

    this.setData({ msgs, scrollTo: `msg-${msgs[msgs.length - 1].id}` });
  },

  /** WebSocket 收到新消息 */
  onWsMessage(data) {
    // 检查是否是当前会话的消息
    if (data.conversationId === this.data.chatId || data.senderId === this.data.chatId) {
      const newMsg = {
        id: data.id || Date.now(),
        from: 'other',
        text: data.text || data.content || '',
        image: data.image || '',
        orderCard: data.orderCard || null,
        orderId: data.orderId || '',
      };
      const msgs = [...this.data.msgs, newMsg];
      this.setData({ msgs, scrollTo: `msg-${newMsg.id}` });
      wx.vibrateShort({ type: 'light' });
    }
  },

  /** WebSocket 对方正在输入 */
  onWsTyping(data) {
    if (data.conversationId === this.data.chatId) {
      this.setData({ partnerTyping: true });
      clearTimeout(this._typingTimer);
      this._typingTimer = setTimeout(() => {
        this.setData({ partnerTyping: false });
      }, 3000);
    }
  },

  onInput(e) {
    this.setData({ text: e.detail.value });
    // 通知对方正在输入
    if (e.detail.value) {
      ws.send({ type: 'typing', conversationId: this.data.chatId });
    }
  },

  /** 发送消息 */
  onSend() {
    const t = this.data.text.trim();
    if (!t) return;

    const msgId = Date.now();
    const newMsg = { id: msgId, from: 'me', text: t };
    const msgs = [...this.data.msgs, newMsg];
    this.setData({ msgs, text: '', scrollTo: `msg-${msgId}` });

    // 通过WebSocket发送
    ws.sendChat(this.data.chatId, { text: t, type: 'text' });

    // 如果WebSocket未连接，降级到HTTP
    if (!ws.isConnected()) {
      this.sendViaHttp(t, msgId);
    }
  },

  /** 发送图片 */
  onSendImage() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const img = res.tempFiles[0].tempFilePath;
        const msgId = Date.now();
        const newMsg = { id: msgId, from: 'me', text: '[图片]', image: img };
        const msgs = [...that.data.msgs, newMsg];
        that.setData({ msgs, scrollTo: `msg-${msgId}` });

        // 上传图片然后发送
        that.uploadAndSend(img, msgId);
      },
    });
  },

  /** 上传图片并发送消息 */
  uploadAndSend(filePath, msgId) {
    wx.uploadFile({
      url: `${app.globalData.apiBase}/upload/image`,
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': 'Bearer ' + (wx.getStorageSync('token') || ''),
      },
      success(res) {
        const data = JSON.parse(res.data);
        if (data.code === 200 && data.data && data.data.url) {
          // 发送图片URL
          ws.sendChat(this.data.chatId, {
            type: 'image',
            imageUrl: data.data.url,
            text: '[图片]',
          });
        }
      },
      fail() {
        wx.showToast({ title: '图片发送失败', icon: 'none' });
      },
    });
  },

  /** HTTP降级发送 */
  sendViaHttp(text, msgId) {
    wx.request({
      url: `${app.globalData.apiBase}/messages/send`,
      method: 'POST',
      data: {
        conversationId: this.data.chatId,
        text: text,
        type: 'text',
      },
      header: {
        'Authorization': 'Bearer ' + (wx.getStorageSync('token') || ''),
      },
      fail() {
        // 即使发送失败也保留消息
        wx.showToast({ title: '消息未送达，请检查网络', icon: 'none' });
      },
    });
  },

  /** 快捷消息 */
  onQuickMsg(e) {
    this.setData({ text: e.currentTarget.dataset.msg });
    this.onSend();
  },

  /** 预览图片 */
  onPreviewImage(e) {
    const { src } = e.currentTarget.dataset;
    wx.previewImage({
      urls: [src],
      current: src,
    });
  },

  /** 查看订单详情 */
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },

  onBack() { wx.navigateBack(); },
});
