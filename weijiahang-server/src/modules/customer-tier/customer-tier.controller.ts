import { Controller, Get, Post, Put, Param, Body, Query, Headers } from '@nestjs/common';
import { CustomerTierService } from './customer-tier.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';

/**
 * 客户分层 API
 *
 * 公开端点：等级配置查询（供小程序展示）
 * 需登录：个人等级查询、管理员操作
 *
 * FIX: 所有 userId 从 @CurrentUserId() / @Headers('x-user-id') 获取，
 * 而非从 @Body() —— 防止客户端冒充任意用户。
 */
@Controller('customer-tiers')
export class CustomerTierController {
  constructor(private readonly tierService: CustomerTierService) {}

  /** 初始化默认阈值配置 — 公开（首次部署用） */
  @Public()
  @Post('seed')
  async seedConfigs() {
    const count = await this.tierService.seedDefaultConfigs();
    return { seeded: count, message: count > 0 ? `已初始化${count}条配置` : '配置已存在，跳过' };
  }

  /** 获取等级阈值配置 — 公开 */
  @Public()
  @Get('config')
  async getConfigs(@Query('customerType') customerType?: string) {
    return this.tierService.getConfigs(customerType);
  }

  /** 管理员：更新等级阈值配置 */
  @Put('config')
  async updateConfig(@Body() body: any) {
    return this.tierService.upsertConfig(body);
  }

  /** 获取当前用户等级信息 + 距下一级进度 */
  @Public()
  @Get('mine')
  async getMyTier(@CurrentUserId() userId?: string) {
    if (!userId) throw new Error('请先登录');
    return this.tierService.getTierInfo(userId);
  }

  /** 管理员：获取指定用户等级 */
  @Get(':userId')
  async getUserTier(@Param('userId') userId: string) {
    return this.tierService.getTierInfo(userId);
  }

  /** 管理员：手动分配客群类型 */
  @Put(':userId/assign')
  async assignCustomerType(
    @Param('userId') userId: string,
    @Body('customerType') customerType: string,
  ) {
    return this.tierService.assignCustomerType(userId, customerType);
  }

  /** 管理员：获取所有用户等级列表 */
  @Get()
  async getAllTiers(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
    return this.tierService.getAllTiers(+page, +pageSize);
  }
}
