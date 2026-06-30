import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from '../../database/entities/market.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';

/** 城市配置中单个城市的形状 */
export interface CityEntry {
  name: string;
  status: number;       // 1=已开通 0=预置未开通
  sortOrder: number;
  province: string;
  geoCenter: { lat: number; lng: number };
}

/** city_config 整体结构 */
export interface CityConfig {
  cities: CityEntry[];
  defaultCity: string;
}

@Injectable()
export class MarketsService {
  constructor(
    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
  ) {}

  /** 获取所有可用市场 */
  async findAll(): Promise<Market[]> {
    return this.marketRepo.find({
      where: { status: 1 },
      order: { name: 'ASC' },
    });
  }

  /** 按城市筛选市场 */
  async findByCity(city: string): Promise<Market[]> {
    return this.marketRepo.find({
      where: { city, status: 1 },
    });
  }

  /** 市场详情（含楼层信息） */
  async findById(id: string): Promise<Market> {
    return this.marketRepo.findOneOrFail({ where: { id, status: 1 } });
  }

  /** 管理员：创建市场 */
  async create(dto: Partial<Market>): Promise<Market> {
    const market = this.marketRepo.create(dto as any);
    return this.marketRepo.save(market as unknown as Market);
  }

  /** 管理员：更新市场 */
  async update(id: string, dto: Partial<Market>): Promise<Market> {
    const market = await this.marketRepo.findOne({ where: { id } });
    if (!market) throw new NotFoundException('市场不存在');
    Object.assign(market, dto);
    return this.marketRepo.save(market as unknown as Market);
  }

  /** 管理员：获取全部市场（含禁用） */
  async findAllForAdmin(page = 1, pageSize = 50): Promise<{ items: Market[]; total: number; page: number; pageSize: number }> {
    const [items, total] = await this.marketRepo.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  /** 管理员：删除市场 */
  async remove(id: string): Promise<void> {
    const market = await this.marketRepo.findOne({ where: { id } });
    if (!market) throw new NotFoundException('市场不存在');
    await this.marketRepo.remove(market);
  }

  // ==================== 多城市支持 ====================

  /**
   * 获取所有已开通的城市列表（从 SystemConfig 的 city_config 读取）
   * 前端城市选择页 / 首页城市切换 统一数据源
   */
  async getActiveCities(): Promise<CityConfig> {
    const config = await this.systemConfigRepo.findOne({
      where: { configKey: 'city_config' },
    });

    if (!config) {
      // 未配置时返回默认单城市（兼容旧版）
      return {
        cities: [
          { name: '西安', status: 1, sortOrder: 1, province: '陕西', geoCenter: { lat: 34.299, lng: 108.947 } },
        ],
        defaultCity: '西安',
      };
    }

    const cityConfig = config.configValue as unknown as CityConfig;
    return cityConfig;
  }

  /**
   * 获取单个城市配置详情
   */
  async getCityDetail(cityName: string): Promise<CityEntry | null> {
    const config = await this.getActiveCities();
    return config.cities.find(c => c.name === cityName) || null;
  }
}
