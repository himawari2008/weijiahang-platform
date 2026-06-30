import { Controller, Get, Param } from '@nestjs/common';
import { MarketsService, CityEntry, CityConfig } from './markets.service';
import { ShopsService } from '../shops/shops.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@ApiTags('市场')
@Controller('markets')
export class MarketsController {
  constructor(
    private readonly marketsService: MarketsService,
    private readonly shopsService: ShopsService,
  ) {}

  /** 所有市场列表 */
  @Get()
  @ApiOperation({ summary: '获取所有市场列表' })
  async list() {
    return this.marketsService.findAll();
  }

  /** 按城市筛选市场（静态路由放在 :id 前，避免"by-city"被捕获为id） */
  @Get('by-city/:city')
  @ApiOperation({ summary: '按城市筛选市场' })
  async listByCity(@Param('city') city: string) {
    return this.marketsService.findByCity(city);
  }

  // ==================== 多城市支持（静态路由必须在 :id 前） ====================

  /** 所有已开通城市列表 */
  @Get('city/list')
  @ApiOperation({ summary: '获取所有已开通城市列表（含预置未开通）' })
  async cities(): Promise<CityConfig> {
    return this.marketsService.getActiveCities();
  }

  /** 单个城市配置详情 */
  @Get('city/:cityName')
  @ApiOperation({ summary: '获取单个城市配置详情' })
  async cityDetail(@Param('cityName') cityName: string): Promise<CityEntry | null> {
    return this.marketsService.getCityDetail(cityName);
  }

  /** 市场详情 */
  @Get(':id')
  @ApiOperation({ summary: '获取市场详情' })
  async detail(@Param('id') id: string) {
    return this.marketsService.findById(id);
  }

  /** 市场内店铺列表（委托 shopsService） */
  @Get(':id/shops')
  @ApiOperation({ summary: '获取市场内店铺列表' })
  async shops(@Param('id') id: string) {
    return this.shopsService.findByMarket(id);
  }
}
