const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    currentStep: 0,
    calcMode: '',        // 'photo' | 'whole' | 'single'
    // 全屋模式
    spaces: [
      { name: '客厅', icon: '客', selected: false, area: '' },
      { name: '卧室', icon: '卧', selected: false, area: '' },
      { name: '厨房', icon: '厨', selected: false, area: '' },
      { name: '卫生间', icon: '卫', selected: false, area: '' },
      { name: '阳台', icon: '阳', selected: false, area: '' },
    ],
    selectedSpaces: [],
    style: 'modern',
    // 拍照模式
    uploadedImage: '',
    imageBase64: '',
    // 单品类模式
    singleCategories: [
      { name: '瓷砖', icon: '瓷' }, { name: '地板', icon: '地' },
      { name: '卫浴', icon: '卫' }, { name: '门窗', icon: '门' },
      { name: '涂料', icon: '涂' }, { name: '灯具', icon: '灯' },
      { name: '五金', icon: '五' }, { name: '石材', icon: '石' },
    ],
    singleCategory: '',
    singleUsage: '',
    singleArea: '',
    singleBudget: '',
    // 计算状态
    calculating: false,
    materials: [],
    totalArea: 0, totalMin: 0, totalMax: 0,
    spacesSummary: '',
    util,
  },

  /** 选择计算模式 */
  onModeTap(e) {
    this.setData({ calcMode: e.currentTarget.dataset.mode });
  },

  /** 下一步 */
  onNextStep() {
    const { calcMode } = this.data;
    if (calcMode === 'whole') {
      const sp = this.data.spaces.filter((s) => s.selected).map((s) => ({
        ...s, area: S.defaultArea[s.name] || 20,
      }));
      this.setData({ currentStep: 1, selectedSpaces: sp });
    } else {
      this.setData({ currentStep: 1 });
    }
  },

  /** 返回上一步 */
  onPrevStep() {
    this.setData({ currentStep: 0 });
  },

  // ===== 拍照模式 =====
  onUploadPhoto() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['camera', 'album'],
      success: (res) => {
        const p = res.tempFiles[0].tempFilePath;
        this.setData({ uploadedImage: p });
        wx.getFileSystemManager().readFile({
          filePath: p, encoding: 'base64',
          success: (r) => this.setData({ imageBase64: r.data }),
        });
      },
    });
  },

  // ===== 全屋模式 =====
  onSpaceToggle(e) {
    const i = e.currentTarget.dataset.index;
    const sp = this.data.spaces;
    sp[i].selected = !sp[i].selected;
    this.setData({ spaces: sp });
  },

  onAreaInput(e) {
    const i = e.currentTarget.dataset.index;
    const sp = this.data.selectedSpaces;
    sp[i].area = e.detail.value;
    this.setData({ selectedSpaces: sp });
  },

  onStyleTap(e) { this.setData({ style: e.currentTarget.dataset.style }); },

  // ===== 单品类模式 =====
  onSingleCatTap(e) { this.setData({ singleCategory: e.currentTarget.dataset.cat }); },
  onSingleUsage(e) { this.setData({ singleUsage: e.detail.value }); },
  onSingleArea(e) { this.setData({ singleArea: e.detail.value }); },
  onSingleBudget(e) { this.setData({ singleBudget: e.detail.value }); },

  // ===== 调用AI =====
  async onCalc() {
    this.setData({ calculating: true });
    try {
      const { calcMode, style, uploadedImage, imageBase64 } = this.data;
      var payload = { style: style, city: '西安' };

      if (calcMode === 'single') {
        const area = parseFloat(this.data.singleArea) || 20;
        const budget = parseFloat(this.data.singleBudget) || 0;
        payload.spaces = [{
          type: 'custom', name: this.data.singleUsage || this.data.singleCategory,
          area, category: this.data.singleCategory, budget,
        }];
      } else if (calcMode === 'photo') {
        payload.spaces = [];
        payload.imageBase64 = imageBase64;
      } else {
        payload.spaces = this.data.selectedSpaces.map((s) => ({
          type: S.spaceTypeMap[s.name] || 'other',
          name: s.name, area: parseFloat(s.area) || 20,
        }));
      }

      // 调用API，失败时降级到本地计算引擎
      let result;
      try {
        result = await api.calcMaterials(payload);
      } catch(e) {
        result = localCalc(payload);
      }

      let totalMin = 0, totalMax = 0;
      const materials = (result.materials || []).map((group) => {
        let gMin = 0, gMax = 0;
        (group.items || []).forEach((item) => {
          gMin += item.priceRange?.min || 0;
          gMax += item.priceRange?.max || 0;
        });
        totalMin += gMin; totalMax += gMax;
        return { ...group, totalMin: gMin, totalMax: gMax };
      });

      const totalArea = result.recognizedArea ||
        (calcMode === 'single' ? parseFloat(this.data.singleArea) : payload.spaces.reduce((s, sp) => s + sp.area, 0));
      const spacesSummary = result.recognizedRooms ||
        (calcMode === 'single' ? this.data.singleCategory : payload.spaces.map((s) => s.name).join('、'));

      this.setData({
        currentStep: 2, materials, totalArea: totalArea || 0, spacesSummary,
        totalMin: Math.round(totalMin), totalMax: Math.round(totalMax),
        calculating: false,
      });
    } catch (err) {
      console.error('计算失败', err);
      wx.showToast({ title: '计算失败，请重试', icon: 'none' });
      this.setData({ calculating: false });
    }
  },

  onFindShops() {
    const cats = this.data.materials.map((m) => m.category);
    wx.navigateTo({ url: `/pages/shop-list/shop-list?categories=${cats.join(',')}` });
  },
  onSaveList() {
    wx.setStorageSync('material_list', this.data.materials);
    wx.showToast({ title: '已保存', icon: 'success' });
  },
});

/** 本地计算引擎 — 当API不可用时降级使用 */
function localCalc(payload) {
  var spaces = payload.spaces || [];
  var style = payload.style || 'modern';
  var materials = [];
  var totalArea = 0;

  // 价格系数（风格调整）
  var styleFactor = { modern: 1.0, nordic: 1.05, chinese: 1.15 }[style] || 1.0;

  for (var i = 0; i < spaces.length; i++) {
    var sp = spaces[i];
    var area = sp.area || 20;
    totalArea += area;
    var cat = sp.category || sp.type || 'tile';

    if (cat === '瓷砖' || cat === 'tile') {
      var tileQty = Math.ceil(area / 0.64 * 1.05); // 800×800=0.64㎡, 5%损耗
      materials.push({
        category: '瓷砖',
        items: [
          { name: '地砖800×800', spec: '800×800mm 亮面', qty: tileQty, unit: '片', priceRange: { min: Math.round(60 * styleFactor), max: Math.round(150 * styleFactor) } },
          { name: '瓷砖胶', spec: 'C2型 25kg', qty: Math.ceil(area / 5), unit: '袋', priceRange: { min: 45, max: 80 } },
          { name: '美缝剂', spec: '400ml', qty: Math.ceil(area / 8), unit: '支', priceRange: { min: 30, max: 60 } },
        ],
        totalMin: 0, totalMax: 0,
      });
    } else if (cat === '地板' || cat === 'floor') {
      var floorQty = Math.ceil(area * 1.08); // 8%损耗
      materials.push({
        category: '地板',
        items: [
          { name: '强化复合地板', spec: '1200×200mm', qty: floorQty, unit: '㎡', priceRange: { min: Math.round(60 * styleFactor), max: Math.round(150 * styleFactor) } },
          { name: '防潮膜', spec: '2mm', qty: area, unit: '㎡', priceRange: { min: 3, max: 8 } },
          { name: '踢脚线', spec: 'PVC', qty: Math.ceil(Math.sqrt(area) * 4), unit: '米', priceRange: { min: 8, max: 20 } },
        ],
        totalMin: 0, totalMax: 0,
      });
    } else if (cat === '卫浴' || cat === 'bathroom') {
      materials.push({
        category: '卫浴',
        items: [
          { name: '马桶', spec: '虹吸式 305坑距', qty: 1, unit: '台', priceRange: { min: Math.round(800 * styleFactor), max: Math.round(2000 * styleFactor) } },
          { name: '花洒套装', spec: '全铜三出水', qty: 1, unit: '套', priceRange: { min: Math.round(600 * styleFactor), max: Math.round(1500 * styleFactor) } },
          { name: '浴室柜', spec: '80cm', qty: 1, unit: '套', priceRange: { min: Math.round(800 * styleFactor), max: Math.round(2000 * styleFactor) } },
          { name: '墙地砖', spec: '300×600mm', qty: Math.ceil(area / 0.18 * 1.05), unit: '片', priceRange: { min: Math.round(40 * styleFactor), max: Math.round(100 * styleFactor) } },
        ],
        totalMin: 0, totalMax: 0,
      });
    } else if (cat === '涂料' || cat === 'paint') {
      var paintQty = Math.ceil(area / 8 * 2); // 8㎡/L/遍, 2遍
      materials.push({
        category: '涂料',
        items: [
          { name: '内墙底漆', spec: '18L', qty: Math.ceil(paintQty / 36), unit: '桶', priceRange: { min: Math.round(300 * styleFactor), max: Math.round(600 * styleFactor) } },
          { name: '内墙面漆', spec: '18L', qty: Math.ceil(paintQty / 18), unit: '桶', priceRange: { min: Math.round(400 * styleFactor), max: Math.round(1000 * styleFactor) } },
          { name: '腻子粉', spec: '20kg', qty: Math.ceil(area / 3), unit: '袋', priceRange: { min: 25, max: 50 } },
        ],
        totalMin: 0, totalMax: 0,
      });
    } else if (cat === '门窗' || cat === 'door') {
      materials.push({
        category: '门窗',
        items: [
          { name: '室内门', spec: '800×2100mm', qty: Math.max(1, Math.ceil(area / 20)), unit: '扇', priceRange: { min: Math.round(800 * styleFactor), max: Math.round(2000 * styleFactor) } },
          { name: '断桥铝窗', spec: '70系双层中空', qty: Math.ceil(area * 0.25), unit: '㎡', priceRange: { min: Math.round(500 * styleFactor), max: Math.round(1000 * styleFactor) } },
        ],
        totalMin: 0, totalMax: 0,
      });
    } else {
      // 默认按瓷砖算
      var defQty = Math.ceil(area / 0.64 * 1.05);
      materials.push({
        category: '主材',
        items: [
          { name: '主材', spec: '标准规格', qty: defQty, unit: '片', priceRange: { min: Math.round(60 * styleFactor), max: Math.round(150 * styleFactor) } },
          { name: '辅材', spec: '配套', qty: Math.ceil(area / 5), unit: '袋', priceRange: { min: 20, max: 50 } },
        ],
        totalMin: 0, totalMax: 0,
      });
    }
  }

  // 汇总
  var totalMin = 0, totalMax = 0;
  for (var j = 0; j < materials.length; j++) {
    var g = materials[j];
    var gMin = 0, gMax = 0;
    for (var k = 0; k < g.items.length; k++) {
      var it = g.items[k];
      gMin += it.priceRange.min;
      gMax += it.priceRange.max;
    }
    g.totalMin = gMin;
    g.totalMax = gMax;
    totalMin += gMin;
    totalMax += gMax;
  }

  var spacesSummary = spaces.map(function(s) { return s.name; }).join('、');

  return {
    materials: materials,
    totalMin: totalMin,
    totalMax: totalMax,
    totalArea: totalArea,
    spacesSummary: spacesSummary,
  };
}

const S = {
  defaultArea: { '客厅': 25, '卧室': 15, '厨房': 8, '卫生间': 5, '阳台': 5 },
  spaceTypeMap: { '客厅': 'living_room', '卧室': 'bedroom', '厨房': 'kitchen', '卫生间': 'bathroom', '阳台': 'balcony' },
};
