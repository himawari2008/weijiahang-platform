// components/stat-card/index.js
// 通用数据统计卡片 — 用于 data-stats / earnings 等页面
Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    /** 统计标签 */
    label: { type: String, value: '' },
    /** 数值 */
    value: { type: null, value: 0 },
    /** 单位（如 %） */
    unit: { type: String, value: '' },
    /** 图标名 */
    icon: { type: String, value: '' },
    /** 主题色 */
    color: { type: String, value: '#FF6B35' },
    /** 数值格式化文本（WXML限制，由父组件预计算） */
    valueText: { type: String, value: '' },
    /** 副标题（如环比变化） */
    subtitle: { type: String, value: '' }
  },

  data: {
    displayValue: ''
  },

  observers: {
    'value, valueText, unit': function (value, valueText, unit) {
      var display = valueText || String(value);
      if (unit) display = display + unit;
      this.setData({ displayValue: display });
    }
  },

  methods: {
    onTap: function () {
      this.triggerEvent('tap', { label: this.properties.label });
    }
  }
});
