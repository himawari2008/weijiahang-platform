/**
 * 为家航 · 公共数据模块
 * 首页、Feed页共享的商品/灵感/特惠数据
 * 上线后替换为真实 API 调用
 */

var ALL_GOODS = [
  { id: 'g1', city: '西安', cate: '瓷砖', texture: 'tile', name: '东鹏大理石瓷砖 800x800 亮面灰色系客餐厅地砖', price: 128, spec: '800x800mm 亮面灰色系', unit: '㎡', shopId: 's1', shopName: '老李瓷砖批发', shopRating: 4.8, sales: 326, isHot: true, isNew: false, image: '' },
  { id: 'g2', city: '西安', cate: '瓷砖', texture: 'tile', name: '马可波罗仿古砖 600x600 防滑厨卫阳台地砖', price: 88, spec: '600x600mm 哑光防滑', unit: '㎡', shopId: 's2', shopName: '鑫源建材商行', shopRating: 4.6, sales: 198, isHot: true, isNew: false, image: '' },
  { id: 'g3', city: '西安', cate: '瓷砖', texture: 'tile', name: '欧神诺全抛釉地砖 亮光新中式风格客厅砖', price: 158, spec: '800x800mm 亮光新中式', unit: '㎡', shopId: 's3', shopName: '恒达瓷砖旗舰店', shopRating: 4.9, sales: 512, isHot: true, isNew: false, image: '' },
  { id: 'g4', city: '西安', cate: '卫浴', texture: 'bath', name: '九牧虹吸式马桶 超漩节水静音坐便器', price: 899, spec: '305mm坑距 虹吸式', unit: '台', shopId: 's4', shopName: '九牧卫浴专卖', shopRating: 4.7, sales: 203, isHot: false, isNew: true, image: '' },
  { id: 'g5', city: '西安', cate: '地板', texture: 'floor', name: '大自然强化复合地板 12mm防水耐磨家用', price: 98, spec: '1215x195x12mm 橡木色', unit: '㎡', shopId: 's5', shopName: '大自然地板', shopRating: 4.8, sales: 415, isHot: true, isNew: false, image: '' },
  { id: 'g6', city: '西安', cate: '涂料', texture: 'paint', name: '立邦净味120乳胶漆 白色内墙面漆18L', price: 280, spec: '18L 白色 净味', unit: '桶', shopId: 's6', shopName: '立邦官方授权店', shopRating: 4.9, sales: 689, isHot: true, isNew: false, image: '' },
  { id: 'g7', city: '西安', cate: '瓷砖', texture: 'tile', name: '冠珠大板瓷砖 750x1500 岩板客厅背景墙', price: 198, spec: '750x1500mm 岩板', unit: '㎡', shopId: 's1', shopName: '老李瓷砖批发', shopRating: 4.8, sales: 89, isHot: false, isNew: true, image: '' },
  { id: 'g8', city: '西安', cate: '卫浴', texture: 'bath', name: 'TOTO智能马桶盖 即热式暖风烘干', price: 1680, spec: '即热式 白色', unit: '台', shopId: 's4', shopName: '九牧卫浴专卖', shopRating: 4.7, sales: 156, isHot: false, isNew: true, image: '' },
  { id: 'g9', city: '成都', cate: '瓷砖', texture: 'tile', name: '蒙娜丽莎大板瓷砖 900x1800 岩板通体', price: 268, spec: '900x1800mm 哑光岩板', unit: '㎡', shopId: 's10', shopName: '蒙娜丽莎成都总代', shopRating: 4.9, sales: 201, isHot: true, isNew: false, image: '' },
  { id: 'g10', city: '成都', cate: '地板', texture: 'floor', name: '圣象强化地板 12mm E0级环保', price: 118, spec: '1215x195x12mm 浅橡木', unit: '㎡', shopId: 's11', shopName: '圣象地板成都店', shopRating: 4.7, sales: 178, isHot: true, isNew: false, image: '' },
  { id: 'g11', city: '郑州', cate: '瓷砖', texture: 'tile', name: '诺贝尔瓷砖 800x800 全抛釉客厅砖', price: 138, spec: '800x800mm 亮光米色', unit: '㎡', shopId: 's12', shopName: '诺贝尔瓷砖郑州店', shopRating: 4.8, sales: 256, isHot: true, isNew: false, image: '' },
  { id: 'g12', city: '西安', cate: '门窗', texture: 'door', name: '断桥铝门窗 定制封阳台 隔热隔音', price: 680, spec: '1.4mm壁厚 5+12A+5钢化', unit: '㎡', shopId: 's7', shopName: '大明门窗定制', shopRating: 4.5, sales: 87, isHot: false, isNew: true, image: '' },
  { id: 'g13', city: '西安', cate: '石材', texture: 'stone', name: '天然大理石台面 窗台石 门槛石定制', price: 320, spec: '18mm厚度 天然爵士白', unit: 'm', shopId: 's8', shopName: '华洋石材', shopRating: 4.6, sales: 142, isHot: true, isNew: false, image: '' },
  { id: 'g14', city: '西安', cate: '辅材', texture: 'hardware', name: '德高瓷砖胶 玻化砖专用强力粘结剂20kg', price: 58, spec: '20kg 玻化砖专用', unit: '袋', shopId: 's9', shopName: '德高建材专卖', shopRating: 4.8, sales: 534, isHot: true, isNew: false, image: '' },
  { id: 'g15', city: '西安', cate: '卫浴', texture: 'bath', name: '箭牌浴室柜组合 80cm陶瓷盆+智能镜柜', price: 2280, spec: '80cm 陶瓷盆+智能镜', unit: '套', shopId: 's4', shopName: '九牧卫浴专卖', shopRating: 4.7, sales: 112, isHot: false, isNew: true, image: '' },
  { id: 'g16', city: '西安', cate: '地板', texture: 'floor', name: '书香门第实木复合地板 鱼骨拼 橡木本色', price: 328, spec: '510×90×15mm 鱼骨拼', unit: '㎡', shopId: 's5', shopName: '大自然地板', shopRating: 4.8, sales: 89, isHot: false, isNew: true, image: '' },
  { id: 'g17', city: '成都', cate: '卫浴', texture: 'bath', name: '恒洁超旋风节水马桶 一级水效 305坑距', price: 1299, spec: '305mm坑距 一级水效', unit: '台', shopId: 's10', shopName: '蒙娜丽莎成都总代', shopRating: 4.9, sales: 267, isHot: true, isNew: false, image: '' },
  { id: 'g18', city: '西安', cate: '门窗', texture: 'door', name: 'TATA木门 静音免漆门 极简平板造型', price: 1680, spec: '2100×900mm 极简白', unit: '樘', shopId: 's7', shopName: '大明门窗定制', shopRating: 4.5, sales: 156, isHot: true, isNew: false, image: '' },
  { id: 'g19', city: '西安', cate: '石材', texture: 'stone', name: '石英石厨房台面 15mm加厚 含安装挡水条', price: 420, spec: '15mm 石英石 含安装', unit: 'm', shopId: 's8', shopName: '华洋石材', shopRating: 4.6, sales: 203, isHot: true, isNew: false, image: '' },
  { id: 'g20', city: '郑州', cate: '涂料', texture: 'paint', name: '多乐士森呼吸无添加 硅藻乳胶漆 5L', price: 398, spec: '5L 哑光白 无添加', unit: '桶', shopId: 's12', shopName: '诺贝尔瓷砖郑州店', shopRating: 4.8, sales: 178, isHot: false, isNew: true, image: '' },
];

var ALL_FLASH = [
  { id: 'f1', city: '西安', name: '东鹏大理石瓷砖 800x800', price: 128, origPrice: 228, tag: '5折', endTime: '20:00', bg: '#FFF5EB', shopId: 's1', shopName: '老李瓷砖批发', spec: '800x800mm 亮面灰色系', unit: '㎡' },
  { id: 'f2', city: '西安', name: '大自然强化复合地板', price: 98, origPrice: 188, tag: '5.2折', endTime: '22:00', bg: '#FFF8F0', shopId: 's5', shopName: '大自然地板', spec: '1215x195x12mm 橡木色', unit: '㎡' },
  { id: 'f3', city: '西安', name: '九牧虹吸式马桶', price: 699, origPrice: 1299, tag: '5.4折', endTime: '24:00', bg: '#F0F5FF', shopId: 's4', shopName: '九牧卫浴专卖', spec: '305mm坑距 虹吸式', unit: '台' },
  { id: 'f4', city: '西安', name: '立邦净味120乳胶漆18L', price: 280, origPrice: 480, tag: '5.8折', endTime: '明天', bg: '#F5FFF0', shopId: 's6', shopName: '立邦官方授权店', spec: '18L 白色 净味', unit: '桶' },
  { id: 'f5', city: '成都', name: '蒙娜丽莎大板 900x1800 岩板', price: 268, origPrice: 498, tag: '5.4折', endTime: '22:00', bg: '#FFF0F5', shopId: 's10', shopName: '蒙娜丽莎成都总代', spec: '900x1800mm 哑光岩板', unit: '㎡' },
  { id: 'f6', city: '郑州', name: '诺贝尔全抛釉瓷砖 800x800', price: 138, origPrice: 258, tag: '5.3折', endTime: '21:00', bg: '#F5F0FF', shopId: 's12', shopName: '诺贝尔瓷砖郑州店', spec: '800x800mm 亮光米色', unit: '㎡' },
];

var inspoItems = [
  { id: 'i1', title: '120平现代简约三居，瓷砖通铺大气又耐脏', style: '现代简约', area: 120, cost: 18, colors: '灰+白+木', desc: '全屋800×800亮面瓷砖通铺，无门槛石设计，空间延伸感极强。厨房用小白砖+深灰美缝，性价比超高。', bg: 'linear-gradient(135deg, #D5CFC4, #C4BCB0)' },
  { id: 'i2', title: '80平老房翻新记，卫浴改造前后对比太惊艳', style: '北欧风', area: 80, cost: 12, colors: '白+原木+蓝', desc: '卫生间干湿分离改造，哑光白瓷砖+实木浴室柜，花砖点缀让空间有灵气。全屋浅木色复合地板，温馨自然。', bg: 'linear-gradient(135deg, #C9D8E8, #B0C4D8)' },
  { id: 'i3', title: '小户型也能装浴缸！5平米卫生间的逆袭', style: '日式', area: 62, cost: 8, colors: '米白+浅木+灰', desc: '迷你浴缸+壁挂马桶+镜柜收纳，3.8㎡实现三分离。木纹砖上墙，防潮又温暖。', bg: 'linear-gradient(135deg, #E8E0D8, #D8CFC0)' },
  { id: 'i4', title: '极简风客厅，无主灯设计配岩板背景墙', style: '极简', area: 140, cost: 25, colors: '黑白灰+金属', desc: '750×1500岩板背景墙+磁吸轨道灯+深灰哑光地砖。全屋定制柜体做到顶，视觉干净利落。', bg: 'linear-gradient(135deg, #D0D0D0, #B8B8B8)' },
  { id: 'i5', title: '开放式厨房+中岛台，石英石台面实用又高级', style: '美式', area: 105, cost: 15, colors: '白+深蓝+金', desc: '中岛台兼餐桌一体，20mm石英石台面耐刮耐烫。橱柜门板选用深蓝哑光烤漆，黄铜拉手点睛。', bg: 'linear-gradient(135deg, #E8E0D0, #D8CCB8)' },
  { id: 'i6', title: '轻奢风主卧套房，实木地板+全屋定制衣柜', style: '轻奢', area: 95, cost: 16, colors: '奶茶+玫瑰金+灰', desc: '18mm橡木实木地板鱼骨拼，定制衣柜一门到顶，玫瑰金拉丝把手+茶色玻璃门，质感满分。', bg: 'linear-gradient(135deg, #D8C4B8, #C4B0A0)' },
  { id: 'i7', title: '新中式风雅居，水墨意境+实木格栅屏风', style: '新中式', area: 130, cost: 22, colors: '胡桃木+米灰+青', desc: '900×900哑光大理石瓷砖，胡桃木格栅隔断，定制博古架+隐藏灯带，东方美学与现代舒适兼得。', bg: 'linear-gradient(135deg, #C4B8A8, #B0A490)' },
  { id: 'i8', title: '工业风LOFT，水泥自流平+裸砖墙+铁艺', style: '工业风', area: 88, cost: 10, colors: '水泥灰+红砖+黑铁', desc: '水泥自流平地面+红砖文化石背景墙+黑色铁艺隔断。轨道射灯+复古开关面板，粗犷又个性。', bg: 'linear-gradient(135deg, #A09890, #908880)' },
  { id: 'i9', title: '奶油风温馨两居，全屋微水泥+弧形转角', style: '奶油风', area: 92, cost: 14, colors: '奶白+浅杏+藤编', desc: '全屋微水泥墙地一体，弧形墙角柔和过渡。藤编家具+棉麻布艺+暖白窗帘，治愈系空间。', bg: 'linear-gradient(135deg, #F0E8DC, #E4D8C8)' },
  { id: 'i10', title: '侘寂风茶室+书房，素色肌理漆+原木大板', style: '侘寂风', area: 75, cost: 11, colors: '大地色+原木+陶土', desc: '手工肌理漆墙面+5cm厚原木大板桌面+陶罐花器。亚光素色地砖，不完美之美。', bg: 'linear-gradient(135deg, #D8D0C0, #C8C0B0)' },
  { id: 'i11', title: '法式轻奢大平层，石膏线+人字拼+大理石', style: '法式轻奢', area: 160, cost: 32, colors: '奶油白+灰蓝+黄铜', desc: '石膏雕花线条+人字拼实木地板+天然大理石壁炉。灰蓝色定制橱柜配黄铜五金，优雅高级。', bg: 'linear-gradient(135deg, #E0D8D0, #D0C8C0)' },
  { id: 'i12', title: '原木风亲子宅，全屋木地板+儿童攀爬墙', style: '原木风', area: 110, cost: 17, colors: '浅橡木+白+薄荷绿', desc: 'E0级强化木地板全屋通铺+儿童房攀岩墙+乐高墙。定制收纳柜底部留空，扫地机器人自由穿梭。', bg: 'linear-gradient(135deg, #E8DCC8, #D8CCB0)' },
];

module.exports = {
  ALL_GOODS: ALL_GOODS,
  ALL_FLASH: ALL_FLASH,
  inspoItems: inspoItems,
};
