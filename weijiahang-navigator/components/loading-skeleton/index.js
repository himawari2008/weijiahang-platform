// components/loading-skeleton/index.js
// 统一骨架屏组件
Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    /** 骨架屏类型：'card' | 'list' | 'detail' | 'grid' */
    type: {
      type: String,
      value: 'card'
    },
    /** 行数（list 类型有效） */
    rows: {
      type: Number,
      value: 3
    },
    /** 是否显示 */
    loading: {
      type: Boolean,
      value: true
    }
  },

  data: {
    listRows: []
  },

  observers: {
    'rows': function (rows) {
      var listRows = [];
      for (var i = 0; i < rows; i++) {
        listRows.push(i);
      }
      this.setData({ listRows: listRows });
    }
  },

  lifetimes: {
    attached: function () {
      var rows = this.properties.rows;
      var listRows = [];
      for (var i = 0; i < rows; i++) {
        listRows.push(i);
      }
      this.setData({ listRows: listRows });
    }
  }
});
