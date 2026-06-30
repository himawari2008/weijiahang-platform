/**
 * 种子数据脚本 V3 — 多城市架构 + 西安20+真实建材市场
 * 运行: node scripts/seed-data-v3.js
 *
 * 与 V2 区别:
 *   - 写入 city_config 到 system_configs（城市可配置、可复制）
 *   - 20+ 西安真实建材市场，带坐标/楼层/面积
 *   - 后续扩城只需加城市配置 + 导入该城市场数据
 */
const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'weijiahang-dev.sqlite');
const db = new sqlite3.Database(dbPath);

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function run(sql, params) {
  return new Promise(function(resolve, reject) {
    db.run(sql, params, function(err) {
      if (err) reject(err); else resolve(this);
    });
  });
}

function all(sql, params) {
  return new Promise(function(resolve, reject) {
    db.all(sql, params, function(err, rows) {
      if (err) reject(err); else resolve(rows);
    });
  });
}

/** 将 JS 对象转为 SQLite simple-json 字符串 */
function json(v) {
  return JSON.stringify(v);
}

// ==================== 西安 20+ 真实建材市场 ====================
// 坐标均为近似值，生产环境需实地采集
const XIAN_MARKETS = [
  {
    name: '大明宫建材家居城（北郊店）', city: '西安', district: '未央区',
    address: '太华北路218号', longitude: 108.9605, latitude: 34.3301,
    areaSqm: 180000, floors: json([{ floor: -1, name: '地下停车场' }, { floor: 1, name: '陶瓷卫浴馆' }, { floor: 2, name: '家具软装馆' }, { floor: 3, name: '定制家居馆' }, { floor: 4, name: '办公区' }]),
  },
  {
    name: '北三环建材批发市场', city: '西安', district: '未央区',
    address: '北三环与明光路交汇处', longitude: 108.9637, latitude: 34.3632,
    areaSqm: 250000, floors: json([{ floor: 1, name: '批发交易区' }, { floor: 2, name: '仓储物流区' }]),
  },
  {
    name: '大明宫建材家居城（南郊店）', city: '西安', district: '雁塔区',
    address: '含光南路100号', longitude: 108.9382, latitude: 34.2213,
    areaSqm: 120000, floors: json([{ floor: 1, name: '精品瓷砖馆' }, { floor: 2, name: '卫浴橱柜馆' }, { floor: 3, name: '灯饰软装馆' }]),
  },
  {
    name: '红星美凯龙（太白路店）', city: '西安', district: '碑林区',
    address: '太白北路256号', longitude: 108.9204, latitude: 34.2485,
    areaSqm: 95000, floors: json([{ floor: 1, name: '进口品牌馆' }, { floor: 2, name: '国内名品馆' }, { floor: 3, name: '办公家具馆' }]),
  },
  {
    name: '居然之家（南二环店）', city: '西安', district: '碑林区',
    address: '南二环东段1号', longitude: 108.9491, latitude: 34.2378,
    areaSqm: 88000, floors: json([{ floor: -1, name: '五金辅材超市' }, { floor: 1, name: '瓷砖地板馆' }, { floor: 2, name: '全屋定制馆' }, { floor: 3, name: '实木家具馆' }]),
  },
  {
    name: '三森家居建材城', city: '西安', district: '长安区',
    address: '长安南路与西部大道交汇处', longitude: 108.9473, latitude: 34.1776,
    areaSqm: 72000, floors: json([{ floor: 1, name: '陶瓷卫浴区' }, { floor: 2, name: '橱柜电器区' }]),
  },
  {
    name: '华南城建材市场', city: '西安', district: '灞桥区',
    address: '港务大道8号', longitude: 109.0712, latitude: 34.3598,
    areaSqm: 300000, floors: json([{ floor: 1, name: '建材批发A区' }, { floor: 1, name: '建材批发B区' }, { floor: 1, name: '建材批发C区' }]),
  },
  {
    name: '西部建材城', city: '西安', district: '未央区',
    address: '朱宏路与凤城四路交汇处', longitude: 108.9374, latitude: 34.3426,
    areaSqm: 65000, floors: json([{ floor: 1, name: '板材木业区' }, { floor: 2, name: '五金机电区' }]),
  },
  {
    name: '原点新城建材市场', city: '西安', district: '泾阳县（近西安）',
    address: '泾河新城原点大道', longitude: 108.9258, latitude: 34.4583,
    areaSqm: 400000, floors: json([{ floor: 1, name: '综合建材区' }, { floor: 1, name: '石材加工区' }, { floor: 1, name: '仓储物流区' }]),
  },
  {
    name: '和记万佳建材广场', city: '西安', district: '雁塔区',
    address: '幸福南路与西影路交汇处', longitude: 109.0115, latitude: 34.2179,
    areaSqm: 55000, floors: json([{ floor: 1, name: '瓷砖卫浴馆' }, { floor: 2, name: '橱柜定制馆' }]),
  },
  {
    name: '百花建材市场', city: '西安', district: '未央区',
    address: '北三环与太华北路交汇处', longitude: 108.9748, latitude: 34.3192,
    areaSqm: 48000, floors: json([{ floor: 1, name: '门窗幕墙区' }, { floor: 2, name: '玻璃铝材区' }]),
  },
  {
    name: '庆安建材市场', city: '西安', district: '莲湖区',
    address: '大庆路128号', longitude: 108.8962, latitude: 34.2754,
    areaSqm: 35000, floors: json([{ floor: 1, name: '涂料管材区' }, { floor: 2, name: '电气照明区' }]),
  },
  {
    name: '明珠家居建材城', city: '西安', district: '未央区',
    address: '文景路与凤城五路交汇处', longitude: 108.9621, latitude: 34.3105,
    areaSqm: 42000, floors: json([{ floor: 1, name: '陶瓷卫浴区' }, { floor: 2, name: '家具软装区' }]),
  },
  {
    name: '东方美居建材城', city: '西安', district: '新城区',
    address: '长乐中路107号', longitude: 108.9863, latitude: 34.2782,
    areaSqm: 38000, floors: json([{ floor: 1, name: '瓷砖地板区' }, { floor: 2, name: '卫浴五金区' }]),
  },
  {
    name: '金海马建材市场', city: '西安', district: '灞桥区',
    address: '纺渭路88号', longitude: 109.0634, latitude: 34.2995,
    areaSqm: 30000, floors: json([{ floor: 1, name: '综合建材区' }, { floor: 2, name: '家具区' }]),
  },
  {
    name: '中储建材市场', city: '西安', district: '未央区',
    address: '东元路7号', longitude: 108.9508, latitude: 34.3072,
    areaSqm: 50000, floors: json([{ floor: 1, name: '钢材型材区' }, { floor: 2, name: '板材仓储区' }]),
  },
  {
    name: '西北建材城', city: '西安', district: '未央区',
    address: '凤城二路与明光路交汇处', longitude: 108.9432, latitude: 34.3368,
    areaSqm: 45000, floors: json([{ floor: 1, name: '瓷砖石材区' }, { floor: 2, name: '卫浴洁具区' }]),
  },
  {
    name: '玉祥门工业品市场', city: '西安', district: '莲湖区',
    address: '玉祥门外环城西路', longitude: 108.9163, latitude: 34.2738,
    areaSqm: 28000, floors: json([{ floor: 1, name: '五金工具区' }, { floor: 2, name: '标准件区' }]),
  },
  {
    name: '海纳汽配城（建材区）', city: '西安', district: '莲湖区',
    address: '枣园西路128号', longitude: 108.9105, latitude: 34.2781,
    areaSqm: 32000, floors: json([{ floor: 1, name: '基础建材区' }, { floor: 2, name: '装饰材料区' }]),
  },
  {
    name: '北三环大明宫石材城', city: '西安', district: '未央区',
    address: '北三环与太华路延伸线交汇处', longitude: 108.9901, latitude: 34.3675,
    areaSqm: 150000, floors: json([{ floor: 1, name: '大理石加工区' }, { floor: 1, name: '花岗岩加工区' }, { floor: 1, name: '人造石专区' }]),
  },
  {
    name: '百花建材批发基地', city: '西安', district: '未央区',
    address: '北辰大道与北三环交汇处', longitude: 109.0023, latitude: 34.3512,
    areaSqm: 60000, floors: json([{ floor: 1, name: '板材木业区' }, { floor: 2, name: '油漆涂料区' }]),
  },
  {
    name: '明珠家居（原明珠家具城）', city: '西安', district: '碑林区',
    address: '友谊东路389号', longitude: 108.9576, latitude: 34.2372,
    areaSqm: 35000, floors: json([{ floor: 1, name: '软体家具区' }, { floor: 2, name: '板式家具区' }, { floor: 3, name: '红木实木区' }]),
  },
];

// ==================== 城市配置 ====================
const CITY_CONFIG = {
  cities: [
    {
      name: '西安',
      status: 1,            // 1=已开通
      sortOrder: 1,
      province: '陕西',
      geoCenter: { lat: 34.299, lng: 108.947 },
    },
    {
      name: '成都',
      status: 0,            // 0=预置未开通
      sortOrder: 2,
      province: '四川',
      geoCenter: { lat: 30.573, lng: 104.067 },
    },
    {
      name: '重庆',
      status: 0,
      sortOrder: 3,
      province: '重庆',
      geoCenter: { lat: 29.547, lng: 106.548 },
    },
    {
      name: '郑州',
      status: 0,
      sortOrder: 4,
      province: '河南',
      geoCenter: { lat: 34.757, lng: 113.629 },
    },
    {
      name: '武汉',
      status: 0,
      sortOrder: 5,
      province: '湖北',
      geoCenter: { lat: 30.593, lng: 114.305 },
    },
  ],
  defaultCity: '西安',
};

// ==================== 主流程 ====================
async function seed() {
  console.log('📡 数据库已连接:', dbPath);
  console.log('');

  // ─── 第一步：写入 city_config ───
  console.log('🏙️  写入城市配置（city_config）...');
  await run(
    'INSERT OR REPLACE INTO system_configs (id, config_key, config_value, description) VALUES (?,?,?,?)',
    [uid(), 'city_config', json(CITY_CONFIG), '多城市配置：已开通/预置城市列表、默认城市、各城市geoCenter']
  );
  console.log('  ✅ city_config 已写入 (' + CITY_CONFIG.cities.length + ' 个城市，西安已开通，其余预置)');

  // ─── 第二步：清理旧市场数据 ───
  console.log('\n🧹 清理旧市场数据...');
  try { await run('DELETE FROM markets'); console.log('  cleared: markets'); } catch(e) {}

  // ─── 第三步：写入西安 20+ 市场 ───
  console.log('\n🏬 写入西安 ' + XIAN_MARKETS.length + ' 个真实建材市场...');
  var insertedCount = 0;
  for (var i = 0; i < XIAN_MARKETS.length; i++) {
    var m = XIAN_MARKETS[i];
    try {
      await run(
        'INSERT INTO markets (id, name, city, district, address, longitude, latitude, area_sqm, floors, status, shop_count, beacon_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [uid(), m.name, m.city, m.district, m.address, m.longitude, m.latitude, m.areaSqm, m.floors, 1, 0, 0]
      );
      insertedCount++;
    } catch(e) {
      console.log('  ⚠️ 跳过: ' + m.name + ' — ' + e.message);
    }
  }
  console.log('  ✅ ' + insertedCount + ' 个市场已写入');

  // ─── 验证 ───
  console.log('\n📊 验证结果:');
  var marketCount = await all('SELECT COUNT(*) as cnt FROM markets');
  console.log('  markets: ' + marketCount[0].cnt + ' rows');

  var configRow = await all("SELECT config_key, description FROM system_configs WHERE config_key = 'city_config'");
  if (configRow.length > 0) {
    console.log('  system_configs.city_config: ✅ 已写入');
    var parsed = JSON.parse(configRow[0].config_value || configRow[0].configValue || '{}');
    if (parsed.cities) {
      console.log('    城市列表: ' + parsed.cities.map(function(c) { return c.name + (c.status === 1 ? '✅' : '🔒'); }).join(', '));
      console.log('    默认城市: ' + parsed.defaultCity);
    }
  } else {
    console.log('  system_configs.city_config: ❌ 未找到');
  }

  // ─── 列出已写入的市场 ───
  var markets = await all('SELECT name, district, longitude, latitude FROM markets ORDER BY district, name');
  console.log('\n📋 已写入市场清单:');
  for (var mi = 0; mi < markets.length; mi++) {
    var mk = markets[mi];
    console.log('  ' + (mi + 1) + '. ' + mk.name + ' [' + mk.district + '] (' + mk.longitude + ', ' + mk.latitude + ')');
  }

  db.close();
  console.log('\n🎉 V3 种子数据创建完成！');
  console.log('   API: GET /markets/cities/list → 城市列表');
  console.log('   API: GET /markets?city=西安 → ' + insertedCount + ' 个市场');
}

seed().catch(function(err) {
  console.error('❌ 种子失败:', err.message);
  db.close();
  process.exit(1);
});
