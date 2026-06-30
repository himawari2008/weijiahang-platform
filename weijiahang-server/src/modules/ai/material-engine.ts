/**
 * 材料定额计算引擎
 * 基于《建筑装饰装修工程消耗量定额》《全国统一建筑装饰装修工程消耗量定额》
 * 所有公式不依赖AI，100%可复现
 */

// ============================================================
// 1. 基础数据
// ============================================================

/** 城市价格系数（西安 = 1.0） */
const CITY_COEF: Record<string, number> = {
  '西安': 1.00, '北京': 1.35, '上海': 1.40, '广州': 1.25, '深圳': 1.30,
  '成都': 1.05, '武汉': 1.00, '杭州': 1.20, '南京': 1.15, '郑州': 0.95,
};

/** 装修档次系数 */
const GRADE_COEF = { '经济': 0.7, '中等': 1.0, '高端': 1.5, '豪华': 2.5 };

// ============================================================
// 2. 材料定额数据库
// ============================================================

interface MaterialStd {
  /** 品类 */
  category: string;
  /** 材料名称 */
  name: string;
  /** 规格 */
  spec: string;
  /** 计价单位 */
  unit: string;
  /** 适用空间 */
  rooms: string[];
  /** 每㎡理论用量 */
  perSqm: number;
  /** 损耗率 */
  wasteRate: number;
  /** 施工损耗说明 */
  wasteNote: string;
  /** 价格档位 [经济, 中等, 高端] 元/单位 */
  prices: [number, number, number];
}

const MATERIAL_DB: MaterialStd[] = [
  // ═══ 瓷砖 ═══
  {
    category: '瓷砖', name: '客厅地砖', spec: '800×800mm', unit: '㎡',
    rooms: ['客厅', '餐厅', '过道'],
    perSqm: 1, wasteRate: 0.05, wasteNote: '直铺5%，菱形铺8%，拼花12%',
    prices: [60, 120, 280],
  },
  {
    category: '瓷砖', name: '厨卫墙砖', spec: '300×600mm', unit: '㎡',
    rooms: ['厨房', '卫生间'],
    perSqm: 1, wasteRate: 0.08, wasteNote: '含窗洞切割损耗',
    prices: [40, 80, 180],
  },
  {
    category: '瓷砖', name: '厨卫地砖', spec: '300×300mm', unit: '㎡',
    rooms: ['厨房', '卫生间'],
    perSqm: 1, wasteRate: 0.05, wasteNote: '直铺5%',
    prices: [45, 90, 200],
  },
  {
    category: '瓷砖', name: '阳台防滑砖', spec: '300×300mm', unit: '㎡',
    rooms: ['阳台'],
    perSqm: 1, wasteRate: 0.05, wasteNote: '直铺5%',
    prices: [35, 70, 150],
  },
  {
    category: '瓷砖', name: '背景墙岩板', spec: '900×1800mm', unit: '片',
    rooms: ['客厅', '卧室'],
    perSqm: 0.62, wasteRate: 0.12, wasteNote: '大板切割拼接，损耗较大',
    prices: [200, 500, 1500],
  },
  {
    category: '瓷砖', name: '踢脚线砖', spec: '800×100mm', unit: 'm',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台', '餐厅'],
    perSqm: 0, wasteRate: 0.05, wasteNote: '按周长×1.05',
    prices: [8, 15, 35],
  },

  // ═══ 地板 ═══
  {
    category: '地板', name: '强化复合地板', spec: '1215×195×12mm', unit: '㎡',
    rooms: ['客厅', '卧室', '餐厅'],
    perSqm: 1, wasteRate: 0.05, wasteNote: '直铺5%，人字拼10%',
    prices: [60, 120, 220],
  },
  {
    category: '地板', name: '实木复合地板', spec: '910×127×15mm', unit: '㎡',
    rooms: ['客厅', '卧室'],
    perSqm: 1, wasteRate: 0.06, wasteNote: '直铺6%',
    prices: [150, 300, 600],
  },
  {
    category: '地板', name: 'SPC锁扣地板', spec: '1220×180×4mm', unit: '㎡',
    rooms: ['厨房', '卫生间', '阳台'],
    perSqm: 1, wasteRate: 0.04, wasteNote: '锁扣安装，损耗小',
    prices: [40, 80, 150],
  },
  {
    category: '地板', name: '防潮垫', spec: '2mm', unit: '㎡',
    rooms: ['客厅', '卧室', '餐厅'],
    perSqm: 1, wasteRate: 0.02, wasteNote: '',
    prices: [3, 5, 10],
  },
  {
    category: '地板', name: '收边条/踢脚线', spec: '2.4m/根', unit: '根',
    rooms: ['客厅', '卧室', '餐厅'],
    perSqm: 0, wasteRate: 0.05, wasteNote: '周长÷2.4',
    prices: [15, 30, 80],
  },

  // ═══ 涂料 ═══
  {
    category: '涂料', name: '内墙乳胶漆（底漆）', spec: '18L/桶（刷120㎡/遍）', unit: '桶',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台', '餐厅'],
    perSqm: 0, wasteRate: 0, wasteNote: '涂刷面积=地面面积×2.8（含天花板）÷120',
    prices: [180, 350, 800],
  },
  {
    category: '涂料', name: '内墙乳胶漆（面漆）', spec: '18L/桶（刷100㎡/遍）', unit: '桶',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台', '餐厅'],
    perSqm: 0, wasteRate: 0, wasteNote: '涂刷面积=地面面积×2.8÷100×2遍',
    prices: [220, 450, 1200],
  },
  {
    category: '涂料', name: '腻子粉', spec: '20kg/袋（刮15㎡/遍）', unit: '袋',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台', '餐厅'],
    perSqm: 0, wasteRate: 0, wasteNote: '涂刷面积÷15×2遍',
    prices: [25, 45, 80],
  },

  // ═══ 卫浴 ═══
  {
    category: '卫浴', name: '马桶', spec: '标准坑距305/400mm', unit: '个',
    rooms: ['卫生间'],
    perSqm: 0, wasteRate: 0, wasteNote: '1个/卫生间',
    prices: [600, 1500, 5000],
  },
  {
    category: '卫浴', name: '花洒套装', spec: '标准三出水', unit: '套',
    rooms: ['卫生间'],
    perSqm: 0, wasteRate: 0, wasteNote: '1套/卫生间',
    prices: [300, 800, 3000],
  },
  {
    category: '卫浴', name: '浴室柜+镜柜', spec: '60-100cm宽', unit: '套',
    rooms: ['卫生间'],
    perSqm: 0, wasteRate: 0, wasteNote: '1套/卫生间',
    prices: [800, 2000, 6000],
  },
  {
    category: '卫浴', name: '集成吊顶', spec: '300×300mm', unit: '㎡',
    rooms: ['厨房', '卫生间'],
    perSqm: 1, wasteRate: 0.05, wasteNote: '',
    prices: [60, 120, 250],
  },
  {
    category: '卫浴', name: '浴霸/暖风机', spec: '', unit: '台',
    rooms: ['卫生间'],
    perSqm: 0, wasteRate: 0, wasteNote: '1台/卫生间',
    prices: [200, 500, 1500],
  },

  // ═══ 门窗 ═══
  {
    category: '门窗', name: '室内木门', spec: '800×2100mm（含门套）', unit: '樘',
    rooms: ['卧室', '卫生间'],
    perSqm: 0, wasteRate: 0, wasteNote: '按实际门洞数量',
    prices: [600, 1500, 4000],
  },
  {
    category: '门窗', name: '钛镁合金门', spec: '700×2100mm', unit: '樘',
    rooms: ['厨房', '卫生间', '阳台'],
    perSqm: 0, wasteRate: 0, wasteNote: '',
    prices: [400, 900, 2500],
  },
  {
    category: '门窗', name: '铝合金窗', spec: '断桥铝', unit: '㎡',
    rooms: ['客厅', '卧室', '厨房', '阳台'],
    perSqm: 1, wasteRate: 0, wasteNote: '按实际窗洞面积',
    prices: [350, 600, 1200],
  },

  // ═══ 辅材 ═══
  {
    category: '辅材', name: '水泥', spec: 'P.O42.5 50kg/袋', unit: '袋',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台', '餐厅'],
    perSqm: 0.25, wasteRate: 0.05, wasteNote: '铺砖用，每㎡约0.25袋',
    prices: [22, 28, 35],
  },
  {
    category: '辅材', name: '沙子', spec: '中沙 方', unit: '方',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台', '餐厅'],
    perSqm: 0.04, wasteRate: 0.05, wasteNote: '铺砖用，每㎡约0.04方',
    prices: [160, 200, 260],
  },
  {
    category: '辅材', name: '瓷砖胶', spec: 'C2型 25kg/袋', unit: '袋',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台'],
    perSqm: 0.2, wasteRate: 0.05, wasteNote: '薄贴法，每㎡约5kg',
    prices: [35, 55, 90],
  },
  {
    category: '辅材', name: '美缝剂', spec: '400ml/支', unit: '支',
    rooms: ['客厅', '卧室', '厨房', '卫生间', '阳台'],
    perSqm: 0.3, wasteRate: 0.1, wasteNote: '每㎡约0.3支（800砖）',
    prices: [30, 60, 120],
  },
  {
    category: '辅材', name: '防水涂料', spec: '18kg/桶（刷12㎡/遍）', unit: '桶',
    rooms: ['厨房', '卫生间', '阳台'],
    perSqm: 0, wasteRate: 0, wasteNote: '涂刷面积×2遍÷12',
    prices: [180, 320, 550],
  },

  // ═══ 石材 ═══
  {
    category: '石材', name: '石英石台面', spec: '15mm厚', unit: 'm',
    rooms: ['厨房'],
    perSqm: 0, wasteRate: 0.1, wasteNote: '按延米计算',
    prices: [280, 500, 1200],
  },
  {
    category: '石材', name: '窗台石', spec: '人造石 宽度定制', unit: 'm',
    rooms: ['客厅', '卧室'],
    perSqm: 0, wasteRate: 0.05, wasteNote: '按延米',
    prices: [60, 120, 280],
  },
  {
    category: '石材', name: '门槛石', spec: '天然大理石', unit: '块',
    rooms: ['卫生间', '厨房'],
    perSqm: 0, wasteRate: 0.05, wasteNote: '1块/门洞',
    prices: [50, 100, 300],
  },
];

// ============================================================
// 3. 空间标准配置
// ============================================================

interface RoomConfig {
  /** 该空间通常需要的材料品类 */
  materials: string[];
  /** 墙面系数（墙面积 ÷ 地面面积） */
  wallCoef: number;
}

const ROOM_CONFIG: Record<string, RoomConfig> = {
  '客厅': {
    materials: ['瓷砖', '地板', '涂料', '门窗', '辅材', '石材'],
    wallCoef: 2.5,
  },
  '卧室': {
    materials: ['地板', '涂料', '门窗', '辅材'],
    wallCoef: 2.5,
  },
  '厨房': {
    materials: ['瓷砖', '卫浴', '门窗', '辅材', '石材'],
    wallCoef: 3.0,
  },
  '卫生间': {
    materials: ['瓷砖', '卫浴', '门窗', '辅材', '石材'],
    wallCoef: 3.5,
  },
  '阳台': {
    materials: ['瓷砖', '门窗', '辅材'],
    wallCoef: 2.0,
  },
  '餐厅': {
    materials: ['瓷砖', '地板', '涂料', '辅材'],
    wallCoef: 2.0,
  },
  '过道': {
    materials: ['瓷砖', '涂料', '辅材'],
    wallCoef: 2.0,
  },
};

// ============================================================
// 4. 计算引擎
// ============================================================

export interface CalcInput {
  /** 空间列表 */
  rooms: Array<{
    name: string;       // 客厅/卧室/厨房/卫生间/阳台/餐厅
    area: number;       // 地面面积(㎡)
    subtype?: string;   // 特殊场景: 背景墙/楼梯等
  }>;
  /** 材料品类过滤（可选，只算指定品类） */
  categories?: string[];
  /** 装修档次 */
  grade?: '经济' | '中等' | '高端';
  /** 所在城市 */
  city?: string;
  /** 是否为单一材料模式 */
  singleMode?: boolean;
}

export interface CalcResult {
  materials: Array<{
    category: string;
    items: Array<{
      name: string;
      spec: string;
      qty: number;
      unit: string;
      /** 计算公式说明 */
      formula: string;
      /** 损耗说明 */
      wasteNote: string;
      priceRange: { min: number; max: number };
    }>;
    totalMin: number;
    totalMax: number;
  }>;
  totalRange: { min: number; max: number };
  summary: string;
  /** 材料明细清单 */
  breakdown: Array<{
    room: string;
    area: number;
    materials: Array<{ category: string; name: string; qty: number; unit: string }>;
  }>;
}

/**
 * 主计算函数
 */
export function calculateMaterials(input: CalcInput): CalcResult {
  const { rooms, categories, grade = '中等', city = '西安' } = input;
  const cityCoef = CITY_COEF[city] || 1.0;
  const gradeCoef = GRADE_COEF[grade];
  const totalCoef = cityCoef * gradeCoef;

  const resultMaterials: CalcResult['materials'] = [];
  const breakdown: CalcResult['breakdown'] = [];

  // 按品类分组
  const categoryMap = new Map<string, MaterialStd[]>();
  for (const m of MATERIAL_DB) {
    if (categories && !categories.includes(m.category)) continue;
    if (!categoryMap.has(m.category)) categoryMap.set(m.category, []);
    categoryMap.get(m.category)!.push(m);
  }

  // 逐个空间计算
  for (const room of rooms) {
    const roomCfg = ROOM_CONFIG[room.name];
    if (!roomCfg) continue;

    const roomBreakdown = { room: room.name, area: room.area, materials: [] as any[] };

    for (const [cat, items] of categoryMap) {
      if (input.singleMode && categories && !categories.includes(cat)) continue;
      if (!roomCfg.materials.includes(cat) && !input.singleMode) continue;

      for (const std of items) {
        if (!std.rooms.includes(room.name) && !input.singleMode) continue;

        const qty = calcQty(std, room.area, roomCfg);
        if (qty <= 0) continue;

        roomBreakdown.materials.push({ category: cat, name: std.name, qty, unit: std.unit });

        // 合并到结果
        let catGroup = resultMaterials.find((m) => m.category === cat);
        if (!catGroup) {
          catGroup = { category: cat, items: [], totalMin: 0, totalMax: 0 };
          resultMaterials.push(catGroup);
        }

        const existing = catGroup.items.find((i) => i.name === std.name);
        if (existing) {
          existing.qty += qty;
        } else {
          const priceMin = Math.round(std.prices[0] * totalCoef);
          const priceMax = Math.round(std.prices[2] * totalCoef);
          const itemMin = Math.round(qty * priceMin);
          const itemMax = Math.round(qty * priceMax);
          catGroup.items.push({
            name: std.name,
            spec: std.spec,
            qty: Math.round(qty * 100) / 100,
            unit: std.unit,
            formula: buildFormula(std, room.area, roomCfg),
            wasteNote: std.wasteNote || '',
            priceRange: { min: itemMin, max: itemMax },
          });
          catGroup.totalMin += itemMin;
          catGroup.totalMax += itemMax;
        }
      }
    }

    breakdown.push(roomBreakdown);
  }

  // 总计
  let totalMin = 0, totalMax = 0;
  for (const g of resultMaterials) {
    totalMin += g.totalMin;
    totalMax += g.totalMax;
  }

  return {
    materials: resultMaterials,
    totalRange: { min: totalMin, max: totalMax },
    summary: buildSummary(rooms, resultMaterials, totalMin, totalMax, grade, city),
    breakdown,
  };
}

// ============================================================
// 5. 辅助函数
// ============================================================

/** 计算用量 */
function calcQty(std: MaterialStd, area: number, roomCfg: RoomConfig): number {
  const wasteRate = std.wasteRate || 0;

  if (std.perSqm > 0) {
    // 按面积计算的品类：用量 = 面积 × 每㎡用量 × (1 + 损耗率)
    return area * std.perSqm * (1 + wasteRate);
  }

  // 特殊计算规则（品类级别）
  if (std.category === '涂料') {
    if (std.name.includes('底漆')) {
      return Math.ceil(area * roomCfg.wallCoef / 120);
    }
    if (std.name.includes('面漆')) {
      return Math.ceil(area * roomCfg.wallCoef / 100 * 2);
    }
    if (std.name.includes('腻子')) {
      return Math.ceil(area * roomCfg.wallCoef / 15 * 2);
    }
  }

  if (std.category === '卫浴') {
    // 卫浴产品按个/套计算，每个卫生间1份
    return 1;
  }

  if (std.category === '门窗') {
    if (std.name.includes('木门')) return roomCfg.wallCoef >= 2 ? 1 : 0;
    if (std.name.includes('合金门')) return 1;
    if (std.name.includes('窗')) return 0; // 窗面积差异大，不估算
  }

  if (std.category === '石材') {
    if (std.name.includes('门槛')) return 1;
    return 0; // 延米按实际测量
  }

  if (std.category === '辅材') {
    if (std.name.includes('防水')) {
      return Math.ceil(area * roomCfg.wallCoef * 2 / 12);
    }
    if (std.name.includes('美缝')) {
      return Math.ceil(area * std.perSqm * (1 + wasteRate));
    }
    return Math.ceil(area * std.perSqm * (1 + wasteRate));
  }

  return Math.ceil(area * std.perSqm * (1 + wasteRate));
}

/** 生成计算说明 */
function buildFormula(std: MaterialStd, area: number, roomCfg: RoomConfig): string {
  const wasteRate = std.wasteRate || 0;

  if (std.category === '涂料') {
    if (std.name.includes('底漆')) return `${area}㎡ × 墙面系数${roomCfg.wallCoef} ÷ 120㎡/桶 = ${Math.ceil(area * roomCfg.wallCoef / 120)}桶`;
    if (std.name.includes('面漆')) return `${area}㎡ × ${roomCfg.wallCoef} ÷ 100㎡/桶 × 2遍 = ${Math.ceil(area * roomCfg.wallCoef / 100 * 2)}桶`;
    if (std.name.includes('腻子')) return `${area}㎡ × ${roomCfg.wallCoef} ÷ 15㎡/袋 × 2遍 = ${Math.ceil(area * roomCfg.wallCoef / 15 * 2)}袋`;
  }

  if (std.perSqm > 0) {
    return `${area}㎡ × ${std.perSqm} × (1+${(wasteRate * 100).toFixed(0)}%) ≈ ${(area * std.perSqm * (1 + wasteRate)).toFixed(1)}${std.unit}`;
  }

  return `${std.name}：1${std.unit}/房间`;
}

function buildSummary(
  rooms: CalcInput['rooms'],
  materials: CalcResult['materials'],
  totalMin: number, totalMax: number,
  grade: string, city: string,
): string {
  const roomNames = rooms.map((r) => r.name).join('、');
  const totalArea = rooms.reduce((s, r) => s + r.area, 0);
  const catCount = materials.length;
  const itemCount = materials.reduce((s, g) => s + g.items.length, 0);

  return `${roomNames}共${totalArea}㎡，${grade}档次，${city}市场价格。` +
    `涵盖${catCount}大品类、${itemCount}项材料。` +
    `总预算约¥${totalMin.toLocaleString()}-${totalMax.toLocaleString()}。` +
    `以上为参考估价，实际价格以店铺报价为准。`;
}

/** 快捷：单品类速算 */
export function quickCalc(
  category: string,
  area: number,
  roomName: string,
  grade: '经济' | '中等' | '高端' = '中等',
  city: string = '西安',
): CalcResult {
  return calculateMaterials({
    rooms: [{ name: roomName || '客厅', area }],
    categories: [category],
    grade,
    city,
    singleMode: true,
  });
}
