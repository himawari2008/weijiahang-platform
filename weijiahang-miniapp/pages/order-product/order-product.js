Page({
  data: {
    shop: {}, keyword: '', delivery: 'pickup', address: '', note: '',
    allProducts: [], poolProducts: [],
    selectedItems: [], itemCount: 0, totalEstimate: 0, deliveryFee: 0,
  },

  onLoad(options) {
    if (options.shopId) {
      this.setData({ shop: { id: options.shopId, name: options.shopName || '店铺' } });
    }
    this.loadCatalog();
  },

  loadCatalog() {
    var prods = [
      { id:'p1',name:'东鹏大理石瓷砖 800x800',spec:'亮面 灰色系',price:128,unit:'㎡',selected:false,qty:'' },
      { id:'p2',name:'马可波罗仿古砖 600x600',spec:'哑光防滑',price:88,unit:'㎡',selected:false,qty:'' },
      { id:'p3',name:'欧神诺全抛釉地砖',spec:'800x800 亮光',price:158,unit:'㎡',selected:false,qty:'' },
      { id:'p4',name:'冠珠岩板 750x1500',spec:'大板',price:198,unit:'㎡',selected:false,qty:'' },
      { id:'p5',name:'东鹏厨卫墙砖 300x600',spec:'亮面白',price:68,unit:'㎡',selected:false,qty:'' },
      { id:'p6',name:'瓷砖胶 C2型 25kg',spec:'25kg/袋',price:55,unit:'袋',selected:false,qty:'' },
      { id:'p7',name:'美缝剂 400ml',spec:'贵族银',price:48,unit:'支',selected:false,qty:'' },
      { id:'p8',name:'水泥 P.O42.5 50kg',spec:'50kg/袋',price:28,unit:'袋',selected:false,qty:'' },
    ];
    this.setData({ allProducts: prods, poolProducts: prods });
  },

  onSearch(e) {
    var kw = e.detail.value; this.setData({ keyword: kw });
    var filtered = kw ? this.data.allProducts.filter(function(p) { return p.name.indexOf(kw) !== -1 || (p.spec && p.spec.indexOf(kw) !== -1); }) : this.data.allProducts;
    this.setData({ poolProducts: filtered });
  },

  onTogglePick(e) {
    var id = e.currentTarget.dataset.id;
    var prods = this.data.poolProducts;
    for (var i = 0; i < prods.length; i++) {
      if (prods[i].id === id) {
        prods[i].selected = !prods[i].selected;
        if (!prods[i].selected) prods[i].qty = '';
        break;
      }
    }
    this.setData({ poolProducts: prods });
    this.recalc();
  },

  onQty(e) {
    var id = e.currentTarget.dataset.id;
    var prods = this.data.poolProducts;
    for (var i = 0; i < prods.length; i++) {
      if (prods[i].id === id) { prods[i].qty = e.detail.value; break; }
    }
    this.setData({ poolProducts: prods });
    this.recalc();
  },

  onDelivery(e) {
    this.setData({ delivery: e.currentTarget.dataset.type });
    this.recalc();
  },
  onAddr(e) { this.setData({ address: e.detail.value }); },
  onNote(e) { this.setData({ note: e.detail.value }); },

  recalc() {
    var items = [];
    var totalEstimate = 0;
    for (var i = 0; i < this.data.poolProducts.length; i++) {
      var p = this.data.poolProducts[i];
      if (p.selected && parseFloat(p.qty) > 0) {
        var qty = parseFloat(p.qty);
        var item = { id:p.id, name:p.name, spec:p.spec, price:p.price, unit:p.unit, qty:qty };
        items.push(item);
        totalEstimate += Math.round(qty * p.price);
      }
    }
    // 配送费预估：自提0，送货按距离估（暂时固定50）
    var deliveryFee = this.data.delivery === 'delivery' ? 50 : 0;
    this.setData({
      selectedItems: items,
      itemCount: items.length,
      totalEstimate: totalEstimate,
      deliveryFee: deliveryFee
    });
  },

  /** 提交订单 → 商家确认价格后 → 用户支付 */
  onSubmit() {
    if (this.data.itemCount === 0) return;

    var totalPay = this.data.totalEstimate + this.data.deliveryFee;
    var content = '商品小计 ¥' + this.data.totalEstimate;
    if (this.data.deliveryFee > 0) {
      content += ' + 配送费 ¥' + this.data.deliveryFee;
    }
    content += '\n\n提交后商家会确认实际价格，确认后你再支付。';

    var that = this;
    wx.showModal({
      title: '确认提交订单',
      content: content,
      confirmText: '提交订单',
      success: function(res) {
        if (res.confirm) {
          wx.showToast({ title: '已提交，等待商家确认', icon: 'success', duration: 2000 });
          setTimeout(function() {
            wx.switchTab({ url: '/pages/orders/orders' });
          }, 2000);
        }
      }
    });
  },
});
