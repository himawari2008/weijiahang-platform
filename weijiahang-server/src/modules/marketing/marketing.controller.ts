import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  /** 创建营销活动 — 需登录 */
  @Post('activities')
  async createActivity(
    @Body('shopId') shopId: string,
    @Body() dto: any,
  ) {
    return this.marketingService.createActivity(shopId, dto);
  }

  /** 店铺活动列表 — 公开 */
  @Public()
  @Get('activities/:shopId')
  async getShopActivities(@Param('shopId') shopId: string) {
    return this.marketingService.getShopActivities(shopId);
  }

  /** 暂停活动 — 需登录 */
  @Put('activities/:id/pause')
  async pauseActivity(@Param('id') id: string) {
    return this.marketingService.pauseActivity(id);
  }

  /** 恢复活动 — 需登录 */
  @Put('activities/:id/resume')
  async resumeActivity(@Param('id') id: string) {
    return this.marketingService.resumeActivity(id);
  }

  /** 更新营销活动 — 需登录 */
  @Put('activities/:id')
  async updateActivity(@Param('id') id: string, @Body() dto: any) {
    return this.marketingService.update(id, dto);
  }

  /** 删除营销活动 — 需登录 */
  @Delete('activities/:id')
  async deleteActivity(@Param('id') id: string) {
    await this.marketingService.deleteActivity(id);
    return { message: '活动已删除' };
  }

  /** 平台活动列表 — 公开 */
  @Public()
  @Get('platform')
  async getPlatformActivities() {
    return this.marketingService.getPlatformActivities();
  }

  /** 参加平台活动 — 需登录 */
  @Post('platform/:id/join')
  async joinPlatformActivity(
    @Param('id') id: string,
    @Body('shopId') shopId: string,
  ) {
    return this.marketingService.joinPlatformActivity(shopId, id);
  }
}
