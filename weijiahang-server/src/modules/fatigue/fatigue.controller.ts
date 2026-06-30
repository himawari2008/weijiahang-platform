import { Controller, Get, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { FatigueService } from './fatigue.service';

@Controller('fatigue')
export class FatigueController {
  constructor(private readonly fatigueService: FatigueService) {}

  /**
   * 领航员上线（记录开始）
   * POST /fatigue/online?navigatorId=
   */
  @Post('online')
  async online(navigatorId: string) {
    const record = await this.fatigueService.recordOnline(navigatorId);
    return { message: '上线记录已创建', recordId: record.id };
  }

  /**
   * 领航员下线（记录结束）
   * POST /fatigue/offline?navigatorId=
   */
  @Post('offline')
  async offline(navigatorId: string) {
    const record = await this.fatigueService.recordOffline(navigatorId);
    return { message: '下线记录已更新', totalMinutes: record?.totalMinutes || 0 };
  }

  /**
   * 获取今日在线统计
   * GET /fatigue/today/:navigatorId
   */
  @Get('today/:navigatorId')
  async todayStats(@Param('navigatorId', ParseUUIDPipe) navigatorId: string) {
    const checkResult = await this.fatigueService.checkAndWarn(navigatorId);
    return {
      navigatorId,
      ...checkResult,
    };
  }

  /**
   * 检查休息奖励资格
   * GET /fatigue/rest-reward/:navigatorId
   */
  @Get('rest-reward/:navigatorId')
  async restReward(@Param('navigatorId', ParseUUIDPipe) navigatorId: string) {
    return this.fatigueService.getRestReward(navigatorId);
  }

  /**
   * 获取月度在线统计
   * GET /fatigue/monthly/:navigatorId
   */
  @Get('monthly/:navigatorId')
  async monthlyStats(@Param('navigatorId', ParseUUIDPipe) navigatorId: string) {
    return this.fatigueService.getMonthlyStats(navigatorId);
  }

  /**
   * 执行疲劳检查
   * POST /fatigue/check/:navigatorId
   */
  @Post('check/:navigatorId')
  async check(@Param('navigatorId', ParseUUIDPipe) navigatorId: string) {
    return this.fatigueService.checkAndWarn(navigatorId);
  }
}
