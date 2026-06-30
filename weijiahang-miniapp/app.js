// ============================================
// 为家航 — 微信小程序入口
// ============================================

// 环境切换：'dev' | 'prod'
var ENV = 'dev';

var DEV_API = 'http://127.0.0.1:3001/api/v1';
var PROD_API = 'https://api.weijiahang.com/api/v1';

App({
  globalData: {
    userInfo: null,
    token: null,
    currentMarket: null,
    cityInfo: null,           // { city, district, province, fullAddress }
    currentLocation: null,    // { latitude, longitude }
    selectedAddress: null,    // 结算页选中的临时地址
    env: ENV,
    apiBase: ENV === 'prod' ? PROD_API : DEV_API,
    tencentMapKey: 'PPFBZ-QQTEC-YIX2I-ACDX3-BEQPZ-PXFIR',
  },

  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.checkLoginStatus();
    }
  },

  /** 检查登录状态 */
  checkLoginStatus() {
    wx.request({
      url: `${this.globalData.apiBase}/health`,
      success: (res) => {
        console.log('为家航 API 连接成功', res.data);
      },
      fail: (err) => {
        console.error('为家航 API 连接失败', err);
      },
    });
  },

  /** 微信登录 */
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            wx.request({
              url: `${this.globalData.apiBase}/auth/wx-login`,
              method: 'POST',
              data: { code: res.code },
              success: (resp) => {
                const { accessToken, user } = resp.data.data;
                this.globalData.token = accessToken;
                this.globalData.userInfo = user;
                wx.setStorageSync('token', accessToken);
                wx.setStorageSync('userInfo', user);
                resolve(user);
              },
              fail: reject,
            });
          } else {
            reject(new Error('wx.login 失败'));
          }
        },
        fail: reject,
      });
    });
  },

  /**
   * 获取当前位置 + 逆地址解析出城市
   * @returns {Promise<{location, cityInfo}|null>}
   */
  getCurrentLocation() {
    var that = this;
    return new Promise(function (resolve) {
      wx.getLocation({
        type: 'gcj02',
        success: function (res) {
          that.globalData.currentLocation = res;
          // 用腾讯地图逆地址解析 → 拿到城市名
          that._reverseGeocode(res.latitude, res.longitude)
            .then(function (cityInfo) {
              that._setCityInfo(cityInfo);
              resolve({ location: res, cityInfo: cityInfo });
            })
            .catch(function () {
              // 逆解析失败，不阻塞流程
              resolve({ location: res, cityInfo: null });
            });
        },
        fail: function (err) {
          console.warn('获取位置失败', err);
          resolve(null);
        },
      });
    });
  },

  /**
   * 腾讯地图逆地址解析（WebService API，域名白名单模式）
   * @returns {Promise<{city, district, province, fullAddress}>}
   */
  _reverseGeocode(lat, lng) {
    var that = this;
    return new Promise(function (resolve, reject) {
      var key = that.globalData.tencentMapKey;
      if (!key || key === 'YOUR_TENCENT_MAP_KEY') {
        console.warn('⚠ 未配置腾讯地图Key，使用默认城市');
        reject(new Error('未配置腾讯地图Key'));
        return;
      }

      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          get_poi: 0,
          key: key,
          location: lat + ',' + lng,
        },
        success: function (res) {
          if (res.data && res.data.status === 0) {
            var comp = res.data.result.address_component;
            var city = (comp.city || '').replace('市', '');
            resolve({
              city: city,
              district: comp.district || '',
              province: comp.province || '',
              fullAddress: res.data.result.address || '',
            });
          } else {
            console.warn('逆地址解析失败', res.data);
            reject(new Error(res.data && res.data.message || '解析失败'));
          }
        },
        fail: reject,
      });
    });
  },

  /** 手动设置城市（用户在城市选择页选定） */
  setCity(cityInfo) {
    this._setCityInfo(cityInfo);
  },

  /** 内部：存储城市信息 */
  _setCityInfo(cityInfo) {
    this.globalData.cityInfo = cityInfo;
    try {
      wx.setStorageSync('cityInfo', cityInfo);
    } catch (e) {
      // ignore
    }
  },

  /**
   * 获取当前城市名称（优先 globalData，其次 storage，最后默认西安）
   */
  getCurrentCity() {
    if (this.globalData.cityInfo && this.globalData.cityInfo.city) {
      return this.globalData.cityInfo.city;
    }
    try {
      var stored = wx.getStorageSync('cityInfo');
      if (stored && stored.city) {
        this.globalData.cityInfo = stored;
        return stored.city;
      }
    } catch (e) {
      // ignore
    }
    return '西安'; // 默认城市
  },
});
