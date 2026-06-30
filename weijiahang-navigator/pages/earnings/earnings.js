var api = require('../../utils/api');

Page({
  data: {
    balance: 0,
    totalEarned: 0,
    todayEarn: 0,
    weekTotal: 0,
    monthTotal: 0,
    /* WXML 不能用 .toFixed() / Math.abs()，预格式化为文本 */
    balanceText: '0.00',
    totalEarnedText: '0',
    todayEarnText: '0',
    monthTotalText: '0',
    weekData: [
      { day: '一', val: 0, pct: 0 },
      { day: '二', val: 0, pct: 0 },
      { day: '三', val: 0, pct: 0 },
      { day: '四', val: 0, pct: 0 },
      { day: '五', val: 0, pct: 0 },
      { day: '六', val: 0, pct: 0 },
      { day: '日', val: 0, pct: 0 },
    ],
    maxWeekVal: 0,
    records: [],
    loading: true,
    apiError: false,
  },

  /** 格式化金额显示文本 */
  _updateDisplay: function () {
    var b = this.data.balance || 0;
    var te = this.data.totalEarned || 0;
    var td = this.data.todayEarn || 0;
    var mt = this.data.monthTotal || 0;
    this.setData({
      balanceText: b.toFixed(2),
      totalEarnedText: te.toFixed(0),
      todayEarnText: td.toFixed(0),
      monthTotalText: mt.toFixed(0),
    });
  },

  onLoad: function () {
    this.loadEarnings();
  },

  onShow: function () {
    this.loadEarnings(true);
  },

  loadEarnings: function (silent) {
    var that = this;
    if (!silent) {
      this.setData({ loading: true, apiError: false });
    }

    api.getEarnings().then(function (d) {
      /* 周数据 */
      var rawWeek = d.weekData || [];
      var maxVal = 0;
      var days = ['一', '二', '三', '四', '五', '六', '日'];
      var weekArr = [];
      for (var i = 0; i < days.length; i++) {
        var v = (rawWeek[i] && rawWeek[i].val !== undefined) ? rawWeek[i].val : 0;
        if (v > maxVal) maxVal = v;
        weekArr.push({ day: days[i], val: v, pct: 0 });
      }
      if (maxVal > 0) {
        for (var j = 0; j < weekArr.length; j++) {
          weekArr[j].pct = Math.round((weekArr[j].val / maxVal) * 100);
        }
      }

      /* 为每条记录预计算显示文本 */
      var rawRecords = d.records || [];
      for (var k = 0; k < rawRecords.length; k++) {
        var r = rawRecords[k];
        var sign = r.type === 'withdraw' ? '-' : '+';
        var absVal = r.amount || 0;
        if (absVal < 0) absVal = -absVal;
        r.amountText = sign + '¥' + absVal.toFixed(2);
      }

      that.setData({
        balance: d.balance || 0,
        totalEarned: d.totalEarned || 0,
        todayEarn: d.todayEarn || 0,
        weekTotal: d.weekTotal || 0,
        monthTotal: d.monthTotal || 0,
        weekData: weekArr,
        maxWeekVal: maxVal,
        records: rawRecords,
        loading: false,
      });
      that._updateDisplay();
    }).catch(function () {
      that.setData({ loading: false, apiError: true });
    });
  },

  onWithdraw: function () {
    var balance = this.data.balance;
    if (balance <= 0) {
      wx.showToast({ title: '暂无可提现金额', icon: 'none' });
      return;
    }
    var that = this;
    wx.showActionSheet({
      itemList: ['微信零钱', '银行卡'],
      success: function (res) {
        var methods = ['wechat', 'bank'];
        wx.showModal({
          title: '确认提现',
          content: '提现金额 ¥' + balance.toFixed(2) + '\n到账时间：1-3个工作日',
          success: function (r) {
            if (r.confirm) {
              api.withdraw({
                amount: balance,
                method: methods[res.tapIndex],
              }).then(function () {
                wx.showToast({ title: '提现申请已提交', icon: 'success' });
                that.loadEarnings(true);
              }).catch(function (err) {
                wx.showToast({ title: err.message || '提现失败', icon: 'none' });
              });
            }
          },
        });
      },
    });
  },

  onRecordTap: function (e) {
    var id = e.currentTarget.dataset.id;
    var records = this.data.records;
    var record = null;
    for (var i = 0; i < records.length; i++) {
      if (records[i].id === id) {
        record = records[i];
        break;
      }
    }
    if (!record) return;
    wx.showModal({
      title: record.type === 'withdraw' ? '提现详情' : '收入详情',
      content: record.desc + '\n金额：' + record.amountText + '\n时间：' + record.time,
      showCancel: false,
    });
  },

  onRetry: function () {
    this.loadEarnings();
  },
});
