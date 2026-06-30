var app = getApp();
var api = require('../../utils/api');

Page({
  data: {
    loading: true,
    error: false,
    isEmpty: false,
    hasEarned: false,
    hasLocked: false,
    headerText: '',
    earnedBadges: [],
    lockedBadges: [],
    earnedCount: 0,
    totalCount: 0
  },

  onLoad: function () {
    this._lastFetchTime = 0;
    this._fetchBadges();
  },

  onShow: function () {
    var now = Date.now();
    // 5 分钟缓存
    if (now - this._lastFetchTime > 300000) {
      this._fetchBadges();
    }
  },

  _fetchBadges: function () {
    var that = this;
    that._lastFetchTime = Date.now();
    that.setData({ loading: true, error: false });

    var navigatorId = '';
    try {
      navigatorId = app.globalData.navigatorId || '';
    } catch (e) {
      navigatorId = '';
    }

    api.getBadges(navigatorId).then(function (data) {
      that._updateDisplay(data);
    }).catch(function () {
      that.setData({ loading: false, error: true });
    });
  },

  _updateDisplay: function (data) {
    var badges = data.badges || [];
    var earnedCount = data.earnedCount || 0;
    var totalCount = data.totalCount || badges.length;

    var earnedBadges = [];
    var lockedBadges = [];

    for (var i = 0; i < badges.length; i++) {
      var badge = badges[i];

      if (badge.isEarned === 1 || badge.isEarned === true) {
        var earnedDate = '';
        if (badge.earnedAt) {
          var d = new Date(badge.earnedAt);
          earnedDate = this._formatDate(d);
        }
        earnedBadges.push({
          badgeKey: badge.badgeKey,
          badgeName: badge.badgeName,
          description: badge.description,
          earnedDate: earnedDate
        });
      } else {
        var progressPercent = 0;
        var progressText = '';
        if (badge.maxProgress > 0) {
          var raw = badge.progress / badge.maxProgress * 100;
          progressPercent = Math.round(raw);
          progressText = '进度 ' + badge.progress + '/' + badge.maxProgress;
        } else {
          progressText = '未开始';
        }
        lockedBadges.push({
          badgeKey: badge.badgeKey,
          badgeName: badge.badgeName,
          description: badge.description,
          progressPercent: progressPercent,
          progressText: progressText
        });
      }
    }

    var hasEarned = earnedBadges.length > 0;
    var hasLocked = lockedBadges.length > 0;
    var isEmpty = !hasEarned && !hasLocked;

    this.setData({
      loading: false,
      error: false,
      isEmpty: isEmpty,
      hasEarned: hasEarned,
      hasLocked: hasLocked,
      headerText: '已获得 ' + earnedCount + '/' + totalCount + ' 枚勋章',
      earnedBadges: earnedBadges,
      lockedBadges: lockedBadges,
      earnedCount: earnedCount,
      totalCount: totalCount
    });
  },

  _formatDate: function (d) {
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    return year + '年' + month + '月' + day + '日';
  },

  onRetry: function () {
    this._fetchBadges();
  }
});
