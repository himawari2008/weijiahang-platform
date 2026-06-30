import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull } from 'typeorm';
import { MarketingActivity } from '../../database/entities/marketing-activity.entity';

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(MarketingActivity)
    private readonly activityRepo: Repository<MarketingActivity>,
  ) {}

  // Create a marketing activity
  async createActivity(shopId: string, dto: {
    activityType: string;
    name: string;
    rule?: any;
    startDate: string;
    endDate: string;
    budget?: number;
    maxCount?: number;
  }): Promise<MarketingActivity> {
    const activity = this.activityRepo.create({
      shopId,
      activityType: dto.activityType,
      name: dto.name,
      rule: dto.rule || {},
      startDate: dto.startDate,
      endDate: dto.endDate,
      budget: dto.budget || null,
      maxCount: dto.maxCount || null,
      usedCount: 0,
      status: 1,
    } as any);

    return this.activityRepo.save(activity as unknown as MarketingActivity);
  }

  // Get all activities for a shop
  async getShopActivities(shopId: string): Promise<MarketingActivity[]> {
    return this.activityRepo.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
    });
  }

  // Get currently active activities for a shop
  async getActiveActivities(shopId: string): Promise<MarketingActivity[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.activityRepo.find({
      where: {
        shopId,
        status: 1,
        startDate: LessThan(today),
        endDate: MoreThan(today),
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Pause an activity
  async pauseActivity(id: string): Promise<MarketingActivity> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('活动不存在');
    activity.status = 0;
    return this.activityRepo.save(activity as unknown as MarketingActivity);
  }

  // Resume an activity
  async resumeActivity(id: string): Promise<MarketingActivity> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('活动不存在');
    activity.status = 1;
    return this.activityRepo.save(activity as unknown as MarketingActivity);
  }

  // Delete an activity (soft delete by setting status to -1)
  async deleteActivity(id: string): Promise<void> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('活动不存在');
    activity.status = -1;
    await this.activityRepo.save(activity as unknown as MarketingActivity);
  }

  // ---- Admin 管理方法 ----

  /** 管理员：获取所有营销活动（分页） */
  async findAll(page = 1, pageSize = 20): Promise<{ items: MarketingActivity[]; total: number }> {
    const [items, total] = await this.activityRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 管理员：更新营销活动 */
  async update(id: string, dto: Partial<MarketingActivity>): Promise<MarketingActivity> {
    const activity = await this.activityRepo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('活动不存在');
    Object.assign(activity, dto);
    return this.activityRepo.save(activity as unknown as MarketingActivity);
  }

  // Get platform-wide activities (where shopId is 'platform')
  async getPlatformActivities(): Promise<MarketingActivity[]> {
    return this.activityRepo.find({
      where: { shopId: 'platform', status: 1 },
      order: { createdAt: 'DESC' },
    });
  }

  // Shop joins a platform activity
  async joinPlatformActivity(shopId: string, activityId: string): Promise<MarketingActivity> {
    const platformActivity = await this.activityRepo.findOne({ where: { id: activityId, shopId: 'platform' } });
    if (!platformActivity) throw new NotFoundException('平台活动不存在');

    // Create a copy for this shop
    const activity = this.activityRepo.create({
      shopId,
      activityType: platformActivity.activityType,
      name: platformActivity.name,
      rule: platformActivity.rule,
      startDate: platformActivity.startDate,
      endDate: platformActivity.endDate,
      budget: platformActivity.budget,
      maxCount: platformActivity.maxCount,
      usedCount: 0,
      status: 1,
    } as any);

    return this.activityRepo.save(activity as unknown as MarketingActivity);
  }
}
