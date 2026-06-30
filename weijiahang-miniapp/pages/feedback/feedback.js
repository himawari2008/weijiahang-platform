Page({
  data: {
    content: '',
    contact: '',
    contentLen: 0,
    maxLen: 500,
  },

  onInput(e) {
    var v = e.detail.value;
    this.setData({ content: v, contentLen: v.length });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  onSubmit() {
    var that = this;
    var content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' });
      return;
    }
    if (content.length < 5) {
      wx.showToast({ title: '内容太短，至少5个字', icon: 'none' });
      return;
    }

    // 存储反馈（实际上线后发到后端）
    try {
      var list = wx.getStorageSync('feedbacks') || [];
      list.push({
        id: Date.now(),
        content: content,
        contact: that.data.contact.trim(),
        time: new Date().toISOString(),
      });
      wx.setStorageSync('feedbacks', list);
    } catch (e) {}

    wx.showToast({ title: '感谢反馈！我们会认真处理', icon: 'success', duration: 1800 });
    setTimeout(function () {
      wx.navigateBack();
    }, 2000);
  },

  onBack() {
    wx.navigateBack();
  },
});
