/**
 * 管理后台种子数据脚本
 * 运行: npx ts-node scripts/seed-admin-data.ts
 */
import { DataSource } from 'typeorm';
import { Market } from '../src/database/entities/market.entity';
import { Shop } from '../src/database/entities/shop.entity';
import { Navigator } from '../src/database/entities/navigator.entity';
import { User } from '../src/database/entities/user.entity';
import { Beacon } from '../src/database/entities/beacon.entity';
import { Ad } from '../src/database/entities/ad.entity';
import { MarketingActivity } from '../src/database/entities/marketing-activity.entity';
import { Coupon } from '../src/database/entities/coupon.entity';
import { ProductOrder } from '../src/database/entities/product-order.entity';
import { CustomerTier } from '../src/database/entities/customer-tier.entity';
import { SystemConfig } from '../src/database/entities/system-config.entity';
import { Order } from '../src/database/entities/order.entity';
import { SettlementRecord } from '../src/database/entities/settlement-record.entity';

async function seed() {
  const ds = new DataSource({
    type: 'better-sqlite3',
    database: 'weijiahang_dev.db',
    entities: [
      Market, Shop, Navigator, User, Beacon, Ad, MarketingActivity,
      Coupon, ProductOrder, CustomerTier, SystemConfig,
      Order, SettlementRecord,
    ],
    synchronize: false,
  });

  await ds.initialize();
  console.log('📡 数据库已连接');

  // ═══════════════════════════════════════════
  // 1. 市场
  // ═══════════════════════════════════════════
  console.log('🏬 创建市场...');
  const marketData = [
    { name: '大明宫建材市场', city: '西安', district: '未央区', address: '太华北路218号', areaSqm: 120000, floors: 4, status: 1 },
    { name: '城南装饰城', city: '西安', district: '雁塔区', address: '含光南路100号', areaSqm: 85000, floors: 3, status: 1 },
    { name: '东部家居广场', city: '西安', district: '灞桥区', address: '纺渭路88号', areaSqm: 65000, floors: 2, status: 1 },
    { name: '城北建材港', city: '西安', district: '未央区', address: '北三环大明宫', areaSqm: 200000, floors: 5, status: 1 },
  ];
  const marketResult = await ds.getRepository(Market).insert(marketData as any[]);
  const marketIds = marketResult.identifiers.map((i: any) => i.id);
  console.log(`  ✅ ${marketIds.length} 个市场`);

  // ═══════════════════════════════════════════
  // 2. 店铺
  // ═══════════════════════════════════════════
  console.log('🏪 创建店铺...');
  const shopData = [
    { name: '东鹏瓷砖旗舰店', marketId: marketIds[0], legalPerson: '张建国', phone: '13800010001', categories: JSON.stringify(['瓷砖', '卫浴']), status: 1, isVerified: true, rating: 4.8 },
    { name: '马可波罗瓷砖', marketId: marketIds[0], legalPerson: '李明华', phone: '13800010002', categories: JSON.stringify(['瓷砖']), status: 1, isVerified: true, rating: 4.6 },
    { name: '欧派全屋定制', marketId: marketIds[1], legalPerson: '王芳', phone: '13800010003', categories: JSON.stringify(['定制', '橱柜']), status: 1, isVerified: true, rating: 4.9 },
    { name: '立邦涂料专卖', marketId: marketIds[2], legalPerson: '赵伟', phone: '13800010004', categories: JSON.stringify(['涂料', '辅材']), status: 1, isVerified: true, rating: 4.5 },
    { name: '九牧卫浴', marketId: marketIds[1], legalPerson: '孙小梅', phone: '13800010005', categories: JSON.stringify(['卫浴']), status: 0, isVerified: false, rating: 0 },
    { name: '新中源陶瓷', marketId: marketIds[3], legalPerson: '陈刚', phone: '13800010006', categories: JSON.stringify(['瓷砖']), status: 0, isVerified: false, rating: 0 },
    { name: '兔宝宝板材', marketId: marketIds[3], legalPerson: '刘建华', phone: '13800010007', categories: JSON.stringify(['板材', '定制']), status: 1, isVerified: true, rating: 4.3 },
  ];
  const shopResult = await ds.getRepository(Shop).insert(shopData as any[]);
  const shopIds = shopResult.identifiers.map((i: any) => i.id);
  console.log(`  ✅ ${shopIds.length} 个店铺 (2个待审核)`);

  // ═══════════════════════════════════════════
  // 3. 领航员
  // ═══════════════════════════════════════════
  console.log('🧭 创建领航员...');
  const navData = [
    { realName: '王大伟', phone: '13900010001', homeMarketIds: marketIds[0], skills: JSON.stringify(['瓷砖选购', '验货']), status: 1, backgroundCheck: true, rating: 4.9, totalOrders: 326, balance: 12500, totalEarned: 89500 },
    { realName: '李志强', phone: '13900010002', homeMarketIds: marketIds[1], skills: JSON.stringify(['涂料咨询', '颜色搭配']), status: 1, backgroundCheck: true, rating: 4.7, totalOrders: 218, balance: 8600, totalEarned: 62300 },
    { realName: '张晓燕', phone: '13900010003', homeMarketIds: marketIds[0], skills: JSON.stringify(['卫浴安装', '水路验收']), status: 1, backgroundCheck: true, rating: 4.8, totalOrders: 195, balance: 7200, totalEarned: 54800 },
    { realName: '赵明辉', phone: '13900010004', homeMarketIds: marketIds[2], skills: JSON.stringify(['板材识别', '定制测量']), status: 0, backgroundCheck: false, rating: 0, totalOrders: 0, balance: 0, totalEarned: 0 },
    { realName: '陈小华', phone: '13900010005', homeMarketIds: marketIds[3], skills: JSON.stringify(['辅材配送']), status: 0, backgroundCheck: false, rating: 0, totalOrders: 0, balance: 0, totalEarned: 0 },
  ];
  const navResult = await ds.getRepository(Navigator).insert(navData as any[]);
  const navIds = navResult.identifiers.map((i: any) => i.id);
  console.log(`  ✅ ${navIds.length} 个领航员 (2个待审核)`);

  // ═══════════════════════════════════════════
  // 4. 用户
  // ═══════════════════════════════════════════
  console.log('👤 创建用户...');
  const userData = [
    { nickname: '装修达人小王', phone: '13600010001', city: '西安', customerType: 'retail', totalOrders: 5, totalSpent: 12500, status: 1 },
    { nickname: '工长老刘', phone: '13600010002', city: '西安', customerType: 'contractor', totalOrders: 85, totalSpent: 450000, status: 1 },
    { nickname: '装企张总', phone: '13600010003', city: '西安', customerType: 'decoration_company', totalOrders: 25, totalSpent: 820000, status: 1 },
    { nickname: '批发商李老板', phone: '13600010004', city: '西安', customerType: 'wholesale', totalOrders: 520, totalSpent: 6800000, status: 1 },
  ];
  const userResult = await ds.getRepository(User).insert(userData as any[]);
  const userIds = userResult.identifiers.map((i: any) => i.id);
  console.log(`  ✅ ${userIds.length} 个用户`);

  // ═══════════════════════════════════════════
  // 5. 信标
  // ═══════════════════════════════════════════
  console.log('📡 创建BLE信标...');
  const beaconData: any[] = [];
  for (let i = 0; i < 15; i++) {
    const mid = marketIds[i % marketIds.length];
    beaconData.push({
      marketId: mid,
      beaconUid: `BLE-${String(i + 1).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      floor: (i % 3) + 1,
      xPx: Math.round(Math.random() * 800),
      yPx: Math.round(Math.random() * 600),
      txPower: -59,
      batteryLevel: Math.floor(Math.random() * 40) + 60,
      status: i < 12 ? 1 : 0,
    });
  }
  await ds.getRepository(Beacon).insert(beaconData as any[]);
  console.log(`  ✅ ${beaconData.length} 个信标`);

  // ═══════════════════════════════════════════
  // 6. 广告
  // ═══════════════════════════════════════════
  console.log('📢 创建广告...');
  const adData = [
    { shopId: shopIds[0], adType: 'cpc', adPosition: 'home_banner', budget: 5000, dailyBudget: 500, cpcBid: 2.5, startDate: '2026-06-01', endDate: '2026-07-31', impressions: 12500, clicks: 320, spent: 800, status: 1 },
    { shopId: shopIds[1], adType: 'cpm', adPosition: 'shop_list_top', budget: 3000, dailyBudget: 300, cpcBid: 1.5, startDate: '2026-06-15', endDate: '2026-07-15', impressions: 8500, clicks: 180, spent: 450, status: 1 },
    { shopId: shopIds[2], adType: 'cpc', adPosition: 'category_sidebar', budget: 2000, dailyBudget: 200, cpcBid: 3.0, startDate: '2026-06-20', endDate: '2026-08-20', impressions: 3200, clicks: 95, spent: 285, status: 1 },
    { shopId: shopIds[3], adType: 'cpc', adPosition: 'home_banner', budget: 8000, dailyBudget: 800, cpcBid: 2.0, startDate: '2026-06-10', endDate: '2026-07-10', impressions: 28000, clicks: 720, spent: 1440, status: 1 },
    { shopId: shopIds[0], adType: 'cpm', adPosition: 'search_result', budget: 1500, dailyBudget: 150, cpcBid: 1.0, startDate: '2026-05-01', endDate: '2026-05-31', impressions: 6200, clicks: 45, spent: 1350, status: 0 },
  ];
  await ds.getRepository(Ad).insert(adData as any[]);
  console.log(`  ✅ ${adData.length} 个广告`);

  // ═══════════════════════════════════════════
  // 7. 营销活动
  // ═══════════════════════════════════════════
  console.log('🎯 创建营销活动...');
  const activityData = [
    { shopId: 'platform', activityType: 'flash_sale', name: '618建材年中大促', rule: '{"discountDesc":"全场陶瓷8折起"}', startDate: '2026-06-15', endDate: '2026-06-25', budget: 50000, maxCount: 1000, usedCount: 628, status: 1 },
    { shopId: shopIds[0], activityType: 'coupon_pack', name: '东鹏新店开业礼包', rule: '{"discountDesc":"满1000减200"}', startDate: '2026-06-01', endDate: '2026-07-01', budget: 10000, maxCount: 500, usedCount: 186, status: 1 },
    { shopId: shopIds[2], activityType: 'referral', name: '老带新享双倍积分', rule: '{"discountDesc":"推荐返现100元"}', startDate: '2026-06-01', endDate: '2026-09-01', budget: 8000, maxCount: 200, usedCount: 42, status: 1 },
    { shopId: shopIds[1], activityType: 'clearance', name: '瓷砖清仓甩卖', rule: '{"discountDesc":"特价款5折起"}', startDate: '2026-05-20', endDate: '2026-06-10', budget: 3000, maxCount: 300, usedCount: 300, status: 0 },
  ];
  await ds.getRepository(MarketingActivity).insert(activityData as any[]);
  console.log(`  ✅ ${activityData.length} 个营销活动`);

  // ═══════════════════════════════════════════
  // 8. 优惠券
  // ═══════════════════════════════════════════
  console.log('🎫 创建优惠券...');
  const couponData = [
    { name: '新人专享券', type: 'new_user', value: 50, minAmount: 200, discountType: 'amount', status: 1, usedCount: 328, totalCount: 1000, perUserLimit: 1, validFrom: '2026-06-01', validTo: '2026-12-31' },
    { name: '618建材大促', type: 'full_reduction', value: 200, minAmount: 1000, discountType: 'amount', status: 1, usedCount: 1205, totalCount: 5000, perUserLimit: 3, validFrom: '2026-06-15', validTo: '2026-06-25' },
    { name: '瓷砖品类9折', type: 'category', value: 10, minAmount: 0, discountType: 'percentage', maxDiscount: 200, status: 1, usedCount: 86, totalCount: 0, perUserLimit: 2, validFrom: '2026-06-01', validTo: '2026-08-31' },
    { name: '现金红包', type: 'cash', value: 30, minAmount: 100, discountType: 'amount', status: 1, usedCount: 520, totalCount: 2000, perUserLimit: 1, validFrom: '2026-06-01', validTo: '2026-07-31' },
    { name: '包邮券', type: 'shipping_free', value: 0, minAmount: 500, discountType: 'amount', status: 0, usedCount: 150, totalCount: 500, perUserLimit: 3, validFrom: '2026-05-01', validTo: '2026-06-01' },
  ];
  await ds.getRepository(Coupon).insert(couponData as any[]);
  console.log(`  ✅ ${couponData.length} 个优惠券`);

  // ═══════════════════════════════════════════
  // 9. 采购订单
  // ═══════════════════════════════════════════
  console.log('📦 创建采购订单...');
  const orderData = [
    { orderNo: 'WJHPD20260621001', userId: userIds[0], customerType: 'retail', tierLevel: 1, status: 'paid', itemsTotal: 4298, finalAmount: 4348, deliveryMethod: 'navigator_deliver', deliveryFee: 50, payStatus: 1, source: 'miniapp' },
    { orderNo: 'WJHPD20260620002', userId: userIds[1], customerType: 'contractor', tierLevel: 4, status: 'shipped', itemsTotal: 12800, tierDiscount: 640, finalAmount: 12160, deliveryMethod: 'self_pickup', payStatus: 1, source: 'miniapp' },
    { orderNo: 'WJHPD20260619003', userId: userIds[3], customerType: 'wholesale', tierLevel: 5, status: 'refunding', itemsTotal: 85000, tierDiscount: 10200, finalAmount: 74800, deliveryMethod: 'logistics', payStatus: 1, refundReason: '部分货物破损', source: 'miniapp' },
    { orderNo: 'WJHPD20260618004', userId: userIds[0], customerType: 'retail', tierLevel: 1, status: 'cancelled', itemsTotal: 899, finalAmount: 899, deliveryMethod: 'self_pickup', payStatus: 0, cancelReason: '用户取消', source: 'miniapp' },
    { orderNo: 'WJHPD20260622005', userId: userIds[2], customerType: 'decoration_company', tierLevel: 3, status: 'completed', itemsTotal: 35000, tierDiscount: 1750, finalAmount: 33250, deliveryMethod: 'logistics', payStatus: 1, source: 'miniapp' },
  ];
  await ds.getRepository(ProductOrder).insert(orderData as any[]);
  console.log(`  ✅ ${orderData.length} 个采购订单`);

  // ═══════════════════════════════════════════
  // 10. 客户分层
  // ═══════════════════════════════════════════
  console.log('🏅 创建客户分层...');
  const tierData = [
    { userId: userIds[1], customerType: 'contractor', currentLevel: 4, currentTierName: '铂金', totalScore: 85, totalAmount: 450000, orderCount: 85, tierDiscountRate: 0.08, monthlyCreditLimit: null, ordersProgress: 80, amountProgress: 75, monthsProgress: 90 },
    { userId: userIds[2], customerType: 'decoration_company', currentLevel: 3, currentTierName: '黄金', totalScore: 45, totalAmount: 380000, orderCount: 15, tierDiscountRate: 0.05, monthlyCreditLimit: 500000, ordersProgress: 50, amountProgress: 60, monthsProgress: 70 },
    { userId: userIds[3], customerType: 'wholesale', currentLevel: 5, currentTierName: '钻石', totalScore: 520, totalAmount: 6800000, orderCount: 520, tierDiscountRate: 0.12, monthlyCreditLimit: null, ordersProgress: 100, amountProgress: 100, monthsProgress: 100 },
  ];
  await ds.getRepository(CustomerTier).insert(tierData as any[]);
  console.log(`  ✅ ${tierData.length} 个客户分层记录`);

  // ═══════════════════════════════════════════
  // 11. 系统配置
  // ═══════════════════════════════════════════
  console.log('⚙️ 创建系统配置...');
  const configData = [
    { configKey: 'platformName', configValue: '为家航' },
    { configKey: 'minNavigatorIncome', configValue: '39' },
    { configKey: 'maxNavigatorDistance', configValue: '5' },
    { configKey: 'commissionRate', configValue: '20' },
    { configKey: 'enableRegistration', configValue: 'true' },
    { configKey: 'enableAutoDispatch', configValue: 'true' },
    { configKey: 'maintenanceMode', configValue: 'false' },
    { configKey: 'autoCancelMinutes', configValue: '30' },
    { configKey: 'fatigueHours', configValue: '4' },
    { configKey: 'restRewardAmount', configValue: '5' },
    { configKey: 'maxDailyOrders', configValue: '20' },
  ];
  await ds.getRepository(SystemConfig).insert(configData as any[]);
  console.log(`  ✅ ${configData.length} 个系统配置项`);

  // ═══════════════════════════════════════════
  // 12. 服务订单（含纠纷）
  // ═══════════════════════════════════════════
  console.log('🛒 创建服务订单...');
  const serveOrderData = [
    { orderNo: 'WJH20260620001', userId: userIds[0], shopId: shopIds[0], navigatorId: navIds[0], serviceType: 'navigation', amount: 39, platformFee: 7.8, navigatorIncome: 31.2, status: 'completed' },
    { orderNo: 'WJH20260621002', userId: userIds[0], shopId: shopIds[1], navigatorId: navIds[1], serviceType: 'accompany', amount: 150, platformFee: 30, navigatorIncome: 120, status: 'completed' },
    { orderNo: 'WJH20260622003', userId: userIds[1], shopId: shopIds[2], serviceType: 'inspection', amount: 25, platformFee: 5, navigatorIncome: 20, status: 'pending' },
    { orderNo: 'WJH20260623004', userId: userIds[0], shopId: shopIds[3], navigatorId: navIds[2], serviceType: 'navigation', amount: 39, platformFee: 7.8, navigatorIncome: 31.2, status: 'abnormal' },
  ];
  const soResult = await ds.getRepository(Order).insert(serveOrderData as any[]);
  const soIds = soResult.identifiers.map((i: any) => i.id);
  console.log(`  ✅ ${soIds.length} 个服务订单 (1个纠纷)`);

  // ═══════════════════════════════════════════
  // 13. 结算记录
  // ═══════════════════════════════════════════
  console.log('💰 创建结算记录...');
  const settleData = [
    { navigatorId: navIds[0], orderId: soIds[0], amount: 39, platformCommission: 7.8, navigatorIncome: 31.2, tierDiscount: 0, status: 'credited' },
    { navigatorId: navIds[1], orderId: soIds[1], amount: 150, platformCommission: 30, navigatorIncome: 120, tierDiscount: 0, status: 'credited' },
  ];
  await ds.getRepository(SettlementRecord).insert(settleData as any[]);
  console.log(`  ✅ ${settleData.length} 条结算记录`);

  await ds.destroy();
  console.log('\n🎉 种子数据创建完成！刷新浏览器查看效果。');
}

seed().catch((err) => {
  console.error('❌ 种子数据创建失败:', err.message);
  process.exit(1);
});
