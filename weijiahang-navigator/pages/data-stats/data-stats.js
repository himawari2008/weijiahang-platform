// pages/data-stats/data-stats.js
// 数据统计页面 — 领航员核心数据看板
var api = require('../../utils/api');

Page({

  data: {
    // stat grid 2x2
    statCards: [],

    // 7-day income trend
    weekBars: [],
    dayLabels: [],

    // category distribution
    categoryBars: [],

    // month summary
    monthSummary: {},

    // loading / error
    loading: true,
    error: false
  },

  onLoad: function () {
    this.fetchData();
  },

  onPullDownRefresh: function () {
    this.fetchData();
  },

  fetchData: function () {
    var self = this;
    self.setData({ loading: true, error: false });

    api.getDataStats().then(function (data) {
      self._updateDisplay(data);
      self.setData({ loading: false });
      wx.stopPullDownRefresh();
    }).catch(function () {
      self._useSimulatedData();
      self.setData({ loading: false });
      wx.stopPullDownRefresh();
    });
  },

  // ========== 当 API 不可用时使用本地模拟数据 ==========
  _useSimulatedData: function () {
    var simulated = {
      acceptRate: 87,
      completeRate: 95,
      onTimeRate: 82,
      ratingRate: 4.9,
      weekValues: [68, 128, 95, 45, 158, 210, 138],
      categories: [
        { name: '导航', percent: 45 },
        { name: '陪逛', percent: 30 },
        { name: '验货', percent: 25 }
      ],
      monthOrders: 23,
      monthIncome: 1280,
      monthHours: 48,
      monthDistance: 32
    };
    this._updateDisplay(simulated);
  },

  // ========== 主数据转展示 — 所有预计算在此 ==========
  _updateDisplay: function (raw) {
    // --- stat cards (2x2 grid) ---
    var statCards = [
      { label: '接单率', value: raw.acceptRate, unit: '%' },
      { label: '完成率', value: raw.completeRate, unit: '%' },
      { label: '准时率', value: raw.onTimeRate, unit: '%' },
      { label: '好评率', value: raw.ratingRate, unit: '' }
    ];

    // --- 7-day income bars ---
    var weekRaw = raw.weekValues;
    var maxVal = weekRaw[0];
    for (var i = 1; i < weekRaw.length; i++) {
      if (weekRaw[i] > maxVal) {
        maxVal = weekRaw[i];
      }
    }

    var weekBars = [];
    var dayLabels = [];
    var baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 6);

    for (var j = 0; j < weekRaw.length; j++) {
      var d = new Date(baseDate);
      d.setDate(baseDate.getDate() + j);
      var month = d.getMonth() + 1;
      var day = d.getDate();
      var label = month + '/' + day;

      var rawPct = (weekRaw[j] / maxVal) * 100;
      var height = rawPct;
      if (height < 2 && weekRaw[j] > 0) {
        height = 2;
      }

      weekBars.push({
        day: label,
        value: weekRaw[j],
        height: height,
        showValue: weekRaw[j]
      });
      dayLabels.push(label);
    }

    // --- category horizontal bars ---
    var categoryBars = [];
    var catColors = ['#FF6B35', '#1A365D', '#52C41A'];
    for (var k = 0; k < raw.categories.length; k++) {
      var cat = raw.categories[k];
      categoryBars.push({
        name: cat.name,
        percent: cat.percent,
        widthPercent: cat.percent,
        color: catColors[k] || '#FF6B35'
      });
    }

    // --- month summary ---
    var monthSummary = {
      orders: raw.monthOrders,
      income: raw.monthIncome,
      hours: raw.monthHours,
      distance: raw.monthDistance
    };

    this.setData({
      statCards: statCards,
      weekBars: weekBars,
      dayLabels: dayLabels,
      categoryBars: categoryBars,
      monthSummary: monthSummary
    });
  }
});
