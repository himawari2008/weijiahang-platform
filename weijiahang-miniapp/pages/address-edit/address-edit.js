const app = getApp();

/* 地址标签 */
var TAG_OPTIONS = [
  { key: '家', label: '家', icon: '🏠' },
  { key: '公司', label: '公司', icon: '🏢' },
  { key: '市场', label: '市场', icon: '📍' },
];

Page({
  data: {
    mode: 'add',          // add | edit
    id: '',
    form: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      tag: '',
      isDefault: false,
    },
    tagOptions: TAG_OPTIONS,
  },

  onLoad(options) {
    if (options.id) {
      // 编辑模式
      var addr = this._getAddressById(options.id);
      if (addr) {
        this.setData({
          mode: 'edit',
          id: options.id,
          form: {
            name: addr.name || '',
            phone: addr.phone || '',
            province: addr.province || '',
            city: addr.city || '',
            district: addr.district || '',
            detail: addr.detail || '',
            tag: addr.tag || '',
            isDefault: addr.isDefault || false,
          },
        });
      }
    }
  },

  /* ── 表单输入 ── */
  onInput(e) {
    var field = e.currentTarget.dataset.field;
    var val = e.detail.value;
    var form = this.data.form;
    form[field] = val;
    this.setData({ form: form });
  },

  onToggleDefault() {
    this.setData({ 'form.isDefault': !this.data.form.isDefault });
  },

  onTagTap(e) {
    var tag = e.currentTarget.dataset.tag;
    this.setData({ 'form.tag': tag === this.data.form.tag ? '' : tag });
  },

  /* ── 保存 ── */
  onSave() {
    var f = this.data.form;
    // 校验
    if (!f.name || !f.name.trim()) { wx.showToast({ title: '请填写收货人姓名', icon: 'none' }); return; }
    if (!f.phone || !f.phone.trim()) { wx.showToast({ title: '请填写手机号', icon: 'none' }); return; }
    if (!/^1[3-9]\d{9}$/.test(f.phone.trim())) { wx.showToast({ title: '手机号格式不正确', icon: 'none' }); return; }
    if (!f.city || !f.detail.trim()) { wx.showToast({ title: '请完善城市和详细地址', icon: 'none' }); return; }

    var addresses = this._loadAddresses();

    var addr = {
      id: this.data.id || ('addr_' + Date.now()),
      name: f.name.trim(),
      phone: f.phone.trim(),
      province: f.province.trim(),
      city: f.city.trim(),
      district: f.district.trim(),
      detail: f.detail.trim(),
      tag: f.tag,
      isDefault: f.isDefault,
    };

    if (f.isDefault) {
      // 取消其他默认
      addresses.forEach(function (a) { a.isDefault = false; });
    }

    if (this.data.mode === 'edit') {
      var idx = -1;
      for (var i = 0; i < addresses.length; i++) {
        if (addresses[i].id === addr.id) { idx = i; break; }
      }
      if (idx >= 0) { addresses[idx] = addr; }
    } else {
      // 第一条自动设为默认
      if (addresses.length === 0) { addr.isDefault = true; }
      addresses.push(addr);
    }

    wx.setStorageSync('addresses', addresses);
    wx.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
    var that = this;
    setTimeout(function () { wx.navigateBack(); }, 1500);
  },

  /* ── 删除 ── */
  onDelete() {
    var that = this;
    wx.showModal({
      title: '删除收货地址',
      content: '确定删除该地址吗？',
      confirmColor: '#FF6B35',
      success: function (res) {
        if (res.confirm) {
          var addresses = that._loadAddresses();
          addresses = addresses.filter(function (a) { return a.id !== that.data.id; });
          wx.setStorageSync('addresses', addresses);
          wx.showToast({ title: '已删除', icon: 'success', duration: 1200 });
          setTimeout(function () { wx.navigateBack(); }, 1200);
        }
      },
    });
  },

  /* ── 辅助 ── */
  _loadAddresses() {
    try { return wx.getStorageSync('addresses') || []; }
    catch (e) { return []; }
  },

  _getAddressById(id) {
    var addresses = this._loadAddresses();
    for (var i = 0; i < addresses.length; i++) {
      if (addresses[i].id === id) return addresses[i];
    }
    return null;
  },
});
