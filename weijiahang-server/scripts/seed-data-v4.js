/**
 * 种子数据 V4 — 店铺 + 商品
 *
 * 为22个西安市场的每个市场创建 2-3 个店铺，每个店铺 5-15 个商品
 * 商品涵盖 7 个品类：瓷砖/卫浴/地板/涂料/门窗/石材/辅材
 *
 * 使用方式: node scripts/seed-data-v4.js
 */
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "weijiahang-dev.sqlite");
const db = new sqlite3.Database(DB_PATH);

// ============================================================
// 店铺模板 — 按品类
// ============================================================
const SHOP_TEMPLATES = [
  { suffix: "瓷砖旗舰店", categories: ["瓷砖", "卫浴"], brands: ["东鹏", "马可波罗", "诺贝尔"], priceRange: { min: 45, max: 580 } },
  { suffix: "卫浴体验馆", categories: ["卫浴"], brands: ["九牧", "箭牌", "恒洁", "法恩莎"], priceRange: { min: 199, max: 5999 } },
  { suffix: "地板专卖店", categories: ["地板"], brands: ["圣象", "大自然", "德尔", "菲林格尔"], priceRange: { min: 68, max: 650 } },
  { suffix: "涂料旗舰店", categories: ["涂料", "辅材"], brands: ["立邦", "多乐士", "三棵树", "华润"], priceRange: { min: 25, max: 899 } },
  { suffix: "门窗体验馆", categories: ["门窗"], brands: ["皇派", "新豪轩", "派雅", "轩尼斯"], priceRange: { min: 450, max: 2800 } },
  { suffix: "石材批发部", categories: ["石材"], brands: ["环球石材", "高时石材", "万里石"], priceRange: { min: 120, max: 880 } },
  { suffix: "五金建材批发", categories: ["辅材", "瓷砖"], brands: ["德高", "雨虹", "西卡", "汉高"], priceRange: { min: 15, max: 380 } },
  { suffix: "全屋定制馆", categories: ["门窗", "地板", "石材"], brands: ["欧派", "索菲亚", "尚品宅配", "好莱客"], priceRange: { min: 280, max: 3500 } },
  { suffix: "精品建材商行", categories: ["瓷砖", "地板", "卫浴"], brands: [], priceRange: { min: 35, max: 1200 } },
  { suffix: "灯饰照明馆", categories: ["辅材"], brands: ["欧普", "雷士", "飞利浦", "松下"], priceRange: { min: 48, max: 680 } },
];

// ============================================================
// 商品数据 — 按品类 (category)
// ============================================================
const PRODUCTS_BY_CATEGORY = {
  "瓷砖": [
    { name: "通体大理石瓷砖", spec: "800×800mm 亮面灰色系", price: 128, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "1:1天然大理石纹理，超低吸水率，适合客餐厅地面" },
    { name: "全抛釉瓷砖", spec: "600×600mm 米黄色系", price: 68, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "高光釉面，色彩亮丽，防污易清洁" },
    { name: "仿古砖", spec: "600×600mm 哑光防滑", price: 95, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "哑光釉面，R10防滑等级，适合厨卫阳台" },
    { name: "木纹砖", spec: "150×900mm 原木色", price: 78, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "高精度木纹纹理，防潮防虫，替代木地板首选" },
    { name: "瓷片内墙砖", spec: "300×600mm 白色亮面", price: 35, unit: "㎡", grade: "budget", gradeLabel: "经济款", desc: "釉面细腻光洁，厨卫墙面专用" },
    { name: "玻化砖", spec: "800×800mm 超耐磨", price: 88, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "全瓷玻化，莫氏硬度7级，商业空间首选" },
    { name: "马赛克拼花砖", spec: "300×300mm 混色艺术", price: 168, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "手工拼贴，多色可选，背景墙/玄关专用" },
    { name: "柔光大理石瓷砖", spec: "750×1500mm 连纹大板", price: 258, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "无限连纹，柔光护眼，大宅客厅首选" },
    { name: "防滑地砖", spec: "400×400mm 防滑等级R11", price: 55, unit: "㎡", grade: "budget", gradeLabel: "经济款", desc: "高防滑等级，适合卫生间湿区地面" },
    { name: "花砖", spec: "200×200mm 复古花鸟图案", price: 120, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "复古田园风格，玄关/阳台/咖啡角点缀" },
  ],
  "卫浴": [
    { name: "连体坐便器", spec: "虹吸式 超漩冲水 节水型3.5L", price: 1299, unit: "台", grade: "standard", gradeLabel: "标准款", desc: "全管道施釉，静音缓降盖板，PP材质" },
    { name: "实木浴室柜组合", spec: "80cm 防水防潮 含镜柜", price: 2399, unit: "套", grade: "standard", gradeLabel: "标准款", desc: "多层实木板，防水烤漆，太空铝挂件" },
    { name: "恒温花洒套装", spec: "三出水 全铜龙头 空气注入", price: 699, unit: "套", grade: "standard", gradeLabel: "标准款", desc: "38°C智能恒温，空气注入技术节水30%" },
    { name: "智能马桶", spec: "即热式 脚感冲水 暖风烘干", price: 3999, unit: "台", grade: "premium", gradeLabel: "高端款", desc: "即热活水，脚感冲水，离座自动冲水，遥控操作" },
    { name: "陶瓷台下盆", spec: "56×42cm 大容量 釉面光滑", price: 299, unit: "个", grade: "budget", gradeLabel: "经济款", desc: "高温烧制陶瓷，易清洁釉面，通用台下安装" },
    { name: "不锈钢水槽套装", spec: "大单槽 含龙头+沥水篮", price: 599, unit: "套", grade: "standard", gradeLabel: "标准款", desc: "304不锈钢，拉丝防划，台下安装" },
    { name: "浴室暖风机", spec: "3000W 速热 防水IPX4", price: 399, unit: "台", grade: "budget", gradeLabel: "经济款", desc: "3秒速热，防水机身，壁挂安装，冬天洗澡不冷" },
    { name: "增压顶喷花洒", spec: "方形304不锈钢超薄顶喷", price: 1099, unit: "套", grade: "premium", gradeLabel: "高端款", desc: "空气增压出水，方形超薄面板，淋浴如雨淋体验" },
  ],
  "地板": [
    { name: "强化复合地板", spec: "12mm E0级环保 锁扣", price: 88, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "德国进口耐磨纸，AC4商用级耐磨，地暖适用" },
    { name: "实木多层地板", spec: "15mm 橡木表层 人字拼", price: 238, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "进口橡木面层，满片无节，地暖/地暖通用" },
    { name: "纯实木地板", spec: "18mm 黑胡桃木 本色UV漆", price: 528, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "北美黑胡桃，整板大板，UV环保漆面，稳定性佳" },
    { name: "SPC石塑地板", spec: "5mm 锁扣 地板革替代", price: 55, unit: "㎡", grade: "budget", gradeLabel: "经济款", desc: "100%防水，零甲醛，出租屋/厨卫/阳台首选" },
    { name: "三层实木地板", spec: "14mm 柚木表层 清漆", price: 358, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "缅甸柚木面层，油脂丰富天然抗虫，可传承百年" },
    { name: "软木地板", spec: "6mm 葡萄牙进口 锁扣", price: 168, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "脚感柔软静音，适合儿童房/书房，隔音减震" },
  ],
  "涂料": [
    { name: "净味全效乳胶漆", spec: "18L 白色 水性环保", price: 588, unit: "桶", grade: "standard", gradeLabel: "标准款", desc: "净味技术，甲醛净化率92%，高遮盖力" },
    { name: "儿童漆", spec: "5L 可调色 无添加", price: 438, unit: "桶", grade: "premium", gradeLabel: "高端款", desc: "零VOC，抗污耐擦洗50000次，儿童房/母婴房专用" },
    { name: "艺术涂料", spec: "10L 幻彩金属质感", price: 350, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "手工批刮施工，金属质感，客厅/电视墙/玄关" },
    { name: "水性木器漆", spec: "2.5L 环保清漆", price: 268, unit: "桶", grade: "standard", gradeLabel: "标准款", desc: "水性环保不黄变，室内木器/家具/门套" },
    { name: "防水外墙漆", spec: "20L 弹性拉毛 白色基色", price: 799, unit: "桶", grade: "standard", gradeLabel: "标准款", desc: "弹性抗裂，耐候10年，外墙/露台/阳台专用" },
    { name: "界面剂/墙固", spec: "18L 黄色 基层加固", price: 180, unit: "桶", grade: "budget", gradeLabel: "经济款", desc: "封闭基层浮灰，增强腻子附着力，批刮腻子前必刷" },
  ],
  "门窗": [
    { name: "实木复合烤漆门", spec: "2100×900×200mm 含门套", price: 1680, unit: "樘", grade: "standard", gradeLabel: "标准款", desc: "实木框架+高密度板，PU烤漆，静音磁吸锁" },
    { name: "断桥铝系统窗", spec: "定制尺寸 双层中空钢化", price: 780, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "型材壁厚2.0mm，PA66隔热条，德国五金" },
    { name: "钛镁合金推拉门", spec: "极窄边框 8mm钢化玻璃", price: 580, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "极窄16mm边框，吊滑无地轨，厨房/衣帽间" },
    { name: "防盗门", spec: "甲级 电子猫眼+指纹锁", price: 3880, unit: "樘", grade: "premium", gradeLabel: "高端款", desc: "甲级防盗，C级锁芯，电子猫眼，远程开锁" },
    { name: "阳光房", spec: "定制 钢化夹胶玻璃顶", price: 1280, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "断桥铝结构，夹胶安全玻璃，遮阳帘预留" },
  ],
  "石材": [
    { name: "天然大理石台面", spec: "18mm 爵士白 抛光", price: 580, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "天然纹理每一片都是独一无二，厨柜台面/窗台石" },
    { name: "石英石台面", spec: "20mm 单色/双色可选", price: 380, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "93%石英含量，硬度高不渗色，厨柜台面首选" },
    { name: "花岗岩踏步板", spec: "30mm 芝麻灰 防滑槽", price: 168, unit: "㎡", grade: "standard", gradeLabel: "标准款", desc: "火烧+荔枝双面处理，防滑耐磨，户外楼梯/庭院" },
    { name: "岩板背景墙", spec: "6mm 2600×800mm 连纹", price: 680, unit: "㎡", grade: "premium", gradeLabel: "高端款", desc: "意大利进口岩板，无限连纹，耐高温2000°C" },
    { name: "文化石", spec: "不规则片状 仿古做旧", price: 95, unit: "㎡", grade: "budget", gradeLabel: "经济款", desc: "天然板岩加工，电视墙/壁炉/外墙局部装饰" },
  ],
  "辅材": [
    { name: "瓷砖胶C2型", spec: "25kg/袋 增强型", price: 48, unit: "袋", grade: "standard", gradeLabel: "标准款", desc: "C2增强型，大板/岩板铺贴专用，薄贴法省空间" },
    { name: "双组份美缝剂", spec: "400ml 环氧彩砂", price: 78, unit: "支", grade: "standard", gradeLabel: "标准款", desc: "哑光质感不反光，防水防霉不脱落，20色可选" },
    { name: "JS防水涂料", spec: "18kg 双组份 水泥基", price: 238, unit: "桶", grade: "standard", gradeLabel: "标准款", desc: "JS-II型，刷涂/滚涂通用，厨卫阳台地下室" },
    { name: "耐水腻子粉", spec: "20kg/袋 室内墙面", price: 28, unit: "袋", grade: "budget", gradeLabel: "经济款", desc: "耐水型N型，阴雨天不返潮，不脱粉，收光细腻" },
    { name: "水泥P.O42.5", spec: "50kg/袋 普通硅酸盐", price: 35, unit: "袋", grade: "budget", gradeLabel: "经济款", desc: "海螺/金刚牌，3天强度28MPa，砌墙/找平/贴砖" },
    { name: "堵漏王", spec: "2kg/袋 快硬型 4分钟初凝", price: 25, unit: "袋", grade: "budget", gradeLabel: "经济款", desc: "4分钟初凝，带水施工可堵明水，紧急堵漏必备" },
    { name: "玻璃胶", spec: "300ml 中性防霉 半透明", price: 28, unit: "支", grade: "budget", gradeLabel: "经济款", desc: "中性固化不腐蚀镜面，厨房/卫浴密封收边" },
  ],
};

// ============================================================
// 店铺命名前缀库
// ============================================================
const SHOP_NAME_PREFIXES = [
  "顺鑫", "恒达", "鑫旺", "永泰", "德盛", "华美", "金源", "宏发",
  "长兴", "瑞丰", "天和", "汇丰", "正大", "中盛", "兴业", "丰源",
  "博雅", "嘉华", "隆泰", "万和", "骏丰", "尚品", "锦城", "广源",
  "优品", "美居", "佳美", "宜家", "鼎盛", "荣华",
];

// ============================================================
// 工具函数
// ============================================================
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals) {
  var val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals || 0));
}

function pick(arr, count) {
  var shuffled = arr.slice().sort(function () { return 0.5 - Math.random(); });
  return shuffled.slice(0, count || 1);
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// 主流程
// ============================================================
function main() {
  console.log("=== 种子数据 V4：店铺 + 商品 ===\n");

  // 1. 查询所有市场
  db.all("SELECT id, name FROM markets ORDER BY name", function (err, markets) {
    if (err) {
      console.error("查询市场失败:", err.message);
      db.close();
      return;
    }

    if (markets.length === 0) {
      console.error("❌ 市场表为空，请先运行 seed-data-v3.js 导入市场数据");
      db.close();
      return;
    }

    console.log("找到 " + markets.length + " 个市场\n");

    // 2. 清理旧数据
    console.log("清理旧数据...");
    db.run("DELETE FROM products");
    db.run("DELETE FROM shops");
    console.log("已清空 shops 和 products 表\n");

    var allShops = [];
    var allProducts = [];

    // 3. 为每个市场生成店铺
    console.log("为每个市场生成店铺...");
    var usedPrefixes = {};

    for (var mi = 0; mi < markets.length; mi++) {
      var market = markets[mi];
      var shopCount = randInt(2, 3); // 每个市场2-3个店铺
      var marketShops = [];

      for (var si = 0; si < shopCount; si++) {
        var template = SHOP_TEMPLATES[(mi * shopCount + si) % SHOP_TEMPLATES.length];

        // 选择不重复的前缀
        var prefix;
        var attempts = 0;
        do {
          prefix = pickOne(SHOP_NAME_PREFIXES);
          attempts++;
        } while (usedPrefixes[prefix] && attempts < 50);
        usedPrefixes[prefix] = true;

        var shopName = prefix + template.suffix;
        var shopId = uuid();
        var shop = {
          id: shopId,
          name: shopName,
          marketId: market.id,
          marketName: market.name,
          categories: template.categories,
          brands: template.brands,
          priceRange: template.priceRange,
          floor: randInt(1, 4),
          rating: randFloat(4.0, 5.0, 2),
          reviewCount: randInt(10, 500),
          isVerified: true,
          isPromoted: Math.random() > 0.7,
          status: 1,
          phone: "138" + String(randInt(10000000, 99999999)),
          legalPerson: pickOne(["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴"]) + pickOne(["建国", "明华", "芳", "伟", "小梅", "刚", "建华", "志强", "丽", "海龙"]),
          building: pickOne(["A", "B", "C", "D", "E"]) + "栋",
          rowNo: String(randInt(1, 20)) + "排",
          shopNo: String(randInt(1, 50)) + "号",
        };
        marketShops.push(shop);
        allShops.push(shop);

        // 4. 为每个店铺生成商品
        var productCount = randInt(5, 15);
        var shopProducts = [];
        var usedProductNames = {};

        // 该店铺经营的品类
        var shopCategories = template.categories.slice();

        for (var pi = 0; pi < productCount; pi++) {
          var category = shopCategories[pi % shopCategories.length];
          var candidates = PRODUCTS_BY_CATEGORY[category] || PRODUCTS_BY_CATEGORY["瓷砖"];
          var productTemplate;

          // 尽量不重复
          var pAttempts = 0;
          do {
            productTemplate = pickOne(candidates);
            pAttempts++;
          } while (usedProductNames[productTemplate.name] && pAttempts < 30);
          usedProductNames[productTemplate.name] = true;

          var productId = uuid();
          var product = {
            id: productId,
            shopId: shopId,
            name: productTemplate.name,
            category: category,
            spec: productTemplate.spec,
            price: productTemplate.price + randInt(-10, 20), // 价格微调
            unit: productTemplate.unit,
            image: "",
            images: "[]",
            sales: randInt(0, 800),
            isHot: Math.random() > 0.75,
            isNew: Math.random() > 0.8,
            description: productTemplate.desc,
            isOnSale: true,
            sortOrder: pi,
            stock: randInt(-1, 500),
            productGrade: productTemplate.grade,
            gradeLabel: productTemplate.gradeLabel,
            minOrderQty: 1,
            tierPrices: "{}",
          };
          shopProducts.push(product);
          allProducts.push(product);
        }

        console.log(
          "  [" + market.name + "] " + shopName + " — " +
          shopProducts.length + "个商品 (" + template.categories.join("/") + ")"
        );
      }
    }

    console.log("\n共生成 " + allShops.length + " 个店铺, " + allProducts.length + " 个商品\n");

    // 5. 写入数据库
    console.log("写入 shops 表...");
    var shopStmt = db.prepare(
      "INSERT INTO shops (id, name, market_id, building, row_no, shop_no, floor, phone, legal_person, categories, brands, price_range, rating, review_count, is_verified, is_promoted, status, images) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );

    for (var i = 0; i < allShops.length; i++) {
      var s = allShops[i];
      shopStmt.run(
        s.id, s.name, s.marketId, s.building, s.rowNo, s.shopNo, s.floor,
        s.phone, s.legalPerson,
        JSON.stringify(s.categories), JSON.stringify(s.brands),
        JSON.stringify(s.priceRange), s.rating, s.reviewCount,
        s.isVerified ? 1 : 0, s.isPromoted ? 1 : 0, s.status,
        "[]"
      );
    }
    shopStmt.finalize();

    console.log("写入 products 表...");
    var prodStmt = db.prepare(
      "INSERT INTO products (id, shop_id, name, category, spec, price, priceUnit, images, description, is_on_sale, sort_order, stock, product_grade, grade_label, tier_prices, min_order_qty, sales_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );

    for (var j = 0; j < allProducts.length; j++) {
      var p = allProducts[j];
      prodStmt.run(
        p.id, p.shopId, p.name, p.category, p.spec, p.price, p.unit,
        p.images, p.description, p.isOnSale ? 1 : 0, p.sortOrder,
        p.stock, p.productGrade, p.gradeLabel, p.tierPrices,
        p.minOrderQty, p.sales
      );
    }
    prodStmt.finalize();

    console.log("\n✅ 种子数据 V4 导入完成！");
    console.log("   市场: " + markets.length + " 个");
    console.log("   店铺: " + allShops.length + " 个");
    console.log("   商品: " + allProducts.length + " 个");

    // 统计各品类商品数
    var catCount = {};
    for (var k = 0; k < allProducts.length; k++) {
      var cat = allProducts[k].category;
      catCount[cat] = (catCount[cat] || 0) + 1;
    }
    console.log("\n品类分布:");
    Object.keys(catCount).sort().forEach(function (c) {
      console.log("   " + c + ": " + catCount[c] + " 个");
    });

    db.close();
    console.log("\nDone.");
  });
}

main();
