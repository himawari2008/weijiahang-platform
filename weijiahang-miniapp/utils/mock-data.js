/**
 * 为家航 · 公共 Mock 数据库
 * 所有页面共享的市场、店铺数据
 * 上线后替换为真实 API 调用
 */

/* ═══ 市场数据（含真实经纬度坐标） ═══ */
var MARKET_DB = {
  1: { id: 1, city: '西安', name: '大明宫建材市场', lat: 34.3045, lng: 108.9523,
       floors: [1, 2, 3], storeCount: 328, cateCount: 12, bgColor: '#EBF5FF',
       building: 'A区', distance: 3200 },
  2: { id: 2, city: '西安', name: '北三环建材批发市场', lat: 34.3420, lng: 108.9850,
       floors: [1, 2, 3], storeCount: 510, cateCount: 18, bgColor: '#FFF5EB',
       building: 'B区', distance: 5800 },
  3: { id: 3, city: '西安', name: '玉祥门工业品市场', lat: 34.2695, lng: 108.9120,
       floors: [1, 2], storeCount: 186, cateCount: 8, bgColor: '#FFF0EB',
       building: 'C区', distance: 6500 },
  4: { id: 4, city: '西安', name: '海纳汽配城', lat: 34.2850, lng: 108.9400,
       floors: [1, 2], storeCount: 120, cateCount: 6, bgColor: '#EBFFF5',
       building: 'D区', distance: 7100 },
  5: { id: 5, city: '成都', name: '富森美家居城北店', lat: 30.7120, lng: 104.0920,
       floors: [1, 2, 3, 4], storeCount: 620, cateCount: 15, bgColor: '#E8F5F0',
       building: 'A区', distance: 4500 },
  6: { id: 6, city: '成都', name: '金牛区西部建材市场', lat: 30.6950, lng: 104.0520,
       floors: [1, 2, 3], storeCount: 280, cateCount: 10, bgColor: '#FFF5EB',
       building: 'B区', distance: 6200 },
  7: { id: 7, city: '郑州', name: '凤凰城建材市场', lat: 34.7560, lng: 113.6820,
       floors: [1, 2, 3], storeCount: 450, cateCount: 13, bgColor: '#EBF5FF',
       building: 'A区', distance: 5000 },
};

/* ═══ 店铺数据（按市场ID索引，含楼层分配） ═══ */
var SHOP_DB = {
  1: [
    { id: 's1', name: '老李瓷砖批发', addr: 'A区3排15号', floor: 1, rating: 4.8, tags: ['品牌授权', '七年老店'], bgColor: '#EBF5FF' },
    { id: 's2', name: '鑫源建材商行', addr: 'A区1排8号', floor: 1, rating: 4.6, tags: ['性价比高'], bgColor: '#FFF5EB' },
    { id: 's3', name: '恒达瓷砖旗舰店', addr: 'A区2排22号', floor: 1, rating: 4.9, tags: ['旗舰店', '十年老店'], bgColor: '#EBF5FF' },
    { id: 's5', name: '大自然地板', addr: 'A区5排6号', floor: 1, rating: 4.8, tags: ['品牌授权'], bgColor: '#FFF5EB' },
    { id: 's9', name: '九牧卫浴大明宫店', addr: 'A区4排2号', floor: 2, rating: 4.7, tags: ['品牌专卖'], bgColor: '#FFF0EB' },
    { id: 's10', name: '立邦漆大明宫旗舰店', addr: 'A区3排8号', floor: 2, rating: 4.9, tags: ['旗舰店'], bgColor: '#EBFFF5' },
    { id: 's11', name: '欧派橱柜定制', addr: 'A区6排1号', floor: 3, rating: 4.8, tags: ['定制', '品牌授权'], bgColor: '#FFF8F0' },
    { id: 's12', name: '索菲亚衣柜定制', addr: 'A区6排5号', floor: 3, rating: 4.7, tags: ['定制'], bgColor: '#F0F5FF' },
  ],
  2: [
    { id: 's6', name: '立邦官方授权店', addr: 'B区1排3号', floor: 1, rating: 4.9, tags: ['官方授权'], bgColor: '#EBFFF5' },
    { id: 's7', name: '冠珠瓷砖批发', addr: 'B区2排10号', floor: 1, rating: 4.7, tags: ['批发'], bgColor: '#FFF5EB' },
    { id: 's13', name: '东鹏瓷砖北三环店', addr: 'B区3排6号', floor: 1, rating: 4.6, tags: ['品牌授权'], bgColor: '#EBF5FF' },
    { id: 's14', name: 'TOTO卫浴旗舰店', addr: 'B区5排1号', floor: 2, rating: 4.8, tags: ['旗舰店', '进口'], bgColor: '#FFF0EB' },
    { id: 's15', name: '箭牌卫浴批发', addr: 'B区4排12号', floor: 2, rating: 4.5, tags: ['批发'], bgColor: '#FFF5EB' },
    { id: 's16', name: '圣象地板北三环店', addr: 'B区6排3号', floor: 3, rating: 4.7, tags: ['品牌专卖'], bgColor: '#F0FFF0' },
  ],
  3: [
    { id: 's4', name: '九牧卫浴专卖', addr: 'C区1排12号', floor: 1, rating: 4.7, tags: ['品牌专卖'], bgColor: '#FFF0EB' },
    { id: 's17', name: '科勒卫浴玉祥门店', addr: 'C区2排3号', floor: 1, rating: 4.6, tags: ['进口'], bgColor: '#FFF5EB' },
    { id: 's18', name: '马可波罗仿古砖', addr: 'C区3排8号', floor: 2, rating: 4.8, tags: ['品牌授权'], bgColor: '#EBF5FF' },
  ],
  4: [
    { id: 's8', name: '汽配城五金店', addr: 'D区1排5号', floor: 1, rating: 4.5, tags: ['五金'], bgColor: '#FFF5EB' },
    { id: 's19', name: '博世汽配专营', addr: 'D区2排1号', floor: 1, rating: 4.7, tags: ['品牌专卖', '进口'], bgColor: '#EBF5FF' },
    { id: 's20', name: '米其林轮胎', addr: 'D区3排6号', floor: 2, rating: 4.6, tags: ['品牌授权'], bgColor: '#FFF8F0' },
  ],
  5: [
    { id: 's21', name: '蒙娜丽莎成都总代', addr: 'A区1排1号', floor: 1, rating: 4.9, tags: ['总代理'], bgColor: '#FFF5EB' },
    { id: 's22', name: '圣象地板旗舰店', addr: 'A区2排8号', floor: 1, rating: 4.7, tags: ['旗舰店'], bgColor: '#F0FFF0' },
    { id: 's23', name: '大自然地板成都店', addr: 'A区3排5号', floor: 1, rating: 4.8, tags: ['品牌授权'], bgColor: '#FFF8F0' },
    { id: 's24', name: '九牧卫浴成都旗舰店', addr: 'A区4排2号', floor: 2, rating: 4.8, tags: ['旗舰店'], bgColor: '#FFF0EB' },
    { id: 's25', name: '欧派橱柜成都店', addr: 'A区5排1号', floor: 3, rating: 4.6, tags: ['定制'], bgColor: '#EBF5FF' },
    { id: 's26', name: '老板电器专卖', addr: 'A区6排3号', floor: 4, rating: 4.9, tags: ['品牌专卖'], bgColor: '#FFF5EB' },
  ],
  6: [
    { id: 's27', name: '西部石材批发', addr: 'B区3排5号', floor: 1, rating: 4.6, tags: ['批发'], bgColor: '#FFF5EB' },
    { id: 's28', name: '诺贝尔瓷砖金牛店', addr: 'B区1排8号', floor: 1, rating: 4.7, tags: ['品牌授权'], bgColor: '#EBF5FF' },
    { id: 's29', name: '立邦漆西部总代', addr: 'B区2排2号', floor: 2, rating: 4.8, tags: ['总代理'], bgColor: '#EBFFF5' },
  ],
  7: [
    { id: 's30', name: '诺贝尔瓷砖郑州店', addr: 'A区1排10号', floor: 1, rating: 4.8, tags: ['品牌授权'], bgColor: '#EBF5FF' },
    { id: 's31', name: '东鹏瓷砖郑州旗舰', addr: 'A区2排5号', floor: 1, rating: 4.7, tags: ['旗舰店'], bgColor: '#FFF5EB' },
    { id: 's32', name: '九牧卫浴郑州店', addr: 'A区3排2号', floor: 2, rating: 4.6, tags: ['品牌专卖'], bgColor: '#FFF0EB' },
    { id: 's33', name: '大自然地板郑州店', addr: 'A区4排8号', floor: 3, rating: 4.8, tags: ['品牌授权'], bgColor: '#F0FFF0' },
  ],
};

module.exports = {
  MARKET_DB: MARKET_DB,
  SHOP_DB: SHOP_DB,
};
