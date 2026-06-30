import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('shop/:shopId')
  async getShopAnalytics(
    @Param('shopId') shopId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getShopAnalytics(shopId, dateFrom, dateTo);
  }

  @Get('navigator/:navigatorId')
  async getNavigatorAnalytics(@Param('navigatorId') navigatorId: string) {
    return this.analyticsService.getNavigatorAnalytics(navigatorId);
  }

  @Get('platform')
  async getPlatformStats() {
    return this.analyticsService.getPlatformStats();
  }
}
