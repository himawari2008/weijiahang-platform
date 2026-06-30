// listen-preferences.js — 智能听单偏好设置
var api = require('../../utils/api');

Page({
  data: {
    // 滑块配置
    minIncome: 10,       // 最低接单金额（元）
    maxDistance: 3,      // 最大距离（km）
    minIncomeText: '10', // 展示用
    maxDistanceText: '3',

    // 开关
    navService: true,     // 导航
    companionService: true, // 陪逛
    inspectionService: true, // 验货

    // 接单开关
    autoAccept: false,    // 自动接单
    soundAlert: true,     // 声音提醒
    vibrationAlert: true, // 震动提醒

    // 状态
    loading: false,
    saving: false,
  },

  onLoad: function () {
    this.loadPreferences();
  },

  /** 加载已保存的偏好 */
  loadPreferences: function () {
    var that = this;
    that.setData({ loading: true });

    // 先从本地读取
    try {
      var local = wx.getStorageSync('listen_preferences');
      if (local) {
        that.setData({
          minIncome: local.minIncome || 10,
          maxDistance: local.maxDistance || 3,
          minIncomeText: String(local.minIncome || 10),
          maxDistanceText: String(local.maxDistance || 3),
          navService: local.navService !== false,
          companionService: local.companionService !== false,
          inspectionService: local.inspectionService !== false,
          autoAccept: local.autoAccept || false,
          soundAlert: local.soundAlert !== false,
          vibrationAlert: local.vibrationAlert !== false,
        });
      }
    } catch (e) { /* 忽略 */ }

    // 再从服务端同步
    api.getPreferences().then(function (data) {
      if (data) {
        that.setData({
          minIncome: data.minIncome || that.data.minIncome,
          maxDistance: data.maxDistance || that.data.maxDistance,
          minIncomeText: String(data.minIncome || that.data.minIncome),
          maxDistanceText: String(data.maxDistance || that.data.maxDistance),
          navService: data.navService !== false,
          companionService: data.companionService !== false,
          inspectionService: data.inspectionService !== false,
          autoAccept: data.autoAccept || false,
          soundAlert: data.soundAlert !== false,
          vibrationAlert: data.vibrationAlert !== false,
        });
      }
      that.setData({ loading: false });
    }).catch(function () {
      that.setData({ loading: false });
    });
  },

  /** 最低金额滑块 */
  onMinIncomeChange: function (e) {
    var v = e.detail.value;
    this.setData({ minIncome: v, minIncomeText: String(v) });
  },

  /** 最大距离滑块 */
  onMaxDistanceChange: function (e) {
    var v = e.detail.value;
    this.setData({ maxDistance: v, maxDistanceText: String(v) });
  },

  /** 服务类型开关 */
  onNavToggle: function (e) {
    this.setData({ navService: e.detail.value });
  },
  onCompanionToggle: function (e) {
    this.setData({ companionService: e.detail.value });
  },
  onInspectionToggle: function (e) {
    this.setData({ inspectionService: e.detail.value });
  },
  onAutoAcceptToggle: function (e) {
    this.setData({ autoAccept: e.detail.value });
  },
  onSoundToggle: function (e) {
    this.setData({ soundAlert: e.detail.value });
  },
  onVibrationToggle: function (e) {
    this.setData({ vibrationAlert: e.detail.value });
  },

  /** 保存偏好 */
  onSave: function () {
    var that = this;
    that.setData({ saving: true });

    var prefs = {
      minIncome: that.data.minIncome,
      maxDistance: that.data.maxDistance,
      navService: that.data.navService,
      companionService: that.data.companionService,
      inspectionService: that.data.inspectionService,
      autoAccept: that.data.autoAccept,
      soundAlert: that.data.soundAlert,
      vibrationAlert: that.data.vibrationAlert,
    };

    // 保存到本地
    try {
      wx.setStorageSync('listen_preferences', prefs);
    } catch (e) { /* 忽略 */ }

    // 同步到服务端
    api.updatePreferences(prefs).then(function () {
      wx.showToast({ title: '偏好已保存', icon: 'success' });
      that.setData({ saving: false });
    }).catch(function () {
      wx.showToast({ title: '偏好已本地保存', icon: 'success' });
      that.setData({ saving: false });
    });
  },

  /** 重置为默认值 */
  onReset: function () {
    var that = this;
    wx.showModal({
      title: '重置偏好',
      content: '确定恢复为默认设置吗？',
      success: function (res) {
        if (res.confirm) {
          that.setData({
            minIncome: 10,
            maxDistance: 3,
            minIncomeText: '10',
            maxDistanceText: '3',
            navService: true,
            companionService: true,
            inspectionService: true,
            autoAccept: false,
            soundAlert: true,
            vibrationAlert: true,
          });
          wx.showToast({ title: '已重置', icon: 'success' });
        }
      },
    });
  },
});
