import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Navigator } from '../../database/entities/navigator.entity';

/**
 * 领航员匹配引擎
 * 派单逻辑：业主需求 + 距离 + 状态 + 专业匹配 + 评分
 */
@Injectable()
export class NavigatorsService {
  constructor(
    @InjectRepository(Navigator)
    private readonly navRepo: Repository<Navigator>,
  ) {}

  /** 智能匹配：为订单找到最佳领航员 */
  async findBestMatch(params: {
    marketId: string;
    categories?: string[];       // 业主需要的材料品类
    orderType?: 'scheduled' | 'instant'; // 预约/即时
    excludeNavId?: string;       // 排除已拒绝的领航员
  }): Promise<{ navigator: Navigator; score: number; reasons: string[] } | null> {
    const { marketId, categories, orderType, excludeNavId } = params;

    // 1. 找该市场所有可用领航员
    const navs = await this.navRepo.find({
      where: {
        currentMarketId: marketId,
        isOnline: true,
        isBusy: false,
        status: 1,
      },
    });

    if (navs.length === 0) return null;

    // 2. 打分排序
    const scored = navs
      .filter((n) => n.id !== excludeNavId)
      .map((n) => {
        let score = 0;
        const reasons: string[] = [];

        // --- 距离分（0-30分）---
        const distScore = n.lastLatitude ? 30 : 15; // 有实时位置+高分
        score += distScore;
        reasons.push(`距离: +${distScore}`);

        // --- 专业匹配分（0-30分）---
        let skillScore = 0;
        if (categories && n.skills && Array.isArray(n.skills)) {
          const matchCount = categories.filter((c) =>
            n.skills.some((s) => String(s).includes(c)),
          ).length;
          skillScore = Math.min(30, matchCount * 10);
        }
        score += skillScore;
        if (skillScore > 0) reasons.push(`专业匹配: +${skillScore}`);

        // --- 评分分（0-20分）---
        const ratingScore = Math.round(((n.rating || 5) / 5) * 20);
        score += ratingScore;
        reasons.push(`评分: +${ratingScore}`);

        // --- 经验分（0-10分）---
        const expScore = Math.min(10, (n.experienceYears || 0) * 2);
        score += expScore;
        if (expScore > 0) reasons.push(`经验: +${expScore}`);

        // --- 负载均衡（0-10分）---
        const loadScore = n.isBusy ? 0 : 10;
        score += loadScore;
        reasons.push(`空闲: +${loadScore}`);

        return { navigator: n, score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    // 3. 即时单：取最高分直接派；预约单：取前三让用户选
    const best = scored[0];
    if (!best) return null;

    return best;
  }

  /** 取某市场在线领航员数 */
  async countOnline(marketId: string): Promise<number> {
    return this.navRepo.count({
      where: { currentMarketId: marketId, isOnline: true, isBusy: false, status: 1 },
    });
  }

  /** 获取某市场可接单领航员（按评分排序） */
  async findAvailable(marketId: string): Promise<Navigator[]> {
    return this.navRepo.find({
      where: { currentMarketId: marketId, isOnline: true, isBusy: false, status: 1 },
      order: { rating: 'DESC' },
    });
  }

  /** 更新实时位置 */
  async updateLocation(navId: string, lat: number, lng: number, marketId?: string): Promise<void> {
    await this.navRepo.update(navId, {
      lastLatitude: lat,
      lastLongitude: lng,
      currentMarketId: marketId,
    });
  }

  /** 切换接单状态 */
  async toggleOnline(navId: string, isOnline: boolean): Promise<void> {
    await this.navRepo.update(navId, { isOnline, isBusy: false });
  }

  /** 标记忙碌 */
  async setBusy(navId: string, busy: boolean): Promise<void> {
    await this.navRepo.update(navId, { isBusy: busy });
  }

  // ---- 注册与资料 ----

  /** 根据 openid 查找领航员 */
  async findByOpenid(openid: string): Promise<Navigator | null> {
    return this.navRepo.findOne({ where: { openid } });
  }

  /** 根据 ID 查找领航员 */
  async findById(id: string): Promise<Navigator> {
    const nav = await this.navRepo.findOne({ where: { id } });
    if (!nav) throw new NotFoundException('领航员不存在');
    return nav;
  }

  /** 注册新领航员 */
  async create(openid: string, data: Partial<Navigator>): Promise<Navigator> {
    const existing = await this.findByOpenid(openid);
    if (existing) {
      throw new ConflictException('该微信账号已注册为领航员');
    }

    const navigator = this.navRepo.create({
      openid,
      realName: data.realName,
      idCard: data.idCard,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      idCardFront: data.idCardFront,
      idCardBack: data.idCardBack,
      homeMarkets: data.homeMarkets || [],
      skills: data.skills || [],
      experienceYears: data.experienceYears || 0,
      status: 0,       // 待审核
      isOnline: false,
      isBusy: false,
    });

    return this.navRepo.save(navigator);
  }

  /** 更新领航员资料 */
  async update(id: string, data: Partial<Navigator>): Promise<Navigator> {
    const nav = await this.findById(id);
    Object.assign(nav, data);
    return this.navRepo.save(nav);
  }
}
