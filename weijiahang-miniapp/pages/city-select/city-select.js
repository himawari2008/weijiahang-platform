const app = getApp();
var api = require('../../utils/api.js');

/* 全国主要城市列表（API不可用时降级使用） */
var ALL_CITIES = [
  '北京', '上海', '广州', '深圳',
  '成都', '重庆', '杭州', '武汉',
  '西安', '郑州', '南京', '长沙',
  '天津', '苏州', '合肥', '济南',
  '青岛', '福州', '厦门', '昆明',
  '贵阳', '南宁', '海口', '石家庄',
  '太原', '沈阳', '大连', '长春',
  '哈尔滨', '兰州', '银川', '西宁',
  '乌鲁木齐', '拉萨', '呼和浩特', '南昌',
];

Page({
  data: {
    currentCity: '',
    locatedCity: '',
    locating: false,

    /* 搜索 */
    searchWord: '',
    searchFocused: false,

    /* 城市列表（搜索过滤后） */
    cities: [],
    /* 全量城市名数组（用于过滤回退） */
    _allCityNames: ALL_CITIES,
    /* 已开通城市名列表（API返回） */
    _activeCityNames: [],
  },

  onLoad() {
    var that = this;
    var currentCity = app.getCurrentCity();
    this.setData({ currentCity: currentCity });

    // API优先：获取已开通城市列表
    this._loadCities();

    // 进来就尝试静默定位
    this._tryAutoLocate();
  },

  /** 加载城市列表：API优先 + Mock降级 */
  _loadCities() {
    var that = this;
    api.getActiveCities().then(function (res) {
      var config = res;
      var cityList = (config && config.cities) ? config.cities : [];
      // 已开通城市排前面
      var activeNames = [];
      var allNames = [];
      for (var i = 0; i < cityList.length; i++) {
        var c = cityList[i];
        if (c.status === 1) activeNames.push(c.name);
        allNames.push(c.name);
      }
      // 合并：已开通 + 未开通 + 全国城市补全
      var merged = activeNames.concat(allNames.filter(function (n) { return activeNames.indexOf(n) < 0; }));
      // 补充全国城市中不在API列表中的
      for (var j = 0; j < ALL_CITIES.length; j++) {
        if (merged.indexOf(ALL_CITIES[j]) < 0) merged.push(ALL_CITIES[j]);
      }
      that.setData({ cities: merged, _allCityNames: merged, _activeCityNames: activeNames });
    }).catch(function () {
      that.setData({ cities: ALL_CITIES, _allCityNames: ALL_CITIES, _activeCityNames: ['西安'] });
    });
  },

  /* ═══ 搜索 ═══ */
  onSearchInput(e) {
    var word = e.detail.value.trim();
    this.setData({ searchWord: word });
    this._filterCities(word);
  },

  onSearchClear() {
    this.setData({ searchWord: '', cities: this.data._allCityNames });
  },

  onSearchFocus() {
    this.setData({ searchFocused: true });
  },

  onSearchBlur() {
    this.setData({ searchFocused: false });
  },

  /** 按关键字过滤城市 */
  _filterCities(word) {
    if (!word) {
      this.setData({ cities: this.data._allCityNames });
      return;
    }
    var allNames = this.data._allCityNames;
    var filtered = allNames.filter(function (c) {
      return c.indexOf(word) >= 0 || c.toUpperCase().indexOf(word.toUpperCase()) >= 0;
    });
    this.setData({ cities: filtered });
  },

  /* ═══ GPS 定位 ═══ */

  /** 静默定位（进入时，不弹 toast） */
  _tryAutoLocate() {
    var that = this;
    this.setData({ locating: true });

    app.getCurrentLocation().then(function (result) {
      that.setData({ locating: false });
      if (result && result.cityInfo && result.cityInfo.city) {
        var city = result.cityInfo.city.replace('市', '');
        that.setData({ locatedCity: city });
        app.setCity(result.cityInfo);
        if (city !== that.data.currentCity) {
          that.setData({ currentCity: city });
        }
      }
    }).catch(function () {
      that.setData({ locating: false });
    });
  },

  /** 用户点击重新定位 */
  onAutoLocate() {
    var that = this;
    this.setData({ locating: true });

    app.getCurrentLocation().then(function (result) {
      that.setData({ locating: false });
      if (result && result.cityInfo && result.cityInfo.city) {
        var city = result.cityInfo.city.replace('市', '');
        that.setData({ locatedCity: city, currentCity: city });
        app.setCity(result.cityInfo);
        wx.showToast({ title: '已切换到 ' + city, icon: 'success', duration: 1500 });
        setTimeout(function () { wx.navigateBack(); }, 1500);
      } else {
        wx.showToast({ title: '定位失败，请手动搜索选择', icon: 'none', duration: 2000 });
      }
    }).catch(function () {
      that.setData({ locating: false });
      wx.showToast({ title: '请在设置中开启位置权限', icon: 'none', duration: 2000 });
    });
  },

  /* ═══ 手动选择城市 ═══ */
  onSelectCity(e) {
    var city = e.currentTarget.dataset.city;
    if (city === this.data.currentCity) {
      wx.navigateBack();
      return;
    }

    app.setCity({
      city: city,
      district: '',
      province: '',
      fullAddress: '',
    });

    wx.showToast({ title: '已切换到 ' + city, icon: 'success', duration: 1200 });
    setTimeout(function () {
      wx.navigateBack();
    }, 1200);
  },
});
