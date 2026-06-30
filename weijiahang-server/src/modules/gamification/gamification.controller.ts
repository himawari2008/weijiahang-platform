import { Controller, Get, Post, Param } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /** 获取领航员勋章 — 公开 */
  @Public()
  @Get('badges/:navigatorId')
  async getBadges(@Param('navigatorId') navigatorId: string) {
    return this.gamificationService.getBadges(navigatorId);
  }

  /** 检查并授予勋章 — 需登录 */
  @Post('check/:navigatorId')
  async checkBadges(@Param('navigatorId') navigatorId: string) {
    await this.gamificationService.checkAllBadges(navigatorId);
    return { success: true };
  }

  /** 手动授予勋章 — 需登录 */
  @Post('award/:navigatorId/:badgeKey')
  async awardBadge(
    @Param('navigatorId') navigatorId: string,
    @Param('badgeKey') badgeKey: string,
  ) {
    return this.gamificationService.awardBadge(navigatorId, badgeKey);
  }
}
