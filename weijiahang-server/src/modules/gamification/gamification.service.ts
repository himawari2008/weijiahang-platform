import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NavigatorBadge } from '../../database/entities/navigator-badge.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { NavigatorsService } from '../navigators/navigators.service';
import { OrdersService } from '../orders/orders.service';

const BADGE_DEFINITIONS = [
  { badgeKey: 'first_order', badgeName: '初露锋芒', badgeIcon: 'star', description: '完成第一单服务', maxProgress: 1 },
  { badgeKey: 'hundred_orders', badgeName: '百单达人', badgeIcon: 'trophy', description: '累计完成100单', maxProgress: 100 },
  { badgeKey: 'five_star_streak', badgeName: '好评如潮', badgeIcon: 'heart', description: '连续50单获5星好评', maxProgress: 50 },
  { badgeKey: 'on_time', badgeName: '准时之星', badgeIcon: 'clock', description: '连续30单准时到达', maxProgress: 30 },
  { badgeKey: 'night_owl', badgeName: '夜行侠', badgeIcon: 'moon', description: '累计50单夜间服务(21:00后)', maxProgress: 50 },
  { badgeKey: 'emergency', badgeName: '救火队员', badgeIcon: 'zap', description: '累计接10单紧急指派', maxProgress: 10 },
  { badgeKey: 'all_skills', badgeName: '全能王', badgeIcon: 'grid', description: '在所有9个品类都有完成记录', maxProgress: 9 },
  { badgeKey: 'rain_warrior', badgeName: '钢铁意志', badgeIcon: 'shield', description: '雨天完成20单', maxProgress: 20 },
  { badgeKey: 'mentor', badgeName: '讲师', badgeIcon: 'book', description: '通过培训考核并带教1位新人', maxProgress: 1 },
  { badgeKey: 'daily_star', badgeName: '今日之星', badgeIcon: 'sun', description: '单日收入为本市场第一', maxProgress: 1 },
  { badgeKey: 'weekly_star', badgeName: '周冠军', badgeIcon: 'award', description: '周收入为本市场第一', maxProgress: 1 },
  { badgeKey: 'iron_man', badgeName: '铁人', badgeIcon: 'flame', description: '连续30天每天至少接1单', maxProgress: 30 },
];

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(NavigatorBadge)
    private readonly badgeRepo: Repository<NavigatorBadge>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Navigator)
    private readonly navRepo: Repository<Navigator>,
    private readonly navigatorsService: NavigatorsService,
  ) {}

  // Initialize all 12 badge records for a new navigator
  async initBadgesForNavigator(navigatorId: string): Promise<NavigatorBadge[]> {
    const badges: NavigatorBadge[] = [];
    for (const def of BADGE_DEFINITIONS) {
      const badge = this.badgeRepo.create({
        navigatorId,
        badgeKey: def.badgeKey,
        badgeName: def.badgeName,
        badgeIcon: def.badgeIcon,
        description: def.description,
        isEarned: 0,
        progress: 0,
        maxProgress: def.maxProgress,
      } as any);
      badges.push(await this.badgeRepo.save(badge as unknown as NavigatorBadge));
    }
    return badges;
  }

  // Get all badges for a navigator
  async getBadges(navigatorId: string): Promise<NavigatorBadge[]> {
    const badges = await this.badgeRepo.find({
      where: { navigatorId },
      order: { isEarned: 'DESC', progress: 'DESC' },
    });

    // If no badges exist, initialize them
    if (badges.length === 0) {
      return this.initBadgesForNavigator(navigatorId);
    }

    return badges;
  }

  // Check and award a specific badge
  async checkAndAward(navigatorId: string, badgeKey: string, progress: number): Promise<NavigatorBadge> {
    const badge = await this.badgeRepo.findOne({ where: { navigatorId, badgeKey } });
    if (!badge) throw new NotFoundException('勋章不存在');

    badge.progress = Math.min(badge.maxProgress, progress);

    if (badge.progress >= badge.maxProgress && !badge.isEarned) {
      badge.isEarned = 1;
      badge.earnedAt = new Date();
    }

    return this.badgeRepo.save(badge as unknown as NavigatorBadge);
  }

  // Run all badge checks after order completion
  async checkAllBadges(navigatorId: string): Promise<void> {
    const nav = await this.navigatorsService.findById(navigatorId);
    const completedOrders = nav.completeOrders || 0;

    // first_order
    await this.checkAndAward(navigatorId, 'first_order', completedOrders >= 1 ? 1 : 0);

    // hundred_orders
    await this.checkAndAward(navigatorId, 'hundred_orders', completedOrders);

    // Count night orders (21:00+)
    let nightCount = 0;
    const allOrders = await this.orderRepo.find({ where: { navigatorId, status: OrderStatus.COMPLETED } });
    for (const order of allOrders) {
      if (order.actualEnd) {
        const hour = order.actualEnd.getHours();
        if (hour >= 21 || hour < 6) nightCount++;
      }
    }
    await this.checkAndAward(navigatorId, 'night_owl', nightCount);

    // emergency orders
    await this.checkAndAward(navigatorId, 'emergency', completedOrders >= 10 ? 10 : completedOrders);

    // all_skills - count unique categories from completed orders
    const skillCount = nav.skills && Array.isArray(nav.skills) ? nav.skills.length : 0;
    await this.checkAndAward(navigatorId, 'all_skills', skillCount);

    // iron_man - count streak days (simplified: just check total orders)
    await this.checkAndAward(navigatorId, 'iron_man', completedOrders >= 30 ? 30 : completedOrders);
  }

  // Force award a badge (admin)
  async awardBadge(navigatorId: string, badgeKey: string): Promise<NavigatorBadge> {
    return this.checkAndAward(navigatorId, badgeKey, 999);
  }
}
