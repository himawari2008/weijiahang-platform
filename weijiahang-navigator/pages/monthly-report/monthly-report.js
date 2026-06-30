// monthly-report.js — 月度成绩单
var api = require('../../utils/api');

/** 千分位格式化 */
function fmtThousands(n) {
  var s = String(Math.round(n));
  var r = '';
  for (var i = s.length - 1, c = 0; i >= 0; i--) {
    c++; r = s[i] + r;
    if (c % 3 === 0 && i > 0) r = ',' + r;
  }
  return r;
}

/** 模拟月度数据（降级用） */
function getMockData(month) {
  return {
    month: month,
    totalOrders: 86,
    totalIncome: 12800,
    avgRating: 4.8,
    onlineHours: 142,
    orderTrend: [8, 12, 6, 10, 7, 9, 14, 8, 11, 15, 9, 13, 5, 7, 10, 8, 13, 6, 9, 12, 15, 8, 11, 7, 10, 14, 9, 6, 8, 12],
    categoryBreakdown: [
      { name: '瓷砖', percent: 32, color: '#FF6B35' },
      { name: '地板', percent: 22, color: '#1677FF' },
      { name: '涂料', percent: 18, color: '#52C41A' },
      { name: '卫浴', percent: 15, color: '#FAAD14' },
      { name: '门窗', percent: 8, color: '#722ED1' },
      { name: '其他', percent: 5, color: '#999' },
    ],
    lastMonth: { orders: 72, income: 10500, rating: 4.7, hours: 128 },
    marketAvg: { orders: 65, income: 9200, rating: 4.5, hours: 118 },
  };
}

Page({
  data: {
    month: '',
    monthIndex: 0,
    monthOptions: [],

    // 汇总数据
    totalOrders: 0,
    totalIncome: 0,
    avgRating: 0,
    onlineHours: 0,
    incomeText: '',
    ordersText: '',

    // 环比
    orderChange: 0,
    incomeChange: 0,
    ratingChange: 0,
    hoursChange: 0,
    orderChangeText: '',
    incomeChangeText: '',
    ratingChangeText: '',
    hoursChangeText: '',

    // 品类分布
    categoryBreakdown: [],

    // VS 市场均值
    vsMarket: '',
    vsMarketOrders: '',
    vsMarketIncome: '',

    // 状态
    loading: true,
    error: false,
    canvasReady: false,
  },

  onLoad: function () {
    // 生成月份选项（最近6个月）
    var now = new Date();
    var months = [];
    for (var i = 0; i < 6; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      months.push({ key: key, label: key.replace('-', '年') + '月' });
    }
    this.setData({
      month: months[0].key,
      monthOptions: months,
      monthIndex: 0,
    });

    this.loadReport();
  },

  /** 切换到上个月 */
  onPrevMonth: function () {
    var idx = this.data.monthIndex;
    if (idx >= this.data.monthOptions.length - 1) return;
    idx++;
    this.setData({
      monthIndex: idx,
      month: this.data.monthOptions[idx].key,
    });
    this.loadReport();
  },

  /** 切换到下个月 */
  onNextMonth: function () {
    var idx = this.data.monthIndex;
    if (idx <= 0) return;
    idx--;
    this.setData({
      monthIndex: idx,
      month: this.data.monthOptions[idx].key,
    });
    this.loadReport();
  },

  /** 加载月度报告 */
  loadReport: function () {
    var that = this;
    that.setData({ loading: true, error: false });

    api.getMonthlyReport(that.data.month).then(function (data) {
      that.renderReport(data || getMockData(that.data.month));
    }).catch(function () {
      // 降级使用模拟数据
      that.renderReport(getMockData(that.data.month));
    });
  },

  /** 渲染报告数据 */
  renderReport: function (data) {
    var lm = data.lastMonth || {};
    var ma = data.marketAvg || {};

    // 环比变化率
    var orderChange = lm.orders ? ((data.totalOrders - lm.orders) / lm.orders * 100) : 0;
    var incomeChange = lm.income ? ((data.totalIncome - lm.income) / lm.income * 100) : 0;
    var ratingChange = lm.rating ? (data.avgRating - lm.rating).toFixed(1) : 0;
    var hoursChange = lm.hours ? ((data.onlineHours - lm.hours) / lm.hours * 100) : 0;

    // VS 市场均值
    var vsOrders = ma.orders ? Math.round((data.totalOrders - ma.orders) / ma.orders * 100) : 0;
    var vsIncome = ma.income ? Math.round((data.totalIncome - ma.income) / ma.income * 100) : 0;
    var vsPrefix = vsIncome >= 0 ? '高于' : '低于';
    var vsAbs = Math.abs(vsIncome);

    this.setData({
      totalOrders: data.totalOrders,
      totalIncome: data.totalIncome,
      avgRating: data.avgRating,
      onlineHours: data.onlineHours,
      incomeText: '¥' + fmtThousands(data.totalIncome),
      ordersText: String(data.totalOrders) + '单',

      orderChange: orderChange >= 0 ? '+' + orderChange.toFixed(0) + '%' : orderChange.toFixed(0) + '%',
      incomeChange: incomeChange >= 0 ? '+' + incomeChange.toFixed(0) + '%' : incomeChange.toFixed(0) + '%',
      ratingChange: ratingChange >= 0 ? '+' + ratingChange : String(ratingChange),
      hoursChange: hoursChange >= 0 ? '+' + hoursChange.toFixed(0) + '%' : hoursChange.toFixed(0) + '%',
      orderChangeClass: orderChange >= 0 ? 'up' : 'down',
      incomeChangeClass: incomeChange >= 0 ? 'up' : 'down',
      ratingChangeClass: parseFloat(ratingChange) >= 0 ? 'up' : 'down',
      hoursChangeClass: hoursChange >= 0 ? 'up' : 'down',

      categoryBreakdown: data.categoryBreakdown || [],
      vsMarket: vsPrefix + vsAbs + '%',
      vsMarketOrders: (vsOrders >= 0 ? '高于' : '低于') + '市场均值' + Math.abs(vsOrders) + '%',
      vsMarketIncome: '收入' + vsPrefix + '市场均值' + vsAbs + '%',
      loading: false,
    });

    // 延迟绘制 Canvas 趋势图
    var that = this;
    setTimeout(function () {
      that.drawTrendCanvas(data.orderTrend || []);
    }, 300);
  },

  /** Canvas 绘制趋势图 */
  drawTrendCanvas: function (trendData) {
    if (!trendData || trendData.length === 0) return;

    var ctx = wx.createCanvasContext('trendCanvas', this);
    var w = 330;  // px
    var h = 180;
    var margin = { top: 20, right: 10, bottom: 30, left: 40 };
    var plotW = w - margin.left - margin.right;
    var plotH = h - margin.top - margin.bottom;

    var maxVal = Math.max.apply(null, trendData) || 20;
    var minVal = Math.min.apply(null, trendData) || 0;
    var range = maxVal - minVal || 1;

    // 白色背景
    ctx.setFillStyle('#fff');
    ctx.fillRect(0, 0, w, h);

    // 网格线
    ctx.setStrokeStyle('#f0f0f0');
    ctx.setLineWidth(0.5);
    for (var g = 0; g <= 4; g++) {
      var gy = margin.top + (plotH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(margin.left, gy);
      ctx.lineTo(w - margin.right, gy);
      ctx.stroke();
    }

    // X 轴标签（仅首尾和中间）
    ctx.setFillStyle('#999');
    ctx.setFontSize(10);
    var labels = [1, Math.ceil(trendData.length / 2), trendData.length];
    for (var li = 0; li < labels.length; li++) {
      var lx = margin.left + (plotW / (trendData.length - 1)) * (labels[li] - 1);
      ctx.fillText(labels[li] + '日', lx - 6, h - 6);
    }

    // 折线
    ctx.setStrokeStyle('#FF6B35');
    ctx.setLineWidth(2);
    ctx.beginPath();
    for (var i = 0; i < trendData.length; i++) {
      var x = margin.left + (plotW / (trendData.length - 1)) * i;
      var y = margin.top + plotH - ((trendData[i] - minVal) / range) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 填充渐变
    var lastX = margin.left + (plotW / (trendData.length - 1)) * (trendData.length - 1);
    ctx.setFillStyle('rgba(255, 107, 53, 0.1)');
    ctx.lineTo(lastX, margin.top + plotH);
    ctx.lineTo(margin.left, margin.top + plotH);
    ctx.closePath();
    ctx.fill();

    ctx.draw();

    this.setData({ canvasReady: true });
  },

  /** 分享图片 */
  onShare: function () {
    var that = this;
    wx.showLoading({ title: '生成图片中...' });

    // 使用离屏 Canvas 渲染分享图
    wx.canvasToTempFilePath({
      canvasId: 'trendCanvas',
      success: function (res) {
        wx.hideLoading();
        wx.showShareImageMenu({
          path: res.tempFilePath,
          fail: function () {
            wx.showToast({ title: '分享图片生成中...', icon: 'none' });
          }
        });
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '生成失败，请稍后重试', icon: 'none' });
      }
    }, this);
  },

  onRetry: function () {
    this.loadReport();
  },

  onShareAppMessage: function () {
    return {
      title: '我的月度成绩单 — 为家航领航员',
      path: '/pages/index/index',
    };
  },
});
