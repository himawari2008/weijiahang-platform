/**
 * 种子数据脚本 — 使用 sqlite3 包直接写入
 * 运行: node scripts/seed-data-v2.js
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

// 把 callback 变成 promise
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

async function seed() {
  console.log('📡 数据库已连接:', dbPath);

  // 查看现有数据
  var tables = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables: ' + tables.length);

  // ─── 清理旧种子 ───
  console.log('\n🧹 清理旧数据...');
  var cleanTables = ['ads', 'marketing_activities', 'beacons', 'product_orders', 'customer_tiers', 'settlement_records', 'orders', 'coupons'];
  for (var i = 0; i < cleanTables.length; i++) {
    try { await run('DELETE FROM "' + cleanTables[i] + '"'); console.log('  cleared: ' + cleanTables[i]); } catch(e) {}
  }

  // ─── 市场 ───
  console.log('\n🏬 创建市场...');
  var marketIds = [uid(), uid(), uid(), uid()];
  var markets = [
    [marketIds[0], '大明宫建材市场', '西安', '未央区', '太华北路218号', 120000, 4, 1],
    [marketIds[1], '城南装饰城', '西安', '雁塔区', '含光南路100号', 85000, 3, 1],
    [marketIds[2], '东部家居广场', '西安', '灞桥区', '纺渭路88号', 65000, 2, 1],
    [marketIds[3], '城北建材港', '西安', '未央区', '北三环大明宫', 200000, 5, 1],
  ];
  for (var mi = 0; mi < markets.length; mi++) {
    try {
      await run('INSERT OR IGNORE INTO markets (id, name, city, district, address, area_sqm, floors, status) VALUES (?,?,?,?,?,?,?,?)', markets[mi]);
    } catch(e) { console.log('  skip market ' + mi + ': ' + e.message); }
  }
  console.log('  ✅ ' + markets.length + ' 个市场');

  // ─── 店铺 ───
  console.log('🏪 创建店铺...');
  var shopIds = [uid(), uid(), uid(), uid(), uid(), uid(), uid()];
  var shops = [
    [shopIds[0], '东鹏瓷砖旗舰店', marketIds[0], '张建国', '13800010001', '["瓷砖","卫浴"]', 1, 1, 4.8],
    [shopIds[1], '马可波罗瓷砖', marketIds[0], '李明华', '13800010002', '["瓷砖"]', 1, 1, 4.6],
    [shopIds[2], '欧派全屋定制', marketIds[1], '王芳', '13800010003', '["定制","橱柜"]', 1, 1, 4.9],
    [shopIds[3], '立邦涂料专卖', marketIds[2], '赵伟', '13800010004', '["涂料","辅材"]', 1, 1, 4.5],
    [shopIds[4], '九牧卫浴', marketIds[1], '孙小梅', '13800010005', '["卫浴"]', 0, 0, 0],
    [shopIds[5], '新中源陶瓷', marketIds[3], '陈刚', '13800010006', '["瓷砖"]', 0, 0, 0],
    [shopIds[6], '兔宝宝板材', marketIds[3], '刘建华', '13800010007', '["板材","定制"]', 1, 1, 4.3],
  ];
  for (var si = 0; si < shops.length; si++) {
    try {
      await run('INSERT OR IGNORE INTO shops (id, name, market_id, legal_person, phone, categories, status, is_verified, rating) VALUES (?,?,?,?,?,?,?,?,?)', shops[si]);
    } catch(e) { console.log('  skip shop ' + si + ': ' + e.message); }
  }
  console.log('  ✅ ' + shops.length + ' 个店铺 (2个待审核)');

  // ─── 领航员 ───
  console.log('🧭 创建领航员...');
  var navIds = [uid(), uid(), uid(), uid(), uid()];
  var navs = [
    [navIds[0], '王大伟', '13900010001', marketIds[0], '["瓷砖选购","验货"]', 1, 1, 4.9, 326, 12500, 89500],
    [navIds[1], '李志强', '13900010002', marketIds[1], '["涂料咨询","颜色搭配"]', 1, 1, 4.7, 218, 8600, 62300],
    [navIds[2], '张晓燕', '13900010003', marketIds[0], '["卫浴安装","水路验收"]', 1, 1, 4.8, 195, 7200, 54800],
    [navIds[3], '赵明辉', '13900010004', marketIds[2], '["板材识别","定制测量"]', 0, 0, 0, 0, 0, 0],
    [navIds[4], '陈小华', '13900010005', marketIds[3], '["辅材配送"]', 0, 0, 0, 0, 0, 0],
  ];
  for (var ni = 0; ni < navs.length; ni++) {
    try {
      await run('INSERT OR IGNORE INTO navigators (id, real_name, phone, home_market_ids, skills, status, background_check, rating, total_orders, balance, total_earned) VALUES (?,?,?,?,?,?,?,?,?,?,?)', navs[ni]);
    } catch(e) { console.log('  skip nav ' + ni + ': ' + e.message); }
  }
  console.log('  ✅ ' + navs.length + ' 个领航员 (2个待审核)');

  // ─── 用户 ───
  console.log('👤 创建用户...');
  var userIds = [uid(), uid(), uid(), uid()];
  var users = [
    [userIds[0], '装修达人小王', '13600010001', '西安', 'retail', 5, 12500, 1],
    [userIds[1], '工长老刘', '13600010002', '西安', 'contractor', 85, 450000, 1],
    [userIds[2], '装企张总', '13600010003', '西安', 'decoration_company', 25, 820000, 1],
    [userIds[3], '批发商李老板', '13600010004', '西安', 'wholesale', 520, 6800000, 1],
  ];
  for (var ui = 0; ui < users.length; ui++) {
    try {
      await run('INSERT OR IGNORE INTO users (id, nickname, phone, city, customer_type, total_orders, total_spent, status) VALUES (?,?,?,?,?,?,?,?)', users[ui]);
    } catch(e) { console.log('  skip user ' + ui + ': ' + e.message); }
  }
  console.log('  ✅ ' + users.length + ' 个用户');

  // ─── 信标 ───
  console.log('📡 创建信标...');
  for (var bi = 0; bi < 15; bi++) {
    var mid = marketIds[bi % 4];
    var beaconUid = 'BLE-' + String(bi+1).padStart(3,'0') + '-' + Math.random().toString(36).substring(2,6).toUpperCase();
    try {
      await run('INSERT OR IGNORE INTO beacons (id, market_id, beacon_uid, floor, x_px, y_px, tx_power, battery_level, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [uid(), mid, beaconUid, (bi % 3) + 1, Math.round(Math.random() * 800), Math.round(Math.random() * 600), -59, Math.floor(Math.random() * 40) + 60, bi < 12 ? 1 : 0]);
    } catch(e) { console.log('  skip beacon ' + bi + ': ' + e.message); }
  }
  console.log('  ✅ 15 个信标');

  // ─── 广告 ───
  console.log('📢 创建广告...');
  var ads = [
    [uid(), shopIds[0], 'cpc', 'home_banner', 5000, 500, 2.5, '2026-06-01', '2026-07-31', 12500, 320, 800, 1],
    [uid(), shopIds[1], 'cpm', 'shop_list_top', 3000, 300, 1.5, '2026-06-15', '2026-07-15', 8500, 180, 450, 1],
    [uid(), shopIds[2], 'cpc', 'category_sidebar', 2000, 200, 3.0, '2026-06-20', '2026-08-20', 3200, 95, 285, 1],
    [uid(), shopIds[3], 'cpc', 'home_banner', 8000, 800, 2.0, '2026-06-10', '2026-07-10', 28000, 720, 1440, 1],
    [uid(), shopIds[0], 'cpm', 'search_result', 1500, 150, 1.0, '2026-05-01', '2026-05-31', 6200, 45, 1350, 0],
  ];
  for (var ai = 0; ai < ads.length; ai++) {
    try {
      await run('INSERT OR IGNORE INTO ads (id, shop_id, ad_type, ad_position, budget, daily_budget, cpc_bid, start_date, end_date, impressions, clicks, spent, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', ads[ai]);
    } catch(e) { console.log('  skip ad ' + ai + ': ' + e.message); }
  }
  console.log('  ✅ ' + ads.length + ' 个广告');

  // ─── 营销活动 ───
  console.log('🎯 创建营销活动...');
  var activities = [
    [uid(), null, 'flash_sale', '618建材年中大促', '{"discountDesc":"全场陶瓷8折起"}', '2026-06-15', '2026-06-25', 50000, 1000, 628, 1],
    [uid(), shopIds[0], 'coupon_pack', '东鹏新店开业礼包', '{"discountDesc":"满1000减200"}', '2026-06-01', '2026-07-01', 10000, 500, 186, 1],
    [uid(), shopIds[2], 'referral', '老带新享双倍积分', '{"discountDesc":"推荐返现100元"}', '2026-06-01', '2026-09-01', 8000, 200, 42, 1],
    [uid(), shopIds[1], 'clearance', '瓷砖清仓甩卖', '{"discountDesc":"特价款5折起"}', '2026-05-20', '2026-06-10', 3000, 300, 300, 0],
  ];
  for (var aci = 0; aci < activities.length; aci++) {
    try {
      await run('INSERT OR IGNORE INTO marketing_activities (id, shop_id, activity_type, name, rule, start_date, end_date, budget, max_count, used_count, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)', activities[aci]);
    } catch(e) { console.log('  skip activity ' + aci + ': ' + e.message); }
  }
  console.log('  ✅ ' + activities.length + ' 个营销活动');

  // ─── 优惠券 ───
  console.log('🎫 创建优惠券...');
  var coupons = [
    [uid(), '新人专享券', 'new_user', 50, 200, 'amount', null, 1, 328, 1000, 1, '2026-06-01', '2026-12-31'],
    [uid(), '618建材大促', 'full_reduction', 200, 1000, 'amount', null, 1, 1205, 5000, 3, '2026-06-15', '2026-06-25'],
    [uid(), '瓷砖品类9折', 'category', 10, 0, 'percentage', 200, 1, 86, 0, 2, '2026-06-01', '2026-08-31'],
    [uid(), '现金红包', 'cash', 30, 100, 'amount', null, 1, 520, 2000, 1, '2026-06-01', '2026-07-31'],
    [uid(), '包邮券', 'shipping_free', 0, 500, 'amount', null, 0, 150, 500, 3, '2026-05-01', '2026-06-01'],
  ];
  for (var ci = 0; ci < coupons.length; ci++) {
    try {
      await run('INSERT OR IGNORE INTO coupons (id, name, type, value, min_amount, discount_type, max_discount, status, used_count, total_count, per_user_limit, valid_from, valid_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', coupons[ci]);
    } catch(e) { console.log('  skip coupon ' + ci + ': ' + e.message); }
  }
  console.log('  ✅ ' + coupons.length + ' 个优惠券');

  // ─── 采购订单 ───
  console.log('📦 创建采购订单...');
  var porders = [
    [uid(), 'WJHPD20260621001', userIds[0], 'retail', 1, 'paid', 4298, 0, 4348, 'navigator_deliver', 50, 1, null, 'miniapp'],
    [uid(), 'WJHPD20260620002', userIds[1], 'contractor', 4, 'shipped', 12800, 640, 12160, 'self_pickup', 0, 1, null, 'miniapp'],
    [uid(), 'WJHPD20260619003', userIds[3], 'wholesale', 5, 'refunding', 85000, 10200, 74800, 'logistics', 0, 1, '部分货物破损', 'miniapp'],
    [uid(), 'WJHPD20260618004', userIds[0], 'retail', 1, 'cancelled', 899, 0, 899, 'self_pickup', 0, 0, '用户取消', 'miniapp'],
    [uid(), 'WJHPD20260622005', userIds[2], 'decoration_company', 3, 'completed', 35000, 1750, 33250, 'logistics', 0, 1, null, 'miniapp'],
  ];
  for (var oi = 0; oi < porders.length; oi++) {
    try {
      await run('INSERT OR IGNORE INTO product_orders (id, order_no, user_id, customer_type, tier_level, status, items_total, tier_discount, final_amount, delivery_method, delivery_fee, pay_status, refund_reason, source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', porders[oi]);
    } catch(e) { console.log('  skip porder ' + oi + ': ' + e.message); }
  }
  console.log('  ✅ ' + porders.length + ' 个采购订单');

  // ─── 客户分层 ───
  console.log('🏅 创建客户分层...');
  var tiers = [
    [uid(), userIds[1], 'contractor', 4, '铂金', 85, 450000, 85, 0.08, null, 80, 75, 90],
    [uid(), userIds[2], 'decoration_company', 3, '黄金', 45, 380000, 15, 0.05, 500000, 50, 60, 70],
    [uid(), userIds[3], 'wholesale', 5, '钻石', 520, 6800000, 520, 0.12, null, 100, 100, 100],
  ];
  for (var ti = 0; ti < tiers.length; ti++) {
    try {
      await run('INSERT OR IGNORE INTO customer_tiers (id, user_id, customer_type, current_level, current_tier_name, total_score, total_amount, order_count, tier_discount_rate, monthly_credit_limit, orders_progress, amount_progress, months_progress) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', tiers[ti]);
    } catch(e) { console.log('  skip tier ' + ti + ': ' + e.message); }
  }
  console.log('  ✅ ' + tiers.length + ' 个客户分层');

  // ─── 服务订单 ───
  console.log('🛒 创建服务订单...');
  var sorders = [
    [uid(), 'WJH20260620001', userIds[0], shopIds[0], navIds[0], 'navigation', 39, 7.8, 31.2, 'completed'],
    [uid(), 'WJH20260621002', userIds[0], shopIds[1], navIds[1], 'accompany', 150, 30, 120, 'completed'],
    [uid(), 'WJH20260622003', userIds[1], shopIds[2], null, 'inspection', 25, 5, 20, 'pending'],
    [uid(), 'WJH20260623004', userIds[0], shopIds[3], navIds[2], 'navigation', 39, 7.8, 31.2, 'abnormal'],
  ];
  for (var soi = 0; soi < sorders.length; soi++) {
    try {
      await run('INSERT OR IGNORE INTO orders (id, order_no, user_id, shop_id, navigator_id, service_type, amount, platform_fee, navigator_income, status) VALUES (?,?,?,?,?,?,?,?,?,?)', sorders[soi]);
    } catch(e) { console.log('  skip sorder ' + soi + ': ' + e.message); }
  }
  console.log('  ✅ ' + sorders.length + ' 个服务订单 (1个纠纷)');

  // ─── 结算记录 ───
  console.log('💰 创建结算记录...');
  var settles = [
    [uid(), navIds[0], sorders[0][0], 39, 7.8, 31.2, 0, 'credited'],
    [uid(), navIds[1], sorders[1][0], 150, 30, 120, 0, 'credited'],
  ];
  for (var sei = 0; sei < settles.length; sei++) {
    try {
      await run('INSERT OR IGNORE INTO settlement_records (id, navigator_id, order_id, amount, platform_commission, navigator_income, tier_discount, status) VALUES (?,?,?,?,?,?,?,?)', settles[sei]);
    } catch(e) { console.log('  skip settle ' + sei + ': ' + e.message); }
  }
  console.log('  ✅ ' + settles.length + ' 条结算记录');

  // ─── 系统配置 ───
  console.log('⚙️ 创建系统配置...');
  var configs = [
    ['platformName', '为家航'],
    ['minNavigatorIncome', '39'],
    ['maxNavigatorDistance', '5'],
    ['commissionRate', '20'],
    ['enableRegistration', 'true'],
    ['enableAutoDispatch', 'true'],
    ['maintenanceMode', 'false'],
    ['autoCancelMinutes', '30'],
    ['fatigueHours', '4'],
    ['restRewardAmount', '5'],
    ['maxDailyOrders', '20'],
  ];
  for (var cfi = 0; cfi < configs.length; cfi++) {
    try {
      await run('INSERT OR REPLACE INTO system_configs (config_key, config_value) VALUES (?,?)', configs[cfi]);
    } catch(e) { console.log('  skip config ' + cfi + ': ' + e.message); }
  }
  console.log('  ✅ ' + configs.length + ' 个系统配置项');

  // ─── 验证结果 ───
  console.log('\n📊 验证结果:');
  var checkTables = ['markets', 'shops', 'navigators', 'users', 'beacons', 'ads', 'marketing_activities', 'coupons', 'product_orders', 'customer_tiers', 'orders', 'settlement_records', 'system_configs'];
  for (var cti = 0; cti < checkTables.length; cti++) {
    try {
      var row = await all('SELECT COUNT(*) as cnt FROM "' + checkTables[cti] + '"');
      console.log('  ' + checkTables[cti] + ': ' + row[0].cnt + ' rows');
    } catch(e) {}
  }

  db.close();
  console.log('\n🎉 种子数据创建完成！刷新浏览器查看效果。');
}

seed().catch(function(err) {
  console.error('❌ 种子失败:', err.message);
  db.close();
  process.exit(1);
});
