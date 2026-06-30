const app = getApp();
const ws = require('../../utils/websocket');

Page({
  data: {
    activeTab: 'all',   // all / shop / navigator / system
    conversations: [],
    unreadTotal: 0,
    loading: false,
    refreshing: false,
    // 空态引导
    isEmpty: false,
  },

  onLoad() {
    // 注册 WebSocket 消息监听
    ws.on('message', this.onNewMessage.bind(this));
    ws.on('notification', this.onNewNotification.bind(this));
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadConversations();
  },

  onUnload() {
    ws.off('message', this.onNewMessage);
    ws.off('notification', this.onNewNotification);
  },

  /** 加载会话列表 */
  loadConversations() {
    this.setData({ loading: true });

    // 尝试从API加载
    wx.request({
      url: `${app.globalData.apiBase}/messages/conversations`,
      method: 'GET',
      header: {
        'Authorization': 'Bearer ' + (wx.getStorageSync('token') || ''),
      },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          const convs = this.processConversations(res.data.data || []);
          this.setData({
            conversations: convs,
            unreadTotal: convs.reduce((sum, c) => sum + (c.unread || 0), 0),
            isEmpty: convs.length === 0,
            loading: false,
            refreshing: false,
          });
          this.updateTabBadge();
          return;
        }
        // API失败，加载本地数据
        this.loadLocalConversations();
      },
      fail: () => {
        this.loadLocalConversations();
      },
    });
  },

  /** 处理会话数据 */
  processConversations(list) {
    return list.map((c, i) => ({
      id: c.id || c.conversationId || `c${i}`,
      type: c.type || 'shop',
      name: c.name || c.partnerName || '未知联系人',
      avatar: c.avatar || '',
      avatarBg: this.getAvatarBg(c.type, i),
      initial: (c.name || '未')[0],
      lastMsg: c.lastMessage || c.lastMsg || '',
      time: this.formatTime(c.updatedAt || c.lastTime),
      unread: c.unreadCount || c.unread || 0,
      partnerId: c.partnerId || '',
    }));
  },

  getAvatarBg(type, i) {
    const colors = {
      shop: ['#FF8C66', '#5CB85C', '#F0AD4E'],
      navigator: ['#5B9BD5', '#7B68EE', '#48C9B0'],
      system: ['#FF6B35'],
    };
    const arr = colors[type] || colors.shop;
    return arr[i % arr.length];
  },

  /** 降级：本地硬编码会话 */
  loadLocalConversations() {
    const local = [
      {
        id: '1', type: 'shop', name: '老李瓷砖批发',
        lastMsg: '好的，800×800亮面瓷砖有现货，你要多少平方？',
        time: '10:32', unread: 2,
      },
      {
        id: '2', type: 'navigator', name: '领航员老张',
        lastMsg: '我已经到A区3排了，你到了吗？',
        time: '昨天', unread: 0,
      },
      {
        id: '3', type: 'shop', name: '鑫源建材商行',
        lastMsg: '订单已确认，明天上午可以送货。',
        time: '昨天', unread: 0,
      },
      {
        id: '4', type: 'system', name: '为家航保障中心',
        lastMsg: '你的订单WJH20260618001已完成收货确认，保障已生效。',
        time: '06-15', unread: 0,
      },
    ];

    const filtered = this.filterByTab(local);
    this.setData({
      conversations: this.processConversations(filtered),
      isEmpty: filtered.length === 0,
      loading: false,
      refreshing: false,
    });
  },

  /** 下拉刷新 */
  onRefresh() {
    this.setData({ refreshing: true });
    this.loadConversations();
  },

  /** Tab切换 */
  onTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.loadConversations();
  },

  filterByTab(list) {
    if (this.data.activeTab === 'all') return list;
    return list.filter((c) => c.type === this.data.activeTab);
  },

  /** 打开聊天 */
  onOpenChat(e) {
    const { id, name, type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/chat/chat?id=${id}&name=${name}&type=${type}`,
    });
  },

  /** 删除会话 */
  onDeleteChat(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除对话',
      content: '将删除该对话记录，确定吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用API删除
          wx.request({
            url: `${app.globalData.apiBase}/messages/conversations/${id}`,
            method: 'DELETE',
            header: { 'Authorization': 'Bearer ' + (wx.getStorageSync('token') || '') },
            complete: () => {
              this.loadConversations();
            },
          });
        }
      },
    });
  },

  /** WebSocket新消息 */
  onNewMessage(data) {
    // 有新消息时刷新列表
    this.loadConversations();
    // 播放提示音
    wx.vibrateShort({ type: 'light' });
  },

  onNewNotification(data) {
    this.loadConversations();
  },

  /** 更新TabBar角标 */
  updateTabBadge() {
    const total = this.data.unreadTotal;
    if (total > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: total > 99 ? '99+' : String(total),
      });
    } else {
      wx.removeTabBarBadge({ index: 2 });
    }
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return h + ':' + m;
    }
    if (diff < 172800000) return '昨天';
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return month + '-' + day;
  },

  /** 搜索会话 */
  onSearch(e) {
    const keyword = e.detail.value.trim().toLowerCase();
    // 简单前端过滤
    if (!keyword) {
      this.loadConversations();
      return;
    }
    const filtered = this.data.conversations.filter((c) =>
      c.name.toLowerCase().includes(keyword) ||
      c.lastMsg.toLowerCase().includes(keyword)
    );
    this.setData({ conversations: filtered });
  },
});
