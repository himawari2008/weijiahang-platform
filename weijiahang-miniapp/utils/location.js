// ============================================
// 为家航 — 定位工具（GPS + 蓝牙信标）
// ============================================

/**
 * 获取用户当前位置（GPS）
 */
const getGPSLocation = () => {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => resolve(res),
      fail: () => resolve(null),
    });
  });
};

/**
 * 扫描附近的蓝牙信标
 * 用于室内定位三角解算
 */
const scanBeacons = () => {
  return new Promise((resolve) => {
    wx.startBeaconDiscovery({
      uuids: [],  // 侦测所有iBeacon
      success: () => {
        wx.onBeaconUpdate((res) => {
          // res.beacons = [{uuid, major, minor, rssi, accuracy, proximity}]
          resolve(res.beacons);
        });
      },
      fail: () => resolve([]),
    });
  });
};

/**
 * 根据信标RSSI估算距离（简化对数距离路径损耗模型）
 * @param {number} rssi - 信号强度(dBm)
 * @param {number} txPower - 1米处参考RSSI
 * @returns {number} 估算距离(米)
 */
const rssiToDistance = (rssi, txPower = -59) => {
  const ratio = (rssi * 1.0) / txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  } else {
    return 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
  }
};

/**
 * 三角定位解算用户位置
 * @param {Array} beacons - 扫到的信标 [{x, y, distance}]
 * @returns {{x: number, y: number, accuracy: number}} 估算坐标
 */
const trilateration = (beaconList) => {
  if (beaconList.length < 3) {
    // 少于3个信标，取最近信标位置
    const nearest = beaconList.sort((a, b) => a.distance - b.distance)[0];
    return nearest ? { x: nearest.x, y: nearest.y, accuracy: nearest.distance } : null;
  }

  // 加权质心算法（简化版）
  const beacons = beaconList.slice(0, 5); // 取信号最强的5个
  let weightSum = 0;
  let wx = 0, wy = 0;

  beacons.forEach((b) => {
    const weight = 1 / (b.distance * b.distance || 0.01);
    wx += b.x * weight;
    wy += b.y * weight;
    weightSum += weight;
  });

  return {
    x: wx / weightSum,
    y: wy / weightSum,
    accuracy: 1 / Math.sqrt(weightSum / beacons.length),
  };
};

module.exports = {
  getGPSLocation,
  scanBeacons,
  rssiToDistance,
  trilateration,
};
