// components/countdown-badge/index.js
// 倒计时角标组件 — 15秒抢单倒计时
Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    /** 剩余秒数 */
    remaining: {
      type: Number,
      value: 15
    },
    /** 总秒数（用于计算百分比） */
    total: {
      type: Number,
      value: 15
    },
    /** 是否紧急模式（<=5秒） */
    urgent: {
      type: Boolean,
      value: false
    }
  },

  data: {
    displayText: '15s',
    progressPercent: 100,
    isUrgent: false
  },

  observers: {
    'remaining, total': function (remaining, total) {
      var pct = Math.round((remaining / total) * 100);
      var isUrgent = remaining <= 5;
      this.setData({
        displayText: String(remaining) + 's',
        progressPercent: Math.max(0, Math.min(100, pct)),
        isUrgent: isUrgent
      });
    }
  },

  lifetimes: {
    attached: function () {
      var r = this.properties.remaining;
      var t = this.properties.total;
      this.setData({
        displayText: String(r) + 's',
        progressPercent: Math.round((r / t) * 100),
        isUrgent: r <= 5
      });
    }
  }
});
