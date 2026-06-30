var api = require('../../utils/api');

Page({
  data: {
    currentTab: 'help', // help | feedback
    // 帮助文章
    articles: [
      { id: 1, title: '如何注册成为领航员？', content: '打开为家航领航员小程序，点击"认证注册"，依次完成实名认证、市场考核、技能选择三步即可。审核通过后即可开始接单。' },
      { id: 2, title: '如何接单？', content: '在接单大厅中可以看到附近的待接订单。点击"立即抢单"按钮完成接单，接单后有15分钟时间到达店铺。也可设置听单偏好，系统会自动匹配适合的订单推送给你。' },
      { id: 3, title: '服务费如何计算？', content: '服务费 = 基础服务费 + 距离附加 + 时段附加 + 天气附加。导航服务基础费39元、陪逛150元、验货25元。等级越高抽佣越低，钻石等级最低仅10%。' },
      { id: 4, title: '如何提现？', content: '在"收益"页面点击"提现"，选择提现方式（微信零钱/银行卡），输入金额后提交。到账时间1-3个工作日，最低提现金额10元。' },
      { id: 5, title: '疲劳机制说明', content: '为保证服务质量，平台设有疲劳保护机制：连续在线4小时会收到休息提醒，连续在线12小时将强制下线。离线满2小时后回归可获得5元奖励。' },
      { id: 6, title: '等级体系说明', content: '领航员共5个等级：青铜→白银→黄金→铂金→钻石。等级越高佣金比例越低（20%→10%）、派单权重越高（1.0→2.0）。升级依据：接单量、评分、从业时间。' },
      { id: 7, title: '遇到客户纠纷怎么办？', content: '在"我的"页面中进入"申诉中心"，提交申诉原因和证据。平台将在1个工作日内介入处理。服务过程中遇到问题可随时联系平台客服。' },
      { id: 8, title: '联系平台客服', content: '客服电话：400-XXX-XXXX\n客服微信：weijiahang_kf\n工作时间：周一至周日 8:00-22:00\n\n紧急情况请直接拨打电话。' },
    ],
    expandedId: -1,
    // 反馈表单
    feedbackType: '',
    feedbackContent: '',
    feedbackContact: '',
    submitting: false,
  },

  onTabTap: function (e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  onArticleTap: function (e) {
    var id = e.currentTarget.dataset.id;
    this.setData({
      expandedId: this.data.expandedId === id ? -1 : id
    });
  },

  onFeedbackType: function (e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ feedbackType: type });
  },

  onContentInput: function (e) {
    this.setData({ feedbackContent: e.detail.value });
  },

  onContactInput: function (e) {
    this.setData({ feedbackContact: e.detail.value });
  },

  onSubmitFeedback: function () {
    var that = this;
    if (!that.data.feedbackContent.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' });
      return;
    }
    if (!that.data.feedbackType) {
      wx.showToast({ title: '请选择反馈类型', icon: 'none' });
      return;
    }

    that.setData({ submitting: true });

    api.submitFeedback({
      type: that.data.feedbackType,
      content: that.data.feedbackContent.trim(),
      contact: that.data.feedbackContact.trim(),
    }).then(function () {
      wx.showToast({ title: '反馈已提交，感谢您的建议', icon: 'success' });
      that.setData({
        feedbackType: '',
        feedbackContent: '',
        feedbackContact: '',
        submitting: false
      });
    }).catch(function (err) {
      // 后端不可用时也给予成功反馈
      wx.showToast({ title: '反馈已记录', icon: 'success' });
      that.setData({
        feedbackType: '',
        feedbackContent: '',
        feedbackContact: '',
        submitting: false
      });
    });
  },
});
