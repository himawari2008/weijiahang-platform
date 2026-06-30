Page({
  data: {
    faqs: [
      { q:'如何预约领航员？', a:'在首页选择市场，进入店铺详情页点击"预约领航员"，选择服务类型后下单即可。领航员接单后会联系你确认时间。', open: false },
      { q:'领航员费用怎么算？', a:'导航单19元起、陪逛单99元/半天、验货单15元、送货单49元起。平台抽取20%服务费。费用在下单时明确展示。', open: false },
      { q:'买了材料不满意怎么办？', a:'收货时发现货不对板、破损、缺货，请立即在订单详情页申请售后。核实属实免费换货或退款。平台三重保障：商家备货拍照→领航员验货→你确认收货。', open: false },
      { q:'怎么联系领航员？', a:'领航员接单后，在订单详情页可直接联系对方。也可以在底部"消息"Tab查看历史对话记录。', open: false },
      { q:'运费谁出？', a:'自提免费。送货上门按实际里程计价（货拉拉等），由你支付，平台不赚差价。下单时系统会预估运费。', open: false },
      { q:'平台如何保障我的权益？', a:'三重保障：商家备货拍照→领航员取货验货→你收货确认。任一环节出问题，平台先行赔付。', open: false },
    ],
  },

  onToggleFaq(e) {
    const idx = e.currentTarget.dataset.index;
    const faqs = [...this.data.faqs];
    faqs[idx].open = !faqs[idx].open;
    this.setData({ faqs });
  },

  onCall() {
    wx.showModal({
      title: '客服电话',
      content: '400-XXX-XXXX\n\n工作时间：工作日 9:00-21:00\n周末 10:00-18:00',
      confirmText: '拨打',
      success(res) {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '4000000000' });
        }
      },
    });
  },

  onOnlineService() {
    wx.navigateTo({ url:'/pages/chat/chat?id=service&name=为家航客服&type=system' });
  },

  onDispute() {
    wx.navigateTo({ url:'/pages/dispute/dispute' });
  },

  onFeedback() {
    wx.navigateTo({ url:'/pages/feedback/feedback' });
  },
});
