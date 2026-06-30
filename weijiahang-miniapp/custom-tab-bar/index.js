/**
 * 为家航 · 自定义 TabBar
 * 首个 Tab 使用品牌 Logo 图片（icon-app.svg）
 */
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        icon: 'logo',
        text: '',
      },
      {
        pagePath: '/pages/ai-chat/ai-chat',
        icon: 'calc',
        text: 'AI计算',
      },
      {
        pagePath: '/pages/messages/messages',
        icon: 'msg',
        text: '消息',
      },
      {
        pagePath: '/pages/orders/orders',
        icon: 'order',
        text: '订单',
      },
      {
        pagePath: '/pages/mine/mine',
        icon: 'mine',
        text: '我的',
      },
    ],
  },

  methods: {
    switchTab(e) {
      var index = e.currentTarget.dataset.index;
      var item = this.data.list[index];
      var url = item.pagePath;

      if (this.data.selected === index) {
        if (index === 0) {
          var pages = getCurrentPages();
          var page = pages[pages.length - 1];
          if (page && page.onTabItemTap) {
            page.onTabItemTap({ index: 0 });
          }
        }
        return;
      }

      wx.switchTab({ url: url });
    },
  },
});
