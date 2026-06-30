/**
 * 通过 admin API 创建种子数据
 * 需要服务器运行在 localhost:3001
 */
var http = require('http');

var BASE = 'http://localhost:3001/api/v1';
var csrfToken = '';
var jwtToken = '';

function req(method, path, body) {
  return new Promise(function(resolve, reject) {
    var url = new URL(BASE + path);
    var options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': jwtToken ? 'Bearer ' + jwtToken : '',
        'x-csrf-token': csrfToken,
      }
    };
    var r = http.request(options, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function seed() {
  console.log('🔑 获取 CSRF token...');
  var csrfResp = await req('GET', '/auth/csrf-token');
  csrfToken = csrfResp.data.token;
  console.log('  CSRF: ' + csrfToken);

  console.log('🔐 管理员登录...');
  var loginResp = await req('POST', '/admin/login', { username: 'admin', password: 'admin123' });
  jwtToken = loginResp.data.accessToken;
  console.log('  JWT: ' + jwtToken.substring(0, 30) + '...');

  // ─── 创建市场 ───
  console.log('\n🏬 创建市场...');
  var mkData = [
    { name:'大明宫建材市场', city:'西安', district:'未央区', address:'太华北路218号', areaSqm:120000, floors:4 },
    { name:'城南装饰城', city:'西安', district:'雁塔区', address:'含光南路100号', areaSqm:85000, floors:3 },
    { name:'东部家居广场', city:'西安', district:'灞桥区', address:'纺渭路88号', areaSqm:65000, floors:2 },
    { name:'城北建材港', city:'西安', district:'未央区', address:'北三环大明宫', areaSqm:200000, floors:5 },
  ];
  var marketIds = [];
  for (var i = 0; i < mkData.length; i++) {
    try {
      var r = await req('POST', '/admin/markets', mkData[i]);
      if (r.data && r.data.id) { marketIds.push(r.data.id); console.log('  ✅ ' + r.data.name); }
      else { console.log('  ⚠️ ' + JSON.stringify(r)); }
    } catch(e) { console.log('  ❌ ' + e.message); }
  }

  // ─── 创建优惠券 ───
  console.log('\n🎫 创建优惠券...');
  var cpData = [
    { name:'新人专享券', type:'new_user', value:50, minAmount:200, discountType:'amount', status:1, totalCount:1000, perUserLimit:1, validFrom:'2026-06-01', validTo:'2026-12-31' },
    { name:'618建材大促', type:'full_reduction', value:200, minAmount:1000, discountType:'amount', status:1, totalCount:5000, perUserLimit:3, validFrom:'2026-06-15', validTo:'2026-06-25' },
    { name:'瓷砖品类9折', type:'category', value:10, minAmount:0, discountType:'percentage', maxDiscount:200, status:1, perUserLimit:2, validFrom:'2026-06-01', validTo:'2026-08-31' },
    { name:'现金红包', type:'cash', value:30, minAmount:100, discountType:'amount', status:1, totalCount:2000, perUserLimit:1, validFrom:'2026-06-01', validTo:'2026-07-31' },
    { name:'包邮券', type:'shipping_free', value:0, minAmount:500, discountType:'amount', status:0, totalCount:500, perUserLimit:3, validFrom:'2026-05-01', validTo:'2026-06-01' },
  ];
  for (var j = 0; j < cpData.length; j++) {
    try {
      var cr = await req('POST', '/admin/coupons', cpData[j]);
      console.log('  ✅ ' + cpData[j].name + (cr.data && cr.data.id ? ' (' + cr.data.id + ')' : ''));
    } catch(e) { console.log('  ❌ ' + cpData[j].name + ': ' + e.message); }
  }

  // ─── 创建信标 ───
  if (marketIds.length > 0) {
    console.log('\n📡 创建信标...');
    for (var k = 0; k < 15; k++) {
      var mid = marketIds[k % marketIds.length];
      try {
        await req('POST', '/admin/beacons', {
          marketId: mid,
          beaconUid: 'BLE-' + String(k+1).padStart(3,'0') + '-' + Math.random().toString(36).substring(2,6).toUpperCase(),
          floor: (k % 3) + 1,
          xPx: Math.round(Math.random() * 800),
          yPx: Math.round(Math.random() * 600),
          txPower: -59,
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          status: k < 12 ? 1 : 0,
        });
        console.log('  ✅ 信标 #' + (k+1));
      } catch(e) { console.log('  ❌ 信标 #' + (k+1) + ': ' + e.message); }
    }
  }

  // ─── 创建系统配置 ───
  console.log('\n⚙️ 创建系统配置...');
  var configs = {
    platformName: '为家航',
    minNavigatorIncome: '39',
    maxNavigatorDistance: '5',
    commissionRate: '20',
    enableRegistration: 'true',
    enableAutoDispatch: 'true',
    maintenanceMode: 'false',
    autoCancelMinutes: '30',
    fatigueHours: '4',
    restRewardAmount: '5',
    maxDailyOrders: '20',
  };
  try {
    await req('PUT', '/admin/system-config', configs);
    console.log('  ✅ 11 个系统配置项');
  } catch(e) { console.log('  ❌ ' + e.message); }

  // ─── 验证 ───
  console.log('\n📊 验证:');
  try { var m = await req('GET', '/admin/markets/list'); console.log('  市场: ' + (Array.isArray(m) ? m.length : m.data ? m.data.length : '?') + ' 个'); } catch(e) {}
  try { var c = await req('GET', '/admin/coupons'); console.log('  优惠券: ' + (Array.isArray(c) ? c.length : c.data ? (c.data.items || c.data).length : '?') + ' 个'); } catch(e) {}
  try { var b = await req('GET', '/admin/beacons'); console.log('  信标: ' + (Array.isArray(b) ? b.length : b.data ? (b.data.items || b.data).length : '?') + ' 个'); } catch(e) {}
  try { var s = await req('GET', '/admin/system-config'); console.log('  系统配置: ' + (s && s.data ? Object.keys(s.data).length : '?') + ' 项'); } catch(e) {}
  try { var d = await req('GET', '/admin/dashboard'); console.log('  Dashboard: ' + (d && d.code === 200 ? 'OK' : 'FAIL')); } catch(e) {}

  console.log('\n🎉 API种子数据创建完成！');
}

seed().catch(function(err) {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});
