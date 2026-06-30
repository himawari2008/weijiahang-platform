import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { NavigatorTier } from '../../database/entities/navigator-tier.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { NavigatorsService } from '../navigators/navigators.service';

// Tier thresholds
const TIER_THRESHOLDS = [
  { level: 1, name: '青铜', minOrders: 0, minRating: 0, minMonths: 0, commission: 20, weight: 1.0 },
  { level: 2, name: '白银', minOrders: 20, minRating: 4.5, minMonths: 1, commission: 18, weight: 1.2 },
  { level: 3, name: '黄金', minOrders: 50, minRating: 4.6, minMonths: 3, commission: 15, weight: 1.5 },
  { level: 4, name: '铂金', minOrders: 100, minRating: 4.7, minMonths: 6, commission: 12, weight: 1.8 },
  { level: 5, name: '钻石', minOrders: 200, minRating: 4.8, minMonths: 12, commission: 10, weight: 2.0 },
];

@Injectable()
export class NavigatorTierService {
  constructor(
    @InjectRepository(NavigatorTier)
    private readonly tierRepo: Repository<NavigatorTier>,
    @InjectRepository(Navigator)
    private readonly navRepo: Repository<Navigator>,
    private readonly navigatorsService: NavigatorsService,
  ) {}

  // Calculate tier based on navigator stats
  async calculateTier(navigatorId: string): Promise<{
    currentLevel: number;
    tierName: string;
    nextTier: { level: number; name: string; ordersNeeded: number; ratingNeeded: number; monthsNeeded: number } | null;
    progress: { orders: number; rating: number; exp: number };
    commissionRate: number;
    dispatchWeight: number;
  }> {
    const nav = await this.navigatorsService.findById(navigatorId);

    // Calculate experience months from verifiedAt (createdAt as proxy)
    const monthsActive = nav.createdAt
      ? Math.floor((Date.now() - nav.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0;

    const rating = nav.rating || 0;
    const completedOrders = nav.completeOrders || 0;

    // Find highest eligible tier
    let currentTier = TIER_THRESHOLDS[0];
    for (const tier of TIER_THRESHOLDS) {
      if (
        completedOrders >= tier.minOrders &&
        rating >= tier.minRating &&
        monthsActive >= tier.minMonths
      ) {
        currentTier = tier;
      }
    }

    // Find next tier
    const nextTierIdx = TIER_THRESHOLDS.findIndex(t => t.level === currentTier.level);
    const nextTier = nextTierIdx < TIER_THRESHOLDS.length - 1 ? TIER_THRESHOLDS[nextTierIdx + 1] : null;

    // Calculate progress towards next tier
    const ordersProgress = nextTier ? Math.min(100, Math.round((completedOrders / nextTier.minOrders) * 100)) : 100;
    const ratingProgress = nextTier ? Math.min(100, Math.round((rating / nextTier.minRating) * 100)) : 100;
    const expProgress = nextTier ? Math.min(100, Math.round((monthsActive / nextTier.minMonths) * 100)) : 100;

    return {
      currentLevel: currentTier.level,
      tierName: currentTier.name,
      nextTier: nextTier ? {
        level: nextTier.level,
        name: nextTier.name,
        ordersNeeded: Math.max(0, nextTier.minOrders - completedOrders),
        ratingNeeded: Math.max(0, nextTier.minRating - rating),
        monthsNeeded: Math.max(0, nextTier.minMonths - monthsActive),
      } : null,
      progress: { orders: ordersProgress, rating: ratingProgress, exp: expProgress },
      commissionRate: currentTier.commission,
      dispatchWeight: currentTier.weight,
    };
  }

  // Evaluate and update tier record
  async evaluateAndUpdate(navigatorId: string): Promise<NavigatorTier> {
    const tierInfo = await this.calculateTier(navigatorId);
    const nav = await this.navigatorsService.findById(navigatorId);

    const monthsActive = nav.createdAt
      ? Math.floor((Date.now() - nav.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0;

    // Check if record exists
    let tierRecord = await this.tierRepo.findOne({ where: { navigatorId } });

    if (tierRecord) {
      const wasDemoted = tierRecord.currentLevel > tierInfo.currentLevel;

      tierRecord.currentLevel = tierInfo.currentLevel;
      tierRecord.currentTierName = tierInfo.tierName;
      tierRecord.totalScore = (nav.completeOrders || 0) + (nav.rating || 0) * 10;
      tierRecord.ordersProgress = tierInfo.progress.orders;
      tierRecord.ratingProgress = tierInfo.progress.rating;
      tierRecord.expProgress = tierInfo.progress.exp;

      if (wasDemoted) {
        tierRecord.demotedAt = new Date();
        tierRecord.promotedAt = null as any;
      } else if (tierRecord.currentLevel > (tierRecord.currentLevel - 1)) {
        tierRecord.promotedAt = new Date();
        tierRecord.demotedAt = null as any;
      }

      return this.tierRepo.save(tierRecord as unknown as NavigatorTier);
    }

    // Create new record
    const newTier = this.tierRepo.create({
      navigatorId,
      currentLevel: tierInfo.currentLevel,
      currentTierName: tierInfo.tierName,
      totalScore: (nav.completeOrders || 0) + (nav.rating || 0) * 10,
      ordersProgress: tierInfo.progress.orders,
      ratingProgress: tierInfo.progress.rating,
      expProgress: tierInfo.progress.exp,
      promotedAt: new Date(),
    } as any);

    return this.tierRepo.save(newTier as unknown as NavigatorTier);
  }

  // Get tier info
  async getTierInfo(navigatorId: string): Promise<{
    tier: NavigatorTier | null;
    calculation: any;
  }> {
    const tier = await this.tierRepo.findOne({ where: { navigatorId } });
    const calculation = await this.calculateTier(navigatorId);
    return { tier, calculation };
  }

  // Get all tiers (admin)
  async getAllTiers(): Promise<NavigatorTier[]> {
    return this.tierRepo.find({ order: { totalScore: 'DESC' } });
  }

  // Batch update all verified navigators' tiers daily at 3am
  @Cron('0 3 * * *')
  async batchUpdateTiers(): Promise<void> {
    const navs = await this.navRepo.find({ where: { status: 1 } });
    for (const nav of navs) {
      try {
        await this.evaluateAndUpdate(nav.id);
      } catch (e) {
        // Skip errors for individual navigators
        continue;
      }
    }
  }
}
