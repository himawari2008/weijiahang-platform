import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { BeaconsService } from '../beacons/beacons.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('navigation')
export class NavigationController {
  constructor(
    private readonly navigationService: NavigationService,
    private readonly beaconsService: BeaconsService,
  ) {}

  // ==================== 市场地图 ====================

  /**
   * 获取市场地图数据（含楼层、信标网格、店铺坐标） — 公开
   */
  @Public()
  @Get('map/:marketId')
  async getMarketMap(
    @Param('marketId') marketId: string,
  ) {
    return this.navigationService.getMarketMap(marketId);
  }

  // ==================== 路径规划 ====================

  /**
   * 室内路径规划 — 公开
   */
  @Public()
  @Get('route/:marketId')
  async getRoute(
    @Param('marketId') marketId: string,
    @Query('floor') floor: string,
    @Query('fromX') fromX: string,
    @Query('fromY') fromY: string,
    @Query('toShopId') toShopId: string,
  ) {
    return this.navigationService.getRoute({
      marketId,
      floor: parseInt(floor, 10) || 1,
      fromX: parseFloat(fromX) || 0,
      fromY: parseFloat(fromY) || 0,
      toShopId,
    });
  }

  // ==================== 信标查询 ====================

  /**
   * 获取某市场信标信息 — 公开
   */
  @Public()
  @Get('beacons/:marketId')
  async getBeacons(
    @Param('marketId') marketId: string,
    @Query('floor') floor?: string,
  ) {
    if (floor !== undefined) {
      return this.beaconsService.getBeaconMap(marketId, parseInt(floor, 10));
    }
    return this.beaconsService.findByMarket(marketId);
  }

  // ==================== 需要认证 ====================

  /**
   * 记录用户/领航员实时位置 — 需登录
   */
  @Post('position')
  async recordPosition(@Body() body: {
    orderId?: string;
    navigatorId?: string;
    latitude: number;
    longitude: number;
    speed?: number;
    accuracy?: number;
    floor?: number;
    beaconData?: any[];
  }) {
    return this.navigationService.recordPosition(body);
  }

  /** @deprecated 使用 GET /navigation/route/:marketId */
  @Public()
  @Post('route')
  async planRoute(@Body() body: {
    marketId: string;
    from: { x: number; y: number; floor: number };
    to: { x: number; y: number; floor: number };
  }) {
    return this.navigationService.planRoute(body.marketId, body.from, body.to);
  }
}
