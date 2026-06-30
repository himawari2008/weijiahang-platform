import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Ad, AdType } from '../../database/entities/ad.entity';
import { CreateAdDto } from './dto/create-ad.dto';

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(Ad)
    private readonly adRepo: Repository<Ad>,
  ) {}

  /** 创建推广计划 */
  async create(dto: CreateAdDto): Promise<Ad> {
    const ad = this.adRepo.create({
      shopId: dto.shopId,
      adType: dto.adType,
      adPosition: dto.adPosition,
      budget: dto.budget ?? null,
      dailyBudget: dto.dailyBudget ?? null,
      cpcBid: dto.cpcBid ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      impressions: 0,
      clicks: 0,
      spent: 0,
      status: 1,
    } as any);

    return this.adRepo.save(ad as unknown as Ad);
  }

  /** 获取某位置当前投放中的广告（按CPC出价降序） */
  async getActiveAds(position: string): Promise<Ad[]> {
    const today = new Date().toISOString().slice(0, 10);

    return this.adRepo.find({
      where: {
        adPosition: position,
        status: 1,
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      order: { cpcBid: 'DESC' },
      relations: ['shop'],
    });
  }

  /** 记录展示+1 */
  async recordImpression(adId: string): Promise<Ad> {
    const ad = await this.adRepo.findOne({ where: { id: adId } });
    if (!ad) throw new NotFoundException('广告不存在');

    ad.impressions += 1;
    return this.adRepo.save(ad);
  }

  /** 记录点击+1，扣费 */
  async recordClick(adId: string): Promise<Ad> {
    const ad = await this.adRepo.findOne({ where: { id: adId } });
    if (!ad) throw new NotFoundException('广告不存在');
    if (ad.status !== 1) {
      throw new BadRequestException('广告已暂停或结束');
    }

    ad.clicks += 1;

    // CPC 模式：按出价扣费
    if (ad.adType === AdType.CPC && ad.cpcBid) {
      const cost = ad.cpcBid;

      // 检查总预算
      if (ad.budget !== null && ad.spent + cost > ad.budget) {
        throw new BadRequestException('推广预算已耗尽');
      }

      // 检查日预算
      if (ad.dailyBudget !== null) {
        const todaySpent = await this.getTodaySpent(adId);
        if (todaySpent + cost > ad.dailyBudget) {
          throw new BadRequestException('今日预算已耗尽');
        }
      }

      ad.spent = parseFloat((Number(ad.spent) + Number(cost)).toFixed(2));
    }

    return this.adRepo.save(ad);
  }

  /** 商户查看自己的推广 */
  async getShopAds(shopId: string): Promise<Ad[]> {
    return this.adRepo.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 暂停/恢复推广 */
  async pauseResume(adId: string, status: number): Promise<Ad> {
    if (![0, 1].includes(status)) {
      throw new BadRequestException('状态值无效，仅支持 0（暂停）或 1（启用）');
    }

    const ad = await this.adRepo.findOne({ where: { id: adId } });
    if (!ad) throw new NotFoundException('广告不存在');

    ad.status = status;
    return this.adRepo.save(ad);
  }

  // ---- Admin 管理方法 ----

  /** 管理员：获取所有广告（分页） */
  async findAll(page = 1, pageSize = 20): Promise<{ items: Ad[]; total: number }> {
    const [items, total] = await this.adRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['shop'],
    });
    return { items, total };
  }

  /** 管理员：更新广告 */
  async update(id: string, dto: Partial<Ad>): Promise<Ad> {
    const ad = await this.adRepo.findOne({ where: { id } });
    if (!ad) throw new NotFoundException('广告不存在');
    Object.assign(ad, dto);
    return this.adRepo.save(ad);
  }

  /** 管理员：删除广告（软删除） */
  async remove(id: string): Promise<void> {
    const ad = await this.adRepo.findOne({ where: { id } });
    if (!ad) throw new NotFoundException('广告不存在');
    ad.status = -1;
    await this.adRepo.save(ad);
  }

  // ---- 私有方法 ----

  /** 获取今日已花费金额 */
  private async getTodaySpent(adId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);

    // 简单方案：从每日花费累计（后续可建 daily_spent 表做精确统计）
    // 这里简化处理，按平均每日花费估算
    const ad = await this.adRepo.findOne({ where: { id: adId } });
    if (!ad) return 0;

    const start = new Date(ad.startDate);
    const now = new Date();
    const daysRunning = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86400000));

    return Number(ad.spent) / daysRunning;
  }
}
