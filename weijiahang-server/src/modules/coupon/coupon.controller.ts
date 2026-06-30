import { Controller, Get, Post, Put, Delete, Param, Body, Query, Headers } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';

/**
 * FIX: 可用优惠券查询的 userId 从 @CurrentUserId() 获取，
 * 而非从 @Query('userId') —— 防止客户端查询任意用户的优惠券。
 */
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  /** 管理员：创建优惠券 */
  @Post()
  async create(@Body() body: any) {
    return this.couponService.create(body);
  }

  /** 管理员：优惠券列表 */
  @Get()
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
    return this.couponService.findAll(+page, +pageSize);
  }

  /** 管理员：更新优惠券 */
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.couponService.update(id, body);
  }

  /** 管理员：删除优惠券 */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.couponService.delete(id);
  }

  /** 获取可用优惠券（结算页用） */
  @Public()
  @Get('available')
  async getAvailable(
    @CurrentUserId() userId?: string,
    @Query('amount') amount?: number,
  ) {
    const uid = userId || 'demo-user-001';
    return this.couponService.getAvailableForOrder(uid, +(amount || 0));
  }
}
