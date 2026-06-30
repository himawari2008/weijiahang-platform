const app = getApp();

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    phone: '',
    gender: 0,  // 0-未知 1-男 2-女
    genderLabels: ['未设置', '男', '女'],
  },

  onLoad() {
    const user = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    this.setData({
      avatarUrl: user.avatarUrl || '',
      nickname: user.nickname || '',
      phone: user.phone || '',
      gender: user.gender || 0,
    });
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ avatarUrl: res.tempFiles[0].tempFilePath });
      },
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  /** 获取微信手机号 */
  onGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 解密手机号需要后端配合
      wx.showToast({ title: '已获取手机号', icon: 'success' });
    }
  },

  onGenderChange(e) {
    this.setData({ gender: parseInt(e.detail.value) });
  },

  onSave() {
    const { nickname, phone, gender } = this.data;
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    const token = wx.getStorageSync('token');
    wx.request({
      url: `${app.globalData.apiBase}/users/profile`,
      method: 'PATCH',
      data: { nickname, phone, gender },
      header: { 'Authorization': 'Bearer ' + (token || '') },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          // 更新本地缓存
          const user = {
            ...(app.globalData.userInfo || {}),
            nickname, phone, gender,
          };
          app.globalData.userInfo = user;
          wx.setStorageSync('userInfo', user);
          wx.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } else {
          // 降级
          this.saveLocal();
        }
      },
      fail: () => {
        this.saveLocal();
      },
    });
  },

  saveLocal() {
    const { nickname, phone, gender } = this.data;
    const user = {
      ...(app.globalData.userInfo || {}),
      nickname, phone, gender,
    };
    app.globalData.userInfo = user;
    wx.setStorageSync('userInfo', user);
    wx.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1000);
  },
});
