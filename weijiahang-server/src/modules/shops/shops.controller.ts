import { Controller, Get, Put, Post, Body, Query, Param, Req } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { QueryShopDto } from './dto/query-shop.dto';
import { Public } from '../../common/decorators/public.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  // ==================== 商户端接口（需登录） ====================

  /** 获取当前商户的店铺 */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMine(@Req() req: any) {
    return this.shopsService.getMine(req.user.userId);
  }

  /** 更新当前商户的店铺 */
  @Put('mine')
  @UseGuards(JwtAuthGuard)
  async updateMine(@Req() req: any, @Body() data: any) {
    return this.shopsService.updateMine(req.user.userId, data);
  }

  /** 店铺统计 */
  @Get('mine/stats')
  @UseGuards(JwtAuthGuard)
  async getMineStats(@Req() req: any) {
    return this.shopsService.getMineStats(req.user.userId);
  }

  /** 店铺数据看板 */
  @Get('mine/dashboard')
  @UseGuards(JwtAuthGuard)
  async getMineDashboard(@Req() req: any) {
    return this.shopsService.getMineDashboard(req.user.userId);
  }

  // ==================== 公开接口 ====================

  /** 搜索店铺 */
  @Public()
  @Get()
  async search(@Query() dto: QueryShopDto) {
    return this.shopsService.search(dto);
  }

  /** 店铺详情 */
  @Public()
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.shopsService.findById(id);
  }

  /** 市场地图标注点 */
  @Public()
  @Get('market/:marketId/markers')
  async marketMarkers(@Param('marketId') marketId: string) {
    return this.shopsService.findByMarket(marketId);
  }
}
