var api = require('../../utils/api');

/* =====================================================
   工具函数 — 全部预计算，WXML 不调用任何方法
   ===================================================== */

// 千分位格式化
function fmtThousands(n) {
  var s = String(Math.round(n));
  var r = '';
  var l = s.length;
  var c = 0;
  for (var i = l - 1; i >= 0; i--) {
    c++;
    r = s[i] + r;
    if (c % 3 === 0 && i > 0) r = ',' + r;
  }
  return r;
}

// 格式化排行值文本
function fmtValue(v, type) {
  if (type === 'efficiency') return String(Math.round(v)) + '%';
  if (type === 'rating') return v.toFixed(1);
  return '¥' + fmtThousands(v);
}

// 从列表中找出当前用户条目
function findMyEntry(list) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].isMe) return list[i];
  }
  return null;
}

// 构建完整排行榜展示数据
function buildRanking(rawList, type) {
  if (!rawList || !rawList.length) {
    return { topThree: [], rankList: [], totalCount: 0, myRankInfo: null };
  }

  var all = [];
  for (var j = 0; j < rawList.length; j++) {
    var p = rawList[j];
    var val = 0;
    if (type === 'income') val = p.income || p.value || 0;
    else if (type === 'efficiency') val = p.efficiency || p.value || 0;
    else val = p.rating || p.value || 0;

    all.push({
      rank: j + 1,
      name: p.name || p.nickname || '',
      valueText: fmtValue(val, type),
      ratingText: (p.rating || 0).toFixed(1),
      isMe: p.isMe || false
    });
  }

  return {
    topThree: all.slice(0, 3),
    rankList: all.slice(3),
    totalCount: all.length,
    myRankInfo: findMyEntry(all)
  };
}

/* =====================================================
   Page
   ===================================================== */
Page({
  data: {
    typeOptions: [
      { key: 'income', label: '收入榜' },
      { key: 'rating', label: '好评榜' },
      { key: 'efficiency', label: '效率榜' }
    ],
    periodOptions: [
      { key: 'week', label: '本周' },
      { key: 'month', label: '本月' }
    ],
    currentType: 'income',
    currentPeriod: 'week',
    topThree: [],
    rankList: [],
    totalCount: 0,
    myRankInfo: null,
    loading: true,
    error: false
  },

  onLoad: function () {
    this.fetchRanking();
  },

  /** 从后端获取排行榜数据 */
  fetchRanking: function () {
    var that = this;
    that.setData({ loading: true, error: false });

    api.getLeaderboard({
      type: that.data.currentType,
      period: that.data.currentPeriod
    }).then(function (rawList) {
      var data = buildRanking(rawList, that.data.currentType);
      that.setData({
        topThree: data.topThree,
        rankList: data.rankList,
        totalCount: data.totalCount,
        myRankInfo: data.myRankInfo,
        loading: false,
        error: false
      });
    }).catch(function () {
      // API 不可用时使用本地模拟数据
      that._useSimulatedData();
    });
  },

  /** 本地模拟数据（降级方案） */
  _useSimulatedData: function () {
    var PEOPLE = [
      { name: '王大勇', rating: 5.0, income: 12800, efficiency: 98, incomeMonth: 48600, efficiencyMonth: 95 },
      { name: '李海涛', rating: 4.9, income: 11200, efficiency: 96, incomeMonth: 42500, efficiencyMonth: 94 },
      { name: '张明辉', rating: 4.9, income: 9800, efficiency: 94, incomeMonth: 37200, efficiencyMonth: 92 },
      { name: '陈晓峰', rating: 4.8, income: 8600, efficiency: 92, incomeMonth: 32600, efficiencyMonth: 91 },
      { name: '刘志强', rating: 4.8, income: 7500, efficiency: 91, incomeMonth: 28500, efficiencyMonth: 90 },
      { name: '赵建国', rating: 4.7, income: 6200, efficiency: 89, incomeMonth: 23500, efficiencyMonth: 88 },
      { name: '孙伟杰', rating: 4.7, income: 5500, efficiency: 87, incomeMonth: 20900, efficiencyMonth: 86 },
      { name: '周明德', rating: 4.6, income: 4800, efficiency: 85, incomeMonth: 18200, efficiencyMonth: 84 },
      { name: '吴海波', rating: 4.6, income: 4200, efficiency: 83, incomeMonth: 16000, efficiencyMonth: 82 },
      { name: '郑建平', rating: 4.5, income: 3500, efficiency: 80, incomeMonth: 13300, efficiencyMonth: 79 },
      { name: '何文龙', rating: 4.5, income: 2800, efficiency: 78, incomeMonth: 10600, efficiencyMonth: 77 },
      { name: '我', rating: 4.3, income: 1200, efficiency: 72, incomeMonth: 4500, efficiencyMonth: 70, isMe: true }
    ];

    // 根据周期选择不同数据
    var isMonth = this.data.currentPeriod === 'month';
    for (var i = 0; i < PEOPLE.length; i++) {
      if (isMonth) {
        PEOPLE[i].income = PEOPLE[i].incomeMonth;
        PEOPLE[i].efficiency = PEOPLE[i].efficiencyMonth;
      }
    }

    // 排序
    var type = this.data.currentType;
    PEOPLE.sort(function (a, b) {
      var va = (type === 'income') ? a.income : (type === 'efficiency') ? a.efficiency : a.rating;
      var vb = (type === 'income') ? b.income : (type === 'efficiency') ? b.efficiency : b.rating;
      return vb - va;
    });

    var data = buildRanking(PEOPLE, type);
    this.setData({
      topThree: data.topThree,
      rankList: data.rankList,
      totalCount: data.totalCount,
      myRankInfo: data.myRankInfo,
      loading: false,
      error: false
    });
  },

  onTypeTap: function (e) {
    var key = e.currentTarget.dataset.key;
    if (key === this.data.currentType) return;
    this.setData({ currentType: key });
    this.fetchRanking();
  },

  onPeriodTap: function (e) {
    var key = e.currentTarget.dataset.key;
    if (key === this.data.currentPeriod) return;
    this.setData({ currentPeriod: key });
    this.fetchRanking();
  },

  onShareAppMessage: function () {
    return { title: '领航员排行榜' };
  }
});
