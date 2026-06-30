// ============================================
// 为家航领航员 — 验货拍照确认页
// ============================================
var app = getApp();

Page({
  data: {
    orderId: '',
    notes: '',
    checklist: [
      { id: 1, label: '商品全景（整箱/整块）', done: false, photo: '' },
      { id: 2, label: '商品特写（纹理/边角/标签）', done: false, photo: '' },
      { id: 3, label: '价格标签/单据', done: false, photo: '' },
      { id: 4, label: '瑕疵/缺陷（如有）', done: false, photo: '' },
      { id: 5, label: '店铺门头（验证到达）', done: false, photo: '' },
      { id: 6, label: '尺寸测量（卷尺读数）', done: false, photo: '' },
    ],
    doneCount: 0,
    progressPercent: 0,
    canSubmit: false,
    submitting: false,
  },

  /** 重新计算已完成数和进度（WXML不能用.filter()表达式） */
  _updateProgress: function () {
    var list = this.data.checklist;
    var doneCount = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].done) doneCount++;
    }
    var progressPercent = list.length > 0 ? Math.round(doneCount / list.length * 100) : 0;
    var canSubmit = doneCount >= 3;
    this.setData({
      doneCount: doneCount,
      progressPercent: progressPercent,
      canSubmit: canSubmit,
    });
  },

  onLoad: function (options) {
    this.setData({ orderId: options.orderId || '' });
    this._updateProgress();
  },

  // 拍照
  onPhoto: function (e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: function (res) {
        var list = that.data.checklist;
        var item = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) {
            item = list[i];
            break;
          }
        }
        if (item) {
          item.done = true;
          item.photo = res.tempFiles[0].tempFilePath;
        }
        that.setData({ checklist: list });
        that._updateProgress();
      },
    });
  },

  // 重拍
  onRetake: function (e) {
    var id = e.currentTarget.dataset.id;
    var list = this.data.checklist;
    var item = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        item = list[i];
        break;
      }
    }
    if (item) {
      item.done = false;
      item.photo = '';
    }
    this.setData({ checklist: list });
    this._updateProgress();
    // 重新拍照
    this.onPhoto(e);
  },

  // 备注输入
  onNotesInput: function (e) {
    this.setData({ notes: e.detail.value });
  },

  // 提交验货报告
  onSubmit: function () {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请至少完成3项拍照', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    var that = this;

    // 构造提交数据
    var photos = [];
    var list = that.data.checklist;
    for (var i = 0; i < list.length; i++) {
      if (list[i].photo) {
        photos.push(list[i].photo);
      }
    }

    var api = require('../../utils/api');
    api.submitInspection(that.data.orderId, {
      photos: photos,
      checklist: list,
      notes: that.data.notes,
    }).then(function () {
      wx.showToast({ title: '验货报告已提交', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack();
      }, 1500);
    }).catch(function (err) {
      var msg = err.message || '提交失败，请重试';
      wx.showToast({ title: msg, icon: 'none' });
      that.setData({ submitting: false });
    });
  },
});
