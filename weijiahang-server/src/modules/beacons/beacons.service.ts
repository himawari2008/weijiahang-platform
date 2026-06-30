import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Beacon } from '../../database/entities/beacon.entity';

@Injectable()
export class BeaconsService {
  constructor(
    @InjectRepository(Beacon)
    private readonly beaconRepo: Repository<Beacon>,
  ) {}

  // ---- Admin CRUD ----

  /** 管理员：获取所有信标（分页+搜索） */
  async findAll(params: {
    page?: number; pageSize?: number; keyword?: string; marketId?: string; status?: number;
  } = {}): Promise<{ items: Beacon[]; total: number }> {
    const { page = 1, pageSize = 20, keyword, marketId, status } = params;
    const where: any = {};
    if (marketId) where.marketId = marketId;
    if (status !== undefined) where.status = status;

    const [items, total] = await this.beaconRepo.findAndCount({
      where,
      order: { installedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 管理员：创建信标 */
  async create(dto: Partial<Beacon>): Promise<Beacon> {
    const beacon = this.beaconRepo.create(dto as any);
    return this.beaconRepo.save(beacon as unknown as Beacon);
  }

  /** 管理员：更新信标 */
  async update(id: string, dto: Partial<Beacon>): Promise<Beacon> {
    const beacon = await this.beaconRepo.findOne({ where: { id } });
    if (!beacon) throw new NotFoundException('信标不存在');
    Object.assign(beacon, dto);
    return this.beaconRepo.save(beacon as unknown as Beacon);
  }

  /** 管理员：删除信标 */
  async remove(id: string): Promise<void> {
    const beacon = await this.beaconRepo.findOne({ where: { id } });
    if (!beacon) throw new NotFoundException('信标不存在');
    beacon.status = -1;
    await this.beaconRepo.save(beacon as unknown as Beacon);
  }

  // ---- 业务方法 ----

  /** 获取某市场所有信标 */
  async findByMarket(marketId: string): Promise<Beacon[]> {
    return this.beaconRepo.find({
      where: { marketId, status: 1 },
      order: { floor: 'ASC', beaconUid: 'ASC' },
    });
  }

  /** 获取某楼层所有信标 */
  async findByFloor(marketId: string, floor: number): Promise<Beacon[]> {
    return this.beaconRepo.find({
      where: { marketId, floor, status: 1 },
      order: { xPx: 'ASC', yPx: 'ASC' },
    });
  }

  /** 更新信标状态 */
  async updateStatus(id: string, status: number): Promise<Beacon> {
    const beacon = await this.beaconRepo.findOne({ where: { id } });
    if (!beacon) throw new NotFoundException('信标不存在');
    beacon.status = status;
    return this.beaconRepo.save(beacon);
  }

  /**
   * 返回该楼层信标坐标网格（用于前端三边定位）
   * 返回结构化数据，包含信标坐标和 RSSI 参考值
   */
  async getBeaconMap(marketId: string, floor: number): Promise<{
    marketId: string;
    floor: number;
    beacons: Array<{
      uid: string;
      x: number;
      y: number;
      txPower: number;
      lastSeen: string | null;
    }>;
    gridBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  }> {
    const beacons = await this.beaconRepo.find({
      where: { marketId, floor, status: 1 },
    });

    if (beacons.length === 0) {
      return {
        marketId,
        floor,
        beacons: [],
        gridBounds: null,
      };
    }

    const xs = beacons.filter(b => b.xPx != null).map(b => b.xPx);
    const ys = beacons.filter(b => b.yPx != null).map(b => b.yPx);

    return {
      marketId,
      floor,
      beacons: beacons.map(b => ({
        uid: b.beaconUid,
        x: b.xPx,
        y: b.yPx,
        txPower: b.txPower,
        lastSeen: b.lastSeen ? b.lastSeen.toISOString() : null,
      })),
      gridBounds:
        xs.length > 0 && ys.length > 0
          ? {
              minX: Math.min(...xs),
              minY: Math.min(...ys),
              maxX: Math.max(...xs),
              maxY: Math.max(...ys),
            }
          : null,
    };
  }
}
