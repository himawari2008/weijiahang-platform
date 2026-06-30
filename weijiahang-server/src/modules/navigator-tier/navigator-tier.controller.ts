import { Controller, Get, Post, Param } from '@nestjs/common';
import { NavigatorTierService } from './navigator-tier.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('navigator-tier')
export class NavigatorTierController {
  constructor(private readonly tierService: NavigatorTierService) {}

  /** 获取指定领航员等级 — 公开 */
  @Public()
  @Get(':navigatorId')
  async getTierInfo(@Param('navigatorId') navigatorId: string) {
    return this.tierService.getTierInfo(navigatorId);
  }

  /** 获取所有等级定义 — 公开 */
  @Public()
  @Get()
  async getAllTiers() {
    return this.tierService.getAllTiers();
  }

  /** 重新计算等级 — 需登录 */
  @Post(':navigatorId/recalculate')
  async recalculate(@Param('navigatorId') navigatorId: string) {
    return this.tierService.evaluateAndUpdate(navigatorId);
  }
}
