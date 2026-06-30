import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { BeaconsService } from './beacons.service';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('蓝牙信标')
@Controller('beacons')
export class BeaconsController {
  constructor(private readonly beaconsService: BeaconsService) {}

  /** 管理员：分页查询所有信标 */
  @Get()
  @ApiOperation({ summary: '信标列表（分页+筛选）' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('keyword') keyword?: string,
    @Query('marketId') marketId?: string,
    @Query('status') status?: number,
  ) {
    return this.beaconsService.findAll({ page, pageSize, keyword, marketId, status });
  }

  /** 管理员：创建信标 */
  @Post()
  @ApiOperation({ summary: '创建信标' })
  async create(@Body() dto: any) {
    return this.beaconsService.create(dto);
  }

  /** 管理员：更新信标 */
  @Put(':id')
  @ApiOperation({ summary: '更新信标' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.beaconsService.update(id, dto);
  }

  /** 管理员：删除信标 */
  @Delete(':id')
  @ApiOperation({ summary: '删除信标（软删除）' })
  async remove(@Param('id') id: string) {
    await this.beaconsService.remove(id);
    return { message: '信标已删除' };
  }

  /** 公开：获取某市场所有活跃信标 */
  @Public()
  @Get('market/:marketId')
  @ApiOperation({ summary: '市场信标列表（公开）' })
  async findByMarket(@Param('marketId') marketId: string) {
    return this.beaconsService.findByMarket(marketId);
  }

  /** 公开：获取某市场某楼层信标 */
  @Public()
  @Get('floor/:marketId/:floor')
  @ApiOperation({ summary: '楼层信标列表（公开）' })
  async findByFloor(
    @Param('marketId') marketId: string,
    @Param('floor') floor: number,
  ) {
    return this.beaconsService.findByFloor(marketId, floor);
  }

  /** 公开：获取信标地图（用于三边定位） */
  @Public()
  @Get('map/:marketId/:floor')
  @ApiOperation({ summary: '信标定位地图（公开，含坐标网格）' })
  async getBeaconMap(
    @Param('marketId') marketId: string,
    @Param('floor') floor: number,
  ) {
    return this.beaconsService.getBeaconMap(marketId, floor);
  }
}
