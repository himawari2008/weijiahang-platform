Page({
  data: {
    latitude: 34.329,
    longitude: 108.952,
    scale: 15,
    markers: [],
    selectedMarket: null,
    selectedMarketName: '全部市场',

    // 市场数据（API优先加载）
    markets: [],
  },

  onLoad: function () {
    var that = this;
    var api = require('../../utils/api');

    // API优先获取市场列表
    api.getMarkets().then(function (list) {
      if (list.length > 0) {
        list = list.map(function (m) {
          return {
            id: m.id, name: m.name,
            lat: m.latitude, lng: m.longitude,
            shops: m.shopCount || 0,
            description: m.address || '',
          };
        });
        that.setData({ markets: list });
      }
      that._updateMarkers();
    }).catch(function () {
      // API不可用，显示空状态
      that.setData({ markets: [] });
      wx.showToast({ title: '市场加载失败', icon: 'none' });
    });

    // 尝试获取用户当前位置
    wx.getLocation({
      type: 'gcj02',
      success: function (res) {
        that.setData({
          latitude: res.latitude,
          longitude: res.longitude,
        });
        that._updateMarkers();
      },
      fail: function () {
        // 使用默认位置
      }
    });
  },

  /** 构建地图标注 */
  _updateMarkers: function () {
    var markets = this.data.markets;
    var markers = [];
    var colors = ['#FF6B35', '#1677FF', '#52C41A', '#FAAD14'];

    for (var i = 0; i < markets.length; i++) {
      var m = markets[i];
      var isSelected = this.data.selectedMarket && this.data.selectedMarket.id === m.id;
      markers.push({
        id: m.id,
        latitude: m.lat,
        longitude: m.lng,
        title: m.name,
        iconPath: '', // 使用 callout 替代
        width: isSelected ? 36 : 28,
        height: isSelected ? 36 : 28,
        callout: {
          content: m.name,
          fontSize: 13,
          padding: 8,
          borderRadius: 6,
          display: 'ALWAYS',
          bgColor: isSelected ? '#FF6B35' : '#ffffff',
          color: isSelected ? '#ffffff' : '#1A1A2E',
        },
        // 用不同颜色区分
        label: {
          content: String(i + 1),
          fontSize: 14,
          color: '#ffffff',
          bgColor: isSelected ? '#FF6B35' : colors[i % colors.length],
          borderRadius: 20,
          padding: 4,
        }
      });
    }

    this.setData({ markers: markers });
  },

  onMarkerTap: function (e) {
    var marketId = e.detail.markerId;
    var markets = this.data.markets;
    var selected = null;
    for (var i = 0; i < markets.length; i++) {
      if (markets[i].id === marketId) {
        selected = markets[i];
        break;
      }
    }

    if (selected) {
      this.setData({
        selectedMarket: selected,
        selectedMarketName: selected.name,
        latitude: selected.lat,
        longitude: selected.lng,
      });
      this._updateMarkers();
    }
  },

  onSwitchMarket: function () {
    var that = this;
    var markets = that.data.markets;
    var itemList = [];
    for (var i = 0; i < markets.length; i++) {
      itemList.push(markets[i].name);
    }

    wx.showActionSheet({
      itemList: itemList,
      success: function (res) {
        var selected = markets[res.tapIndex];
        that.setData({
          selectedMarket: selected,
          selectedMarketName: selected.name,
          latitude: selected.lat,
          longitude: selected.lng,
        });
        that._updateMarkers();
      }
    });
  },

  onNavigateTo: function () {
    var m = this.data.selectedMarket;
    if (!m) {
      wx.showToast({ title: '请先选择市场', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude: m.lat,
      longitude: m.lng,
      name: m.name,
      address: m.description,
      scale: 16,
    });
  },

  onRegionChange: function (e) {
    // 地图视野变化时更新中心点
    if (e.type === 'end' && e.causedBy === 'drag') {
      this.setData({
        latitude: e.detail.centerLocation.latitude,
        longitude: e.detail.centerLocation.longitude,
      });
    }
  },
});
