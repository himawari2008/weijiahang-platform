import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Beacon } from '../../database/entities/beacon.entity';
import { NavTrack } from '../../database/entities/nav-track.entity';
import { Shop } from '../../database/entities/shop.entity';
import { Market } from '../../database/entities/market.entity';

/** 路径节点 */
interface RouteNode {
  key: string;
  x: number;
  y: number;
}

/** 路径规划结果 */
export interface RouteResult {
  path: Array<{ x: number; y: number; key?: string; action?: string }>;
  distance: number;
  estimatedTime: number;
  nodeCount: number;
}

/** 市场地图数据 */
export interface MarketMapData {
  id: string;
  name: string;
  floors: number[];
  beacons: any[];
  shops: any[];
}

/** 位置记录 DTO */
export interface RecordPositionDto {
  orderId?: string;
  navigatorId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  accuracy?: number;
  floor?: number;
  beaconData?: any[];
}

/**
 * 室内导航服务
 * 路径规划（Dijkstra）+ 实时定位 + 到达检测
 */
@Injectable()
export class NavigationService {
  /** 像素→米转换系数（根据市场平面图比例尺调整） */
  private readonly PX_TO_METER = 0.05;
  /** 步行速度 m/s */
  private readonly WALK_SPEED = 1.2;
  /** 节点连接阈值（像素），超过此距离的两个节点不直接相连 */
  private readonly NODE_CONNECT_THRESHOLD = 350;
  /** 起点/终点连接最近信标的最大数量 */
  private readonly NEAREST_BEACON_COUNT = 3;

  constructor(
    @InjectRepository(NavTrack)
    private readonly navTrackRepo: Repository<NavTrack>,
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,
    @InjectRepository(Beacon)
    private readonly beaconRepo: Repository<Beacon>,
  ) {}

  // ==================== 路径规划（Dijkstra） ====================

  /**
   * 室内路径规划
   * 从 beacons 表加载该楼层信标坐标作为路径节点，
   * 使用简化 Dijkstra 算法计算最短路径。
   *
   * @param params.marketId  市场 ID
   * @param params.floor     楼层
   * @param params.fromX     起点 X（像素坐标）
   * @param params.fromY     起点 Y（像素坐标）
   * @param params.toShopId  目标店铺 ID（自动获取店铺坐标）
   */
  async getRoute(params: {
    marketId: string;
    floor: number;
    fromX: number;
    fromY: number;
    toShopId: string;
  }): Promise<RouteResult> {
    const { marketId, floor, fromX, fromY, toShopId } = params;

    // 1. 获取目标店铺坐标
    const shop = await this.shopRepo.findOne({
      where: { id: toShopId, marketId, status: 1 },
    });
    if (!shop) throw new NotFoundException('目标店铺不存在');
    if (shop.xPx == null || shop.yPx == null) {
      throw new BadRequestException('该店铺尚未标注平面图坐标');
    }

    const toX = shop.xPx;
    const toY = shop.yPx;

    // 2. 加载该楼层信标作为路径节点
    const beacons = await this.beaconRepo.find({
      where: { marketId, floor, status: 1 },
    });

    if (beacons.length === 0) {
      // 无信标时回退到直线导航
      return this.fallbackRoute(fromX, fromY, toX, toY);
    }

    // 3. 构建图并计算路径
    const result = this.buildGraphAndRoute(beacons, fromX, fromY, toX, toY);

    // 4. 如果找不到路径（例如所有节点孤立），回退直线
    if (result.path.length <= 2 && result.distance === Infinity) {
      return this.fallbackRoute(fromX, fromY, toX, toY);
    }

    return result;
  }

  /**
   * 构建信标图并执行 Dijkstra 最短路径
   */
  private buildGraphAndRoute(
    beacons: Beacon[],
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): RouteResult {
    // 节点表：key -> { x, y }
    const nodes = new Map<string, RouteNode>();
    // 边表：key -> [{ to, weight }]
    const edges = new Map<string, Array<{ to: string; weight: number }>>();

    // 添加信标节点
    beacons.forEach((b, i) => {
      if (b.xPx == null || b.yPx == null) return;
      nodes.set(`b${i}`, { key: `b${i}`, x: b.xPx, y: b.yPx });
    });

    const START_KEY = 'start';
    const END_KEY = 'end';
    nodes.set(START_KEY, { key: START_KEY, x: fromX, y: fromY });
    nodes.set(END_KEY, { key: END_KEY, x: toX, y: toY });

    const nodeKeys = Array.from(nodes.keys());

    // 连接彼此接近的信标（互相在阈值内）
    const beaconKeys = nodeKeys.filter(k => k.startsWith('b'));
    for (let i = 0; i < beaconKeys.length; i++) {
      for (let j = i + 1; j < beaconKeys.length; j++) {
        const a = nodes.get(beaconKeys[i]);
        const b = nodes.get(beaconKeys[j]);
        if (!a || !b) continue;
        const dist = this.euclideanDist(a.x, a.y, b.x, b.y);
        if (dist <= this.NODE_CONNECT_THRESHOLD) {
          this.addEdge(edges, beaconKeys[i], beaconKeys[j], dist);
        }
      }
    }

    // 起点连接到最近的 N 个信标
    this.connectToNearest(START_KEY, nodes, edges, this.NEAREST_BEACON_COUNT);

    // 终点连接到最近的 N 个信标
    this.connectToNearest(END_KEY, nodes, edges, this.NEAREST_BEACON_COUNT);

    // Dijkstra
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>(nodeKeys);

    for (const k of nodeKeys) {
      distances.set(k, k === START_KEY ? 0 : Infinity);
      previous.set(k, null);
    }

    while (unvisited.size > 0) {
      // 选取距离最小的未访问节点
      let current: string | null = null;
      let minDist = Infinity;
      for (const k of unvisited) {
        const d = distances.get(k);
        if (d !== undefined && d < minDist) {
          minDist = d;
          current = k;
        }
      }
      if (current === null || current === END_KEY || minDist === Infinity) break;

      unvisited.delete(current);

      const neighbors = edges.get(current) || [];
      const currentDist = distances.get(current);
      if (currentDist === undefined) continue;

      for (const { to, weight } of neighbors) {
        if (!unvisited.has(to)) continue;
        const alt = currentDist + weight;
        const targetDist = distances.get(to);
        if (targetDist !== undefined && alt < targetDist) {
          distances.set(to, alt);
          previous.set(to, current);
        }
      }
    }

    // 重构路径
    const path: Array<{ x: number; y: number; key?: string; action?: string }> = [];
    let cur: string | null = END_KEY;
    while (cur !== null) {
      const node = nodes.get(cur);
      if (node) {
        path.unshift({
          x: node.x,
          y: node.y,
          key: cur,
          action: cur === START_KEY ? 'start' : cur === END_KEY ? 'arrived' : undefined,
        });
      }
      cur = previous.get(cur) ?? null;
    }

    const totalDistPx = distances.get(END_KEY) || 0;
    const distance = Math.round(totalDistPx * this.PX_TO_METER * 100) / 100;
    const estimatedTime = Math.round(distance / this.WALK_SPEED);

    return { path, distance, estimatedTime, nodeCount: nodes.size };
  }

  /** 将某节点连接到距离最近的 N 个信标 */
  private connectToNearest(
    key: string,
    nodes: Map<string, RouteNode>,
    edges: Map<string, Array<{ to: string; weight: number }>>,
    count: number,
  ): void {
    const self = nodes.get(key);
    if (!self) return;

    const beaconKeys = Array.from(nodes.keys()).filter(k => k.startsWith('b'));
    const distanceEntries = beaconKeys
      .map(k => {
        const node = nodes.get(k);
        if (!node) return null;
        return { key: k, dist: this.euclideanDist(self.x, self.y, node.x, node.y) };
      })
      .filter((entry): entry is { key: string; dist: number } => entry !== null)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, count);

    for (const { key: neighbor, dist } of distanceEntries) {
      this.addEdge(edges, key, neighbor, dist);
    }
  }

  /** 添加无向边 */
  private addEdge(
    edges: Map<string, Array<{ to: string; weight: number }>>,
    a: string,
    b: string,
    weight: number,
  ): void {
    if (!edges.has(a)) edges.set(a, []);
    if (!edges.has(b)) edges.set(b, []);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    edges.get(a)!.push({ to: b, weight });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    edges.get(b)!.push({ to: a, weight });
  }

  /** 欧几里得距离 */
  private euclideanDist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 无信标时的直线回退导航 */
  private fallbackRoute(fromX: number, fromY: number, toX: number, toY: number): RouteResult {
    const dx = (fromX - toX) * this.PX_TO_METER;
    const dy = (fromY - toY) * this.PX_TO_METER;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
    const estimatedTime = Math.round(distance / this.WALK_SPEED);

    return {
      path: [
        { x: fromX, y: fromY, key: 'start', action: 'start' },
        { x: toX, y: toY, key: 'end', action: 'arrived' },
      ],
      distance,
      estimatedTime,
      nodeCount: 2,
    };
  }

  // ==================== 市场地图 ====================

  /**
   * 返回市场地图数据（含楼层、信标网格、店铺坐标）
   */
  async getMarketMap(marketId: string): Promise<MarketMapData> {
    const market = await this.marketRepo.findOne({ where: { id: marketId } });
    if (!market) throw new NotFoundException('市场不存在');

    // 获取该市场所有有效的信标
    const beacons = await this.beaconRepo.find({
      where: { marketId, status: 1 },
    });

    // 获取该市场所有有效店铺的坐标
    const shops = await this.shopRepo.find({
      where: { marketId, status: 1, isVerified: true },
      select: ['id', 'name', 'floor', 'xPx', 'yPx', 'categories', 'rating'],
    });

    // 楼层列表（从信标和店铺中提取）
    const beaconFloors = new Set(beacons.map(b => b.floor));
    const shopFloors = new Set(shops.filter(s => s.floor != null).map(s => s.floor));
    const allFloors = new Set<number>([...beaconFloors, ...shopFloors]);
    const floors = Array.from(allFloors).sort((a, b) => a - b);

    return {
      id: market.id,
      name: market.name,
      floors,
      beacons: beacons.map(b => ({
        id: b.id,
        uid: b.beaconUid,
        floor: b.floor,
        x: b.xPx,
        y: b.yPx,
        txPower: b.txPower,
        batteryLevel: b.batteryLevel,
      })),
      shops: shops.map(s => ({
        id: s.id,
        name: s.name,
        floor: s.floor,
        x: s.xPx,
        y: s.yPx,
        categories: s.categories,
        rating: s.rating,
      })),
    };
  }

  // ==================== 位置记录 ====================

  /**
   * 记录用户/领航员实时位置到 nav_tracks 表
   */
  async recordPosition(dto: RecordPositionDto): Promise<NavTrack> {
    const track = new NavTrack();
    track.orderId = dto.orderId || '';
    track.navigatorId = dto.navigatorId || '';
    track.latitude = dto.latitude;
    track.longitude = dto.longitude;
    track.speed = dto.speed || 0;
    track.accuracy = dto.accuracy || 0;
    track.floor = dto.floor ?? 1;
    track.beaconData = (dto.beaconData || []) as any;

    return this.navTrackRepo.save(track);
  }

  // ==================== 向后兼容 ====================

  /**
   * 路径规划（原版，向后兼容）
   * @deprecated 请使用 getRoute()
   */
  async planRoute(marketId: string, from: any, to: any) {
    return {
      route: [
        { x: from.x, y: from.y, floor: from.floor, action: 'start' },
        { x: to.x, y: to.y, floor: to.floor, action: 'arrived' },
      ],
      estimatedTime: this.estimateTime(from, to),
      distance: this.calcDistance(from, to),
    };
  }

  /** 估算步行时间（秒） */
  private estimateTime(from: any, to: any): number {
    const dist = this.calcDistance(from, to);
    return Math.round(dist / this.WALK_SPEED);
  }

  /** 计算平面距离（米） */
  private calcDistance(a: any, b: any): number {
    const dx = (a.x - b.x) * this.PX_TO_METER;
    const dy = (a.y - b.y) * this.PX_TO_METER;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }
}
