/**
 * 为家航 Logo 组件（CSS纯代码绘制）
 * 房屋 + 导航指针 + 文字
 *
 * 属性：
 *   showText — 是否显示"为家航"文字（默认 false）
 *   size     — 图标大小 rpx（默认 80）
 */

Component({
  properties: {
    showText: {
      type: Boolean,
      value: false,
    },
    size: {
      type: Number,
      value: 80,
    },
  },

  data: {
    iconSize: 80,
  },

  lifetimes: {
    attached() {
      this.setData({ iconSize: this.properties.size });
    },
  },

  observers: {
    'size'(val) {
      this.setData({ iconSize: val });
    },
  },
});
