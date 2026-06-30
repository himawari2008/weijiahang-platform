var api = require('../../utils/api');

Page({
  data: {
    notifications: [],
    loading: true,
    error: false,
    isEmpty: false,
    unreadCount: 0,
    page: 1,
    pageSize: 20,
    hasMore: false
  },

  onLoad: function () {
    this.fetchNotifications();
  },

  onPullDownRefresh: function () {
    this.setData({ page: 1 });
    this.fetchNotifications();
    wx.stopPullDownRefresh();
  },

  onReachBottom: function () {
    if (this.data.hasMore) {
      this.loadMore();
    }
  },

  fetchNotifications: function () {
    var that = this;
    that.setData({ loading: true, error: false });

    api.getNotifications({ page: 1, pageSize: that.data.pageSize }).then(function (data) {
      var list = data.list || data || [];
      var total = data.total || list.length;

      // 预计算展示字段
      for (var i = 0; i < list.length; i++) {
        list[i].timeText = that._formatTime(list[i].createdAt || list[i].time);
        list[i].isRead = list[i].isRead === 1 || list[i].isRead === true;
      }

      that.setData({
        notifications: list,
        loading: false,
        isEmpty: list.length === 0,
        hasMore: list.length < total,
        page: 1
      });
    }).catch(function () {
      that.setData({ loading: false, error: true });
    });

    // 获取未读数
    api.getUnreadCount().then(function (data) {
      that.setData({ unreadCount: data.count || 0 });
    }).catch(function () {});
  },

  loadMore: function () {
    var that = this;
    var nextPage = that.data.page + 1;

    api.getNotifications({ page: nextPage, pageSize: that.data.pageSize }).then(function (data) {
      var list = data.list || data || [];
      var total = data.total || list.length;

      for (var i = 0; i < list.length; i++) {
        list[i].timeText = that._formatTime(list[i].createdAt || list[i].time);
        list[i].isRead = list[i].isRead === 1 || list[i].isRead === true;
      }

      var all = that.data.notifications.concat(list);
      that.setData({
        notifications: all,
        hasMore: all.length < total,
        page: nextPage
      });
    }).catch(function () {});
  },

  onMarkRead: function (e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    api.markRead(id).then(function () {
      var list = that.data.notifications;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) list[i].isRead = true;
      }
      that.setData({ notifications: list, unreadCount: Math.max(0, that.data.unreadCount - 1) });
    }).catch(function () {});
  },

  onMarkAllRead: function () {
    var that = this;
    api.markAllRead().then(function () {
      var list = that.data.notifications;
      for (var i = 0; i < list.length; i++) list[i].isRead = true;
      that.setData({ notifications: list, unreadCount: 0 });
      wx.showToast({ title: '已全部标为已读', icon: 'success' });
    }).catch(function () {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  _formatTime: function (timeStr) {
    if (!timeStr) return '';
    var d = new Date(timeStr);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    var month = d.getMonth() + 1;
    var day = d.getDate();
    return month + '月' + day + '日';
  },

  onRetry: function () {
    this.fetchNotifications();
  }
});
