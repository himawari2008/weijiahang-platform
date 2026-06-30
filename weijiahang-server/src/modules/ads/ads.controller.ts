import {
  Controller, Get, Post, Patch, Body, Query, Param,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { QueryAdDto } from './dto/query-ad.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /** 创建推广计划 — 需登录 */
  @Post()
  async create(@Body() dto: CreateAdDto) {
    return this.adsService.create(dto);
  }

  /** 获取某位置当前投放中的广告 — 公开 */
  @Public()
  @Get('active')
  async getActiveAds(@Query() query: QueryAdDto) {
    return this.adsService.getActiveAds(query.position);
  }

  /** 记录展示+1 — 公开（广告曝光回调） */
  @Public()
  @Post(':id/impression')
  async recordImpression(@Param('id') id: string) {
    return this.adsService.recordImpression(id);
  }

  /** 记录点击+1，扣费 — 公开（广告点击回调） */
  @Public()
  @Post(':id/click')
  async recordClick(@Param('id') id: string) {
    return this.adsService.recordClick(id);
  }

  /** 商户查看自己的推广 — 需登录 */
  @Get('shop/:shopId')
  async getShopAds(@Param('shopId') shopId: string) {
    return this.adsService.getShopAds(shopId);
  }

  /** 暂停/恢复推广 — 需登录 */
  @Patch(':id/status')
  async pauseResume(
    @Param('id') id: string,
    @Body('status') status: number,
  ) {
    return this.adsService.pauseResume(id, status);
  }
}
