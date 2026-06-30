import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { BannersService } from './banners.service';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Banner')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  /** 获取有效 Banner — 公开 */
  @Public()
  @Get('active')
  @ApiOperation({ summary: '获取指定位置的有效Banner' })
  async active(@Query('position') position?: string) {
    return this.bannersService.findActive(position);
  }

  /** 管理端：所有 Banner */
  @Get()
  @ApiOperation({ summary: '获取所有Banner（管理端）' })
  async list() {
    return this.bannersService.findAll();
  }

  /** 管理端：创建 Banner */
  @Post()
  @ApiOperation({ summary: '创建Banner' })
  async create(@Body() data: any) {
    return this.bannersService.create(data);
  }

  /** 管理端：更新 Banner */
  @Put(':id')
  @ApiOperation({ summary: '更新Banner' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.bannersService.update(id, data);
  }

  /** 管理端：删除 Banner */
  @Delete(':id')
  @ApiOperation({ summary: '删除Banner' })
  async delete(@Param('id') id: string) {
    await this.bannersService.delete(id);
    return { message: 'Banner已删除' };
  }
}
