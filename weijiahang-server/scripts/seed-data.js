/**
 * 种子数据脚本 — 使用 better-sqlite3 直接写入
 * 运行: node scripts/seed-data.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'weijiahang_dev.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('📡 数据库已连接:', dbPath);

// 检查现有数据
const counts = {};
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get();
    counts[t.name] = row.cnt;
  } catch (e) {
    counts[t.name] = '?';
  }
}
console.log('现有数据:', JSON.stringify(counts, null, 2));

// ─── 清空旧种子数据 ───
console.log('\n🧹 清理旧数据...');
const cleanTables = ['ads', 'marketing_activities', 'beacons', 'product_orders', 'customer_tiers', 'settlement_records', 'orders', 'coupons'];
for (const t of cleanTables) {
  try { db.prepare(`DELETE FROM "${t}"`).run(); console.log(`  cleared: ${t}`); } catch {}
}

// ─── 生成 UUID ───
function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── 市场 ───
console.log('\n🏬 创建市场...');
const markets = [
  [uid(), '大明宫建材市场', '西安', '未央区', '太华北路218号', 120000, 4, 1],
  [uid(), '城南装饰城', '西安', '雁塔区', '含光南路100号', 85000, 3, 1],
  [uid(), '东部家居广场', '西安', '灞桥区', '纺渭路88号', 65000, 2, 1],
  [uid(), '城北建材港', '西安', '未央区', '北三环大明宫', 200000, 5, 1],
];
const insertMarket = db.prepare('INSERT OR IGNORE INTO markets (id, name, city, district, address, area_sqm, floors, status) VALUES (?,?,?,?,?,?,?,?)');
for (const m of markets) { insertMarket.run(...m); }
console.log(`  ✅ ${markets.length} 个市场`);

// ─── 店铺 ───
console.log('🏪 创建店铺...');
const shops = [
  [uid(), '东鹏瓷砖旗舰店', markets[0][0], '张建国', '13800010001', '["瓷砖","卫浴"]', 1, 1, 4.8],
  [uid(), '马可波罗瓷砖', markets[0][0], '李明华', '13800010002', '["瓷砖"]', 1, 1, 4.6],
  [uid(), '欧派全屋定制', markets[1][0], '王芳', '13800010003', '["定制","橱柜"]', 1, 1, 4.9],
  [uid(), '立邦涂料专卖', markets[2][0], '赵伟', '13800010004', '["涂料","辅材"]', 1, 1, 4.5],
  [uid(), '九牧卫浴', markets[1][0], '孙小梅', '13800010005', '["卫浴"]', 0, 0, 0],
  [uid(), '新中源陶瓷', markets[3][0], '陈刚', '13800010006', '["瓷砖"]', 0, 0, 0],
  [uid(), '兔宝宝板材', markets[3][0], '刘建华', '13800010007', '["板材","定制"]', 1, 1, 4.3],
];
const insertShop = db.prepare('INSERT OR IGNORE INTO shops (id, name, market_id, legal_person, phone, categories, status, is_verified, rating) VALUES (?,?,?,?,?,?,?,?,?)');
for (const s of shops) { insertShop.run(...s); }
console.log(`  ✅ ${shops.length} 个店铺 (2个待审核)`);

// ─── 领航员 ───
console.log('🧭 创建领航员...');
const navs = [
  [uid(), '王大伟', '13900010001', markets[0][0], '["瓷砖选购","验货"]', 1, 1, 4.9, 326, 12500, 89500],
  [uid(), '李志强', '13900010002', markets[1][0], '["涂料咨询","颜色搭配"]', 1, 1, 4.7, 218, 8600, 62300],
  [uid(), '张晓燕', '13900010003', markets[0][0], '["卫浴安装","水路验收"]', 1, 1, 4.8, 195, 7200, 54800],
  [uid(), '赵明辉', '13900010004', markets[2][0], '["板材识别","定制测量"]', 0, 0, 0, 0, 0, 0],
  [uid(), '陈小华', '13900010005', markets[3][0], '["辅材配送"]', 0, 0, 0, 0, 0, 0],
];
const insertNav = db.prepare('INSERT OR IGNORE INTO navigators (id, real_name, phone, home_market_ids, skills, status, background_check, rating, total_orders, balance, total_earned) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
for (const n of navs) { insertNav.run(...n); }
console.log(`  ✅ ${navs.length} 个领航员 (2个待审核)`);

// ─── 用户 ───
console.log('👤 创建用户...');
const users = [
  [uid(), '装修达人小王', '13600010001', '西安', 'retail', 5, 12500, 1],
  [uid(), '工长老刘', '13600010002', '西安', 'contractor', 85, 450000, 1],
  [uid(), '装企张总', '13600010003', '西安', 'decoration_company', 25, 820000, 1],
  [uid(), '批发商李老板', '13600010004', '西安', 'wholesale', 520, 6800000, 1],
];
const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, nickname, phone, city, customer_type, total_orders, total_spent, status) VALUES (?,?,?,?,?,?,?,?)');
for (const u of users) { insertUser.run(...u); }
console.log(`  ✅ ${users.length} 个用户`);

// ─── 信标 ───
console.log('📡 创建信标...');
const insertBeacon = db.prepare('INSERT OR IGNORE INTO beacons (id, market_id, beacon_uid, floor, x_px, y_px, tx_power, battery_level, status) VALUES (?,?,?,?,?,?,?,?,?)');
for (let i = 0; i < 15; i++) {
  const mid = markets[i % 4][0];
  insertBeacon.run(uid(), mid, `BLE-${String(i+1).padStart(3,'0')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`, (i % 3) + 1, Math.round(Math.random() * 800), Math.round(Math.random() * 600), -59, Math.floor(Math.random() * 40) + 60, i < 12 ? 1 : 0);
}
console.log(`  ✅ 15 个信标`);

// ─── 广告 ───
console.log('📢 创建广告...');
const ads = [
  [uid(), shops[0][0], 'cpc', 'home_banner', 5000, 500, 2.5, '2026-06-01', '2026-07-31', 12500, 320, 800, 1],
  [uid(), shops[1][0], 'cpm', 'shop_list_top', 3000, 300, 1.5, '2026-06-15', '2026-07-15', 8500, 180, 450, 1],
  [uid(), shops[2][0], 'cpc', 'category_sidebar', 2000, 200, 3.0, '2026-06-20', '2026-08-20', 3200, 95, 285, 1],
  [uid(), shops[3][0], 'cpc', 'home_banner', 8000, 800, 2.0, '2026-06-10', '2026-07-10', 28000, 720, 1440, 1],
  [uid(), shops[0][0], 'cpm', 'search_result', 1500, 150, 1.0, '2026-05-01', '2026-05-31', 6200, 45, 1350, 0],
];
const insertAd = db.prepare('INSERT OR IGNORE INTO ads (id, shop_id, ad_type, ad_position, budget, daily_budget, cpc_bid, start_date, end_date, impressions, clicks, spent, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
for (const a of ads) { insertAd.run(...a); }
console.log(`  ✅ ${ads.length} 个广告`);

// ─── 营销活动 ───
console.log('🎯 创建营销活动...');
const activities = [
  [uid(), 'platform', 'flash_sale', '618建材年中大促', '{"discountDesc":"全场陶瓷8折起"}', '2026-06-15', '2026-06-25', 50000, 1000, 628, 1],
  [uid(), shops[0][0], 'coupon_pack', '东鹏新店开业礼包', '{"discountDesc":"满1000减200"}', '2026-06-01', '2026-07-01', 10000, 500, 186, 1],
  [uid(), shops[2][0], 'referral', '老带新享双倍积分', '{"discountDesc":"推荐返现100元"}', '2026-06-01', '2026-09-01', 8000, 200, 42, 1],
  [uid(), shops[1][0], 'clearance', '瓷砖清仓甩卖', '{"discountDesc":"特价款5折起"}', '2026-05-20', '2026-06-10', 3000, 300, 300, 0],
];
const insertAct = db.prepare('INSERT OR IGNORE INTO marketing_activities (id, shop_id, activity_type, name, rule, start_date, end_date, budget, max_count, used_count, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
for (const a of activities) { insertAct.run(...a); }
console.log(`  ✅ ${activities.length} 个营销活动`);

// ─── 优惠券 ───
console.log('🎫 创建优惠券...');
const coupons = [
  [uid(), '新人专享券', 'new_user', 50, 200, 'amount', null, 1, 328, 1000, 1, '2026-06-01', '2026-12-31'],
  [uid(), '618建材大促', 'full_reduction', 200, 1000, 'amount', null, 1, 1205, 5000, 3, '2026-06-15', '2026-06-25'],
  [uid(), '瓷砖品类9折', 'category', 10, 0, 'percentage', 200, 1, 86, 0, 2, '2026-06-01', '2026-08-31'],
  [uid(), '现金红包', 'cash', 30, 100, 'amount', null, 1, 520, 2000, 1, '2026-06-01', '2026-07-31'],
  [uid(), '包邮券', 'shipping_free', 0, 500, 'amount', null, 0, 150, 500, 3, '2026-05-01', '2026-06-01'],
];
const insertCoupon = db.prepare('INSERT OR IGNORE INTO coupons (id, name, type, value, min_amount, discount_type, max_discount, status, used_count, total_count, per_user_limit, valid_from, valid_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
for (const c of coupons) { insertCoupon.run(...c); }
console.log(`  ✅ ${coupons.length} 个优惠券`);

// ─── 采购订单 ───
console.log('📦 创建采购订单...');
const porders = [
  [uid(), 'WJHPD20260621001', users[0][0], 'retail', 1, 'paid', 4298, 0, 4348, 'navigator_deliver', 50, 1, null, 'miniapp'],
  [uid(), 'WJHPD20260620002', users[1][0], 'contractor', 4, 'shipped', 12800, 640, 12160, 'self_pickup', 0, 1, null, 'miniapp'],
  [uid(), 'WJHPD20260619003', users[3][0], 'wholesale', 5, 'refunding', 85000, 10200, 74800, 'logistics', 0, 1, '部分货物破损', 'miniapp'],
  [uid(), 'WJHPD20260618004', users[0][0], 'retail', 1, 'cancelled', 899, 0, 899, 'self_pickup', 0, 0, '用户取消', 'miniapp'],
  [uid(), 'WJHPD20260622005', users[2][0], 'decoration_company', 3, 'completed', 35000, 1750, 33250, 'logistics', 0, 1, null, 'miniapp'],
];
const insertPOrder = db.prepare('INSERT OR IGNORE INTO product_orders (id, order_no, user_id, customer_type, tier_level, status, items_total, tier_discount, final_amount, delivery_method, delivery_fee, pay_status, refund_reason, source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
for (const o of porders) { insertPOrder.run(...o); }
console.log(`  ✅ ${porders.length} 个采购订单`);

// ─── 客户分层 ───
console.log('🏅 创建客户分层...');
const tiers = [
  [uid(), users[1][0], 'contractor', 4, '铂金', 85, 450000, 85, 0.08, null, 80, 75, 90],
  [uid(), users[2][0], 'decoration_company', 3, '黄金', 45, 380000, 15, 0.05, 500000, 50, 60, 70],
  [uid(), users[3][0], 'wholesale', 5, '钻石', 520, 6800000, 520, 0.12, null, 100, 100, 100],
];
const insertTier = db.prepare('INSERT OR IGNORE INTO customer_tiers (id, user_id, customer_type, current_level, current_tier_name, total_score, total_amount, order_count, tier_discount_rate, monthly_credit_limit, orders_progress, amount_progress, months_progress) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
for (const t of tiers) { insertTier.run(...t); }
console.log(`  ✅ ${tiers.length} 个客户分层`);

// ─── 服务订单 ───
console.log('🛒 创建服务订单...');
const sorders = [
  [uid(), 'WJH20260620001', users[0][0], shops[0][0], navs[0][0], 'navigation', 39, 7.8, 31.2, 'completed'],
  [uid(), 'WJH20260621002', users[0][0], shops[1][0], navs[1][0], 'accompany', 150, 30, 120, 'completed'],
  [uid(), 'WJH20260622003', users[1][0], shops[2][0], null, 'inspection', 25, 5, 20, 'pending'],
  [uid(), 'WJH20260623004', users[0][0], shops[3][0], navs[2][0], 'navigation', 39, 7.8, 31.2, 'abnormal'],
];
const insertSOrder = db.prepare('INSERT OR IGNORE INTO orders (id, order_no, user_id, shop_id, navigator_id, service_type, amount, platform_fee, navigator_income, status) VALUES (?,?,?,?,?,?,?,?,?,?)');
for (const o of sorders) { insertSOrder.run(...o); }
console.log(`  ✅ ${sorders.length} 个服务订单 (1个纠纷)`);

// ─── 结算记录 ───
console.log('💰 创建结算记录...');
const settles = [
  [uid(), navs[0][0], sorders[0][0], 39, 7.8, 31.2, 0, 'credited'],
  [uid(), navs[1][0], sorders[1][0], 150, 30, 120, 0, 'credited'],
];
const insertSettle = db.prepare('INSERT OR IGNORE INTO settlement_records (id, navigator_id, order_id, amount, platform_commission, navigator_income, tier_discount, status) VALUES (?,?,?,?,?,?,?,?)');
for (const s of settles) { insertSettle.run(...s); }
console.log(`  ✅ ${settles.length} 条结算记录`);

// ─── 系统配置 ───
console.log('⚙️ 创建系统配置...');
const configs = [
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
const insertCfg = db.prepare('INSERT OR REPLACE INTO system_configs (config_key, config_value) VALUES (?,?)');
for (const c of configs) { insertCfg.run(...c); }
console.log(`  ✅ ${configs.length} 个系统配置项`);

db.close();
console.log('\n🎉 种子数据创建完成！刷新浏览器查看效果。');
