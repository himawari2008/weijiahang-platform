import { Controller, Get, Post, Put, Param, Body, Query, Headers } from '@nestjs/common';
import { ProductOrderService } from './product-order.service';
import { CreateProductOrderDto } from './dto/create-product-order.dto';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 商品采购订单 API
 *
 * 用户端：创建/查询/取消/支付/确认收货
 * 商户端：确认/备货/发货
 * 管理端：全局查询/退款处理
 *
 * FIX: 所有 userId 从 @CurrentUserId() 获取（请求头 x-user-id），
 * 而非从 @Body() 读取——防止客户端冒充任意用户操作订单。
 */
@Controller('product-orders')
export class ProductOrderController {
  constructor(private readonly orderService: ProductOrderService) {}

  /* ═══ 用户端 ═══ */

  /** 创建采购订单 */
  @Post()
  @Public()
  async create(@Body() dto: CreateProductOrderDto, @CurrentUserId() userId: string) {
    return this.orderService.create(userId, dto);
  }

  /** 我的采购订单列表 */
  @Get('my')
  @Public()
  async getMyOrders(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @CurrentUserId() userId?: string,
  ) {
    const uid = userId || 'demo-user-001';
    return this.orderService.findByUser(uid, status, +page, +pageSize);
  }

  /** 订单详情 */
  @Get(':id')
  @Public()
  async getDetail(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  /** 取消订单 */
  @Put(':id/cancel')
  @Public()
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @CurrentUserId() userId?: string,
  ) {
    const uid = userId || 'demo-user-001';
    return this.orderService.cancelByUser(id, uid, reason);
  }

  /** 支付订单（Mock — 后续接入微信支付） */
  @Put(':id/pay')
  @Public()
  async pay(
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod?: string,
    @CurrentUserId() userId?: string,
  ) {
    const uid = userId || 'demo-user-001';
    return this.orderService.userPay(id, uid, paymentMethod);
  }

  /** 确认收货 */
  @Put(':id/confirm-receipt')
  @Public()
  async confirmReceipt(
    @Param('id') id: string,
    @CurrentUserId() userId?: string,
  ) {
    const uid = userId || 'demo-user-001';
    return this.orderService.userReceive(id, uid);
  }

  /** 申请退款 */
  @Put(':id/refund')
  @Public()
  async requestRefund(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('amount') amount?: number,
    @CurrentUserId() userId?: string,
  ) {
    const uid = userId || 'demo-user-001';
    return this.orderService.requestRefund(id, uid, reason, amount);
  }

  /* ═══ 商户端 ═══ */

  /** 商户订单列表 */
  @Get('shop/:shopId')
  async getShopOrders(
    @Param('shopId') shopId: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.orderService.findByShop(shopId, status, +page, +pageSize);
  }

  /** 商家确认订单 — shopId 从 Header 获取，防止客户端伪造 */
  @Put(':id/merchant-confirm')
  async merchantConfirm(
    @Param('id') id: string,
    @Headers('x-shop-id') shopId: string,
    @Body() body?: any,
  ) {
    return this.orderService.merchantConfirm(id, shopId, body?.adjustments);
  }

  /** 商家备货 */
  @Put(':id/merchant-prepare')
  async merchantPrepare(
    @Param('id') id: string,
    @Headers('x-shop-id') shopId: string,
  ) {
    return this.orderService.merchantPrepare(id, shopId);
  }

  /** 商家发货 */
  @Put(':id/merchant-ship')
  async merchantShip(
    @Param('id') id: string,
    @Headers('x-shop-id') shopId: string,
  ) {
    return this.orderService.merchantShip(id, shopId);
  }

  /* ═══ 管理端 ═══ */

  /** 管理员：全量订单 */
  @Get()
  async adminList(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.orderService.findAllForAdmin({ status, page: +page, pageSize: +pageSize });
  }

  /** 管理员：完成退款 */
  @Put(':id/complete-refund')
  async completeRefund(@Param('id') id: string) {
    return this.orderService.completeRefund(id);
  }

  /** 自动完成（定时任务触发 或 手动触发） */
  @Put(':id/complete')
  async complete(@Param('id') id: string) {
    return this.orderService.complete(id);
  }
}
