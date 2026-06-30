/**
 * 为家航 · 商品列表 / 分类浏览 / 搜索
 * 从首页分类入口、搜索跳转进入
 */
var app = getApp();
var api = require('../../utils/api.js');

/* ═══ 子分类映射 ═══ */
var SUB_MAP = {
  '瓷砖': ['全部', '地砖', '墙砖', '仿古砖', '大理石瓷砖', '岩板', '马赛克', '木纹砖', '花砖'],
  '卫浴': ['全部', '马桶', '花洒套装', '浴室柜', '浴缸', '淋浴房', '智能马桶'],
  '地板': ['全部', '强化地板', '实木地板', '实木复合', 'SPC锁扣地板'],
  '涂料': ['全部', '乳胶漆', '艺术漆', '硅藻泥', '墙纸', '墙布'],
  '门窗': ['全部', '室内木门', '防盗门', '铝合金窗', '推拉门', '断桥铝窗'],
  '石材': ['全部', '大理石', '花岗岩', '石英石', '人造石', '岩板台面'],
  '辅材': ['全部', '水泥沙子', '防水涂料', '腻子粉', '瓷砖胶', '美缝剂'],
  '灯具': ['全部', '吸顶灯', '吊灯', '筒灯射灯', '灯带'],
  '厨电': ['全部', '烟灶套装', '消毒柜', '洗碗机', '热水器'],
  '管材': ['全部', 'PPR管', 'PVC管', '电线电缆', '开关插座'],
};

Page({
  data: {
    category: '',
    activeSub: '',
    subCategories: [],
    sortBy: 'default',
    keyword: '',
    allProducts: [],
    products: [],
    focusSearch: false,
  },

  onLoad(options) {
    var that = this;
    var cat = options.category || '';
    var focusSearch = options.focus === 'search';
    var marketId = options.marketId || '';

    this.setData({
      category: cat || '全部商品',
      focusSearch: focusSearch,
      marketId: marketId,
    });

    // API优先获取商品列表
    var city = app.getCurrentCity();
    if (city === '定位中…') city = '西安';

    var params = { city: city, sort: 'sales', limit: 50 };
    if (cat && cat !== 'all') params.category = cat;
    if (marketId) params.marketId = marketId;

    api.searchProducts(params).then(function (res) {
      var list = Array.isArray(res) ? res : (res.list || res.items || []);
      if (list.length > 0) {
        // 品类筛选
        if (cat && cat !== 'all') {
          list = list.filter(function (p) { return p.category === cat || p.cate === cat; });
        }
        // 子分类加载
        if (cat && SUB_MAP[cat]) {
          that.setData({ subCategories: SUB_MAP[cat] });
        }
        that.setData({ allProducts: list, products: list });
        return;
      }
      throw new Error('空数据');
    }).catch(function () {
      // API不可用，显示空状态
      if (cat && SUB_MAP[cat]) {
        that.setData({ subCategories: SUB_MAP[cat] });
      }
      that.setData({ allProducts: [], products: [] });
    });
  },

  /* ═══ 搜索 ═══ */
  onSearchInput(e) {
    var keyword = e.detail.value.trim();
    this.setData({ keyword: keyword });
    this._applyFilters(keyword, this.data.activeSub, this.data.sortBy);
  },

  onSearchConfirm(e) {
    var keyword = e.detail.value.trim();
    this._applyFilters(keyword, this.data.activeSub, this.data.sortBy);
  },

  onClearSearch() {
    this.setData({ keyword: '' });
    this._applyFilters('', this.data.activeSub, this.data.sortBy);
  },

  /* ═══ 子类筛选 ═══ */
  onSubTap(e) {
    var sub = e.currentTarget.dataset.sub;
    if (sub === '全部') sub = '';
    this.setData({ activeSub: sub });
    this._applyFilters(this.data.keyword, sub, this.data.sortBy);
  },

  /* ═══ 排序 ═══ */
  onSort(e) {
    var sortBy = e.currentTarget.dataset.sort;
    this.setData({ sortBy: sortBy });
    this._applyFilters(this.data.keyword, this.data.activeSub, sortBy);
  },

  /* ═══ 统合筛选+排序 ═══ */
  _applyFilters(keyword, sub, sortBy) {
    var list = this.data.allProducts.slice();

    // 搜索关键词
    if (keyword) {
      var kw = keyword.toLowerCase();
      list = list.filter(function (p) {
        return p.name.indexOf(kw) >= 0 || p.shopName.indexOf(kw) >= 0 || p.cate.indexOf(kw) >= 0;
      });
    }

    // 子分类
    if (sub) {
      list = list.filter(function (p) { return p.sub === sub; });
    }

    // 排序
    if (sortBy === 'rating') {
      list.sort(function (a, b) { return (b.shopRating || 0) - (a.shopRating || 0); });
    } else if (sortBy === 'sales') {
      list.sort(function (a, b) { return (b.sales || 0) - (a.sales || 0); });
    } else if (sortBy === 'price_asc') {
      list.sort(function (a, b) { return a.price - b.price; });
    } else if (sortBy === 'price_desc') {
      list.sort(function (a, b) { return b.price - a.price; });
    }
    // default 保持原序（城市优先）

    this.setData({ products: list });
  },

  /* ═══ 商品点击 → 商品详情 ═══ */
  onProductTap(e) {
    var d = e.currentTarget.dataset;
    var params = [
      'id=' + encodeURIComponent(d.id),
      'name=' + encodeURIComponent(d.name),
      'price=' + d.price,
      'spec=' + encodeURIComponent(d.spec || ''),
      'shopId=' + encodeURIComponent(d.shopId || ''),
      'shopName=' + encodeURIComponent(d.shop || ''),
      'sales=' + (d.sales || 0),
    ];
    wx.navigateTo({ url: '/pages/product-detail/product-detail?' + params.join('&') });
  },

  onAICalc() { wx.navigateTo({ url: '/pages/ai-calc/ai-calc' }); },
});
