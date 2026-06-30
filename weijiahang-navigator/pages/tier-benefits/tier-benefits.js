var app = getApp();

Page({
  data: {
    /* ========== 原始 API 数据 ========== */
    currentLevel: 1,
    tierName: '',
    nextTier: null,
    progress: { orders: 0, rating: 0, exp: 0 },
    commissionRate: 0,
    dispatchWeight: 1,
    benefits: [],

    /* ========== 预计算展示字段（_updateDisplay 中完成） ========== */
    currentLevelText: '1',
    tierFullName: '',
    ordersPct: 0,
    ratingPct: 0,
    expPct: 0,
    progressPercent: 0,
    ordersText: '0%',
    ratingText: '0%',
    expText: '0%',
    commissionRateText: '0%',
    dispatchWeightText: 'x1',
    priorityText: '',
    nextTierGap: '',
    tierLevels: [],
    benefitList: [],

    /* ========== 页面状态 ========== */
    loading: true,
    loadError: false,
    errorMsg: '',
  },

  /**
   * 预计算所有展示字段
   * WXML 中禁止使用 .filter() .toFixed() .slice() .map() Math.abs() indexOf()
   * 所有格式化在此完成
   */
  _updateDisplay: function () {
    var tierName = this.data.tierName || '';
    var currentLevel = this.data.currentLevel || 1;
    var progress = this.data.progress || {};
    var orders = progress.orders || 0;
    var rating = progress.rating || 0;
    var exp = progress.exp || 0;
    var nextTier = this.data.nextTier || null;
    var benefits = this.data.benefits || [];
    var commissionRate = this.data.commissionRate || 0;
    var dispatchWeight = this.data.dispatchWeight || 1;

    /* ---- 进度百分比 ---- */
    var ordersPct = Math.min(100, Math.round(orders));
    var ratingPct = Math.min(100, Math.round(rating));
    var expPct = Math.min(100, Math.round(exp));
    var progressPercent = Math.round((ordersPct + ratingPct + expPct) / 3);

    /* ---- 格式化文本 ---- */
    var currentLevelText = String(currentLevel);
    var ordersText = String(ordersPct) + '%';
    var ratingText = String(ratingPct) + '%';
    var expText = String(expPct) + '%';
    var commissionRateText = String(commissionRate) + '%';
    var dispatchWeightText = 'x' + String(dispatchWeight);

    /* ---- 等级全称 ---- */
    var tierNames = ['', '入门领航员', '初级领航员', '中级领航员', '高级领航员', '王牌领航员'];
    var tierFullName = tierNames[currentLevel] || '';

    /* ---- 专属权益文字 ---- */
    var priorityText = '';
    if (nextTier && nextTier.level) {
      priorityText = '下一级解锁更多';
    } else {
      priorityText = '当前已满级';
    }

    /* ---- 下一级差距提示 ---- */
    var nextTierGap = '';
    if (nextTier && nextTier.name) {
      var parts = [];
      if (ordersPct < 100) parts.push('接单量' + String(100 - ordersPct) + '%');
      if (ratingPct < 100) parts.push('评分' + String(100 - ratingPct) + '%');
      if (expPct < 100) parts.push('经验值' + String(100 - expPct) + '%');
      if (parts.length > 0) {
        nextTierGap = '升级至' + nextTier.name + '还需提升：' + parts.join(' / ');
      } else {
        nextTierGap = '升级至' + nextTier.name + '的条件已全部满足';
      }
    } else {
      nextTierGap = '已达当前最高等级';
    }

    /* ---- 全部等级阶梯 ---- */
    var allTiers = [
      { level: 1, levelName: '青铜', name: '入门领航员', req: '完成10单' },
      { level: 2, levelName: '白银', name: '初级领航员', req: '完成30单' },
      { level: 3, levelName: '黄金', name: '中级领航员', req: '完成60单' },
      { level: 4, levelName: '铂金', name: '高级领航员', req: '完成100单' },
      { level: 5, levelName: '钻石', name: '王牌领航员', req: '完成200单' },
    ];

    var tierLevels = [];
    for (var i = 0; i < allTiers.length; i++) {
      var t = allTiers[i];
      tierLevels.push({
        level: t.level,
        levelName: t.levelName,
        levelClass: 't' + String(t.level),
        name: t.name,
        req: t.req,
        isCurrent: t.level === currentLevel,
      });
    }

    /* ---- 权益列表 ---- */
    var benefitList = [];
    for (var j = 0; j < benefits.length; j++) {
      benefitList.push({
        icon: 'b' + String(j + 1),
        text: benefits[j],
      });
    }

    this.setData({
      currentLevelText: currentLevelText,
      tierFullName: tierFullName,
      ordersPct: ordersPct,
      ratingPct: ratingPct,
      expPct: expPct,
      progressPercent: progressPercent,
      ordersText: ordersText,
      ratingText: ratingText,
      expText: expText,
      commissionRateText: commissionRateText,
      dispatchWeightText: dispatchWeightText,
      priorityText: priorityText,
      nextTierGap: nextTierGap,
      tierLevels: tierLevels,
      benefitList: benefitList,
    });
  },

  /* ========== 生命周期 ========== */

  onLoad: function () {
    this.loadTierData();
  },

  onShow: function () {
    this.loadTierData(true);
  },

  onPullDownRefresh: function () {
    this.loadTierData(true);
  },

  /* ========== 加载等级数据 ========== */

  loadTierData: function (silent) {
    var that = this;

    if (!silent) {
      this.setData({ loading: true, loadError: false, errorMsg: '' });
    }

    /* 获取领航员 ID */
    var navInfo = app.globalData.navInfo || {};
    var navId = navInfo.id;

    if (!navId) {
      var stored = wx.getStorageSync('nav_info');
      if (stored && stored.id) {
        navId = stored.id;
      }
    }

    if (!navId) {
      that.setData({
        loading: false,
        loadError: true,
        errorMsg: '无法获取领航员信息',
      });
      wx.stopPullDownRefresh();
      return;
    }

    var token = app.globalData.token || wx.getStorageSync('nav_token');

    var api = require('../../utils/api');
    api.getTierById(navId).then(function (d) {
      that.setData({
        currentLevel: d.currentLevel || 1,
        tierName: d.tierName || '青铜',
        nextTier: d.nextTier || null,
        progress: d.progress || { orders: 0, rating: 0, exp: 0 },
        commissionRate: d.commissionRate || 0,
        dispatchWeight: d.dispatchWeight || 1,
        benefits: d.benefits || [],
        loading: false,
        loadError: false,
      });
      that._updateDisplay();
      wx.stopPullDownRefresh();
    }).catch(function (err) {
      that.setData({
        loading: false,
        loadError: true,
        errorMsg: (err && err.message) || '网络异常，请稍后重试',
      });
      if (!silent) {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
      }
      wx.stopPullDownRefresh();
    });
  },

  /* ========== 交互 ========== */

  onRetry: function () {
    this.loadTierData();
  },
});
