import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { NavigatorOnlineRecord } from '../../database/entities/navigator-online-record.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { OrdersGateway } from '../orders/orders.gateway';

/** 警告阈值：4小时（240分钟）*/
const WARN_THRESHOLD = 240;
/** 强制下线阈值：12小时（720分钟）*/
const FORCE_OFFLINE_THRESHOLD = 720;
/** 休息奖励条件：离线至少2小时（120分钟）*/
const REST_REWARD_MIN_OFFLINE = 120;
/** 休息奖励金额 */
const REST_REWARD_AMOUNT = 5;

@Injectable()
export class FatigueService {
  private readonly logger = new Logger(FatigueService.name);
  /** 已提醒过疲劳的领航员（避免重复提醒） */
  private warnedNavigators = new Set<string>();

  constructor(
    @InjectRepository(NavigatorOnlineRecord)
    private readonly recordRepo: Repository<NavigatorOnlineRecord>,

    @InjectRepository(Navigator)
    private readonly navigatorRepo: Repository<Navigator>,

    private readonly ordersGateway: OrdersGateway,
  ) {}

  /**
   * 记录领航员上线
   */
  async recordOnline(navId: string): Promise<NavigatorOnlineRecord> {
    const record = this.recordRepo.create({
      navigatorId: navId,
      onlineAt: new Date(),
      totalMinutes: 0,
      isForcedOffline: 0,
    } as any);

    const saved = await this.recordRepo.save(record as unknown as NavigatorOnlineRecord);
    this.logger.log(`领航员 ${navId} 上线记录已创建: ${saved.id}`);
    return saved;
  }

  /**
   * 记录领航员下线（更新offlineAt和totalMinutes）
   */
  async recordOffline(navId: string): Promise<NavigatorOnlineRecord | null> {
    // 找到最近一条未下线记录
    const latestRecord = await this.recordRepo.findOne({
      where: { navigatorId: navId, offlineAt: IsNull() },
      order: { onlineAt: 'DESC' },
    });

    if (!latestRecord) {
      this.logger.warn(`领航员 ${navId} 无进行中的在线记录`);
      return null;
    }

    const now = new Date();
    const onlineMs = now.getTime() - new Date(latestRecord.onlineAt).getTime();
    const totalMinutes = Math.floor(onlineMs / 60000);

    latestRecord.offlineAt = now;
    latestRecord.totalMinutes = totalMinutes;
    await this.recordRepo.save(latestRecord as unknown as NavigatorOnlineRecord);

    // 清理警告缓存
    this.warnedNavigators.delete(navId);

    this.logger.log(`领航员 ${navId} 下线记录已更新，本次在线 ${totalMinutes} 分钟`);
    return latestRecord;
  }

  /**
   * 获取今日累计在线时长（分钟）
   */
  async getTodayOnlineMinutes(navId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const records = await this.recordRepo.find({
      where: {
        navigatorId: navId,
        onlineAt: Between(todayStart, todayEnd),
      },
    });

    let totalMinutes = 0;
    for (const record of records) {
      if (record.offlineAt) {
        // 已下线记录：直接使用已计算的分钟数
        totalMinutes += record.totalMinutes;
      } else {
        // 当前在线记录：实时计算
        const ms = Date.now() - new Date(record.onlineAt).getTime();
        totalMinutes += Math.floor(ms / 60000);
      }
    }

    return totalMinutes;
  }

  /**
   * 检查领航员疲劳状态并提醒/强制下线
   * 返回: { isWarned: boolean, isForced: boolean, todayMinutes: number }
   */
  async checkAndWarn(navId: string): Promise<{
    isWarned: boolean;
    isForced: boolean;
    todayMinutes: number;
    message: string;
  }> {
    const todayMinutes = await this.getTodayOnlineMinutes(navId);

    // 强制下线（>= 12小时）
    if (todayMinutes >= FORCE_OFFLINE_THRESHOLD) {
      const message = `您今日已在线 ${todayMinutes} 分钟（超过 ${FORCE_OFFLINE_THRESHOLD} 分钟），系统已强制您下线休息`;
      this.ordersGateway.notifyFatigueWarning(navId, 'force_offline', message);

      // 更新领航员状态
      await this.navigatorRepo.update({ id: navId }, { isOnline: false });

      // 关闭当前在线记录
      const latestRecord = await this.recordRepo.findOne({
        where: { navigatorId: navId, offlineAt: IsNull() },
        order: { onlineAt: 'DESC' },
      });
      if (latestRecord) {
        latestRecord.offlineAt = new Date();
        latestRecord.totalMinutes = todayMinutes;
        latestRecord.isForcedOffline = 1;
        await this.recordRepo.save(latestRecord as unknown as NavigatorOnlineRecord);
      }

      this.warnedNavigators.delete(navId);
      this.logger.warn(`领航员 ${navId} 被强制下线（今日在线 ${todayMinutes} 分钟）`);

      return { isWarned: false, isForced: true, todayMinutes, message };
    }

    // 疲劳提醒（>= 4小时）— 避免重复提醒
    if (todayMinutes >= WARN_THRESHOLD && !this.warnedNavigators.has(navId)) {
      this.warnedNavigators.add(navId);
      const message = `您今日已连续工作 ${todayMinutes} 分钟，建议休息一下，离线满2小时可获 ${REST_REWARD_AMOUNT} 元奖励`;
      this.ordersGateway.notifyFatigueWarning(navId, 'rest_reminder', message);
      this.logger.log(`领航员 ${navId} 疲劳提醒（今日在线 ${todayMinutes} 分钟）`);

      return { isWarned: true, isForced: false, todayMinutes, message };
    }

    return { isWarned: false, isForced: false, todayMinutes, message: `今日在线 ${todayMinutes} 分钟` };
  }

  /**
   * 检查休息奖励资格
   */
  async getRestReward(navId: string): Promise<{
    eligible: boolean;
    reason: string;
    rewardAmount: number;
  }> {
    // 查找最近一次离线记录
    const lastRecord = await this.recordRepo.findOne({
      where: { navigatorId: navId, offlineAt: IsNull() },
      order: { onlineAt: 'DESC' },
    });

    if (lastRecord) {
      return { eligible: false, reason: '当前仍为在线状态，请先下线', rewardAmount: 0 };
    }

    const lastOfflineRecord = await this.recordRepo.findOne({
      where: { navigatorId: navId },
      order: { offlineAt: 'DESC' },
    });

    if (!lastOfflineRecord || !lastOfflineRecord.offlineAt) {
      return { eligible: false, reason: '无离线记录', rewardAmount: 0 };
    }

    const offlineDurationMs = Date.now() - new Date(lastOfflineRecord.offlineAt).getTime();
    const offlineMinutes = Math.floor(offlineDurationMs / 60000);

    if (offlineMinutes >= REST_REWARD_MIN_OFFLINE) {
      return {
        eligible: true,
        reason: `已离线 ${offlineMinutes} 分钟，满足 ${REST_REWARD_MIN_OFFLINE} 分钟奖励条件`,
        rewardAmount: REST_REWARD_AMOUNT,
      };
    }

    const remainingMinutes = REST_REWARD_MIN_OFFLINE - offlineMinutes;
    return {
      eligible: false,
      reason: `还需离线 ${remainingMinutes} 分钟方可获得休息奖励`,
      rewardAmount: 0,
    };
  }

  /**
   * 定时任务：每5分钟检查所有在线领航员疲劳状态
   */
  @Cron('*/5 * * * *')
  async scheduledFatigueCheck() {
    this.logger.log('疲劳检测定时任务执行...');

    // 查找所有在线领航员
    const onlineNavigators = await this.navigatorRepo.find({
      where: { isOnline: true },
    });

    for (const nav of onlineNavigators) {
      try {
        await this.checkAndWarn(nav.id);
      } catch (err) {
        this.logger.error(`疲劳检测出错（领航员 ${nav.id}）: ${err}`);
      }
    }

    this.logger.log(`疲劳检测完成，共检查 ${onlineNavigators.length} 位在线领航员`);
  }

  /**
   * 获取领航员最近30天的在线统计
   */
  async getMonthlyStats(navId: string): Promise<{
    totalDays: number;
    totalMinutes: number;
    avgDailyMinutes: number;
    forcedOfflineCount: number;
    records: { date: string; minutes: number }[];
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.recordRepo.find({
      where: {
        navigatorId: navId,
        onlineAt: Between(thirtyDaysAgo, new Date()),
      },
      order: { onlineAt: 'ASC' },
    });

    // 按天汇总
    const dailyMap = new Map<string, number>();
    let forcedOfflineCount = 0;

    for (const record of records) {
      const day = new Date(record.onlineAt).toISOString().slice(0, 10);
      const minutes = record.offlineAt
        ? record.totalMinutes
        : Math.floor((Date.now() - new Date(record.onlineAt).getTime()) / 60000);

      dailyMap.set(day, (dailyMap.get(day) || 0) + minutes);

      if (record.isForcedOffline) {
        forcedOfflineCount++;
      }
    }

    const dailyData = Array.from(dailyMap.entries()).map(([date, minutes]) => ({
      date,
      minutes,
    }));

    const totalMinutes = dailyData.reduce((sum, d) => sum + d.minutes, 0);
    const totalDays = dailyData.length;

    return {
      totalDays,
      totalMinutes,
      avgDailyMinutes: totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0,
      forcedOfflineCount,
      records: dailyData,
    };
  }
}
