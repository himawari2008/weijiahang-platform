import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** 创建订单 */
  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const userId = dto.userId || 'system';
    return this.ordersService.create(userId, dto);
  }

  /** 领航员可接订单 */
  @Get('available')
  async available(@Query('marketId') marketId?: string) {
    return this.ordersService.findAvailable(marketId);
  }

  /** 用户订单列表 */
  @Get('user/:userId')
  async userOrders(@Param('userId') userId: string, @Query('status') status?: string) {
    return this.ordersService.findByUser(userId, status);
  }

  /** 领航员订单列表 */
  @Get('navigator/:navId')
  async navigatorOrders(@Param('navId') navId: string, @Query('status') status?: string) {
    return this.ordersService.findByNavigator(navId, status);
  }

  /** 商户订单列表 */
  @Get('shop/:shopId')
  async shopOrders(
    @Param('shopId') shopId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ordersService.findByShop(
      shopId,
      status,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /** 订单详情 */
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  /** 领航员接单 */
  @Post(':id/accept')
  async accept(@Param('id') id: string, @Body('navigatorId') navigatorId: string) {
    return this.ordersService.accept(id, navigatorId);
  }

  /** 领航员到达 */
  @Post(':id/arrive')
  async arrive(@Param('id') id: string, @Body('navigatorId') navigatorId: string) {
    return this.ordersService.arrive(id, navigatorId);
  }

  /** 提交验货报告 */
  @Post(':id/inspection')
  async inspection(
    @Param('id') id: string,
    @Body() body: { navigatorId: string; photos: string[]; notes: string; checklist: any[] },
  ) {
    return this.ordersService.submitInspection(id, body.navigatorId, {
      photos: body.photos, notes: body.notes, checklist: body.checklist,
    });
  }

  /** 完成订单 */
  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body('navigatorId') navigatorId: string) {
    return this.ordersService.complete(id, navigatorId);
  }

  /** 取消订单 */
  @Delete(':id')
  async cancel(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Query('reason') reason?: string,
  ) {
    return this.ordersService.cancelByUser(id, userId, reason);
  }

  // ===== 订单状态机扩展端点 (P1.11) =====

  /** 商户标记备货中 */
  @Post(':id/preparing')
  async preparing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('shopId') shopId: string,
  ) {
    return this.ordersService.preparing(id, shopId);
  }

  /** 商户标记备货完成 */
  @Post(':id/ready')
  async ready(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { shopId: string; photos?: string[]; notes?: string; estimatedPickupTime?: string },
  ) {
    return this.ordersService.ready(id, body.shopId, {
      photos: body.photos,
      notes: body.notes,
      estimatedPickupTime: body.estimatedPickupTime,
    });
  }

  /** 领航员确认取货 */
  @Post(':id/pickup')
  async pickup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('navigatorId') navigatorId: string,
  ) {
    return this.ordersService.navigatorPickup(id, navigatorId);
  }

  /** 领航员申请转单 */
  @Post(':id/request-transfer')
  async requestTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { navigatorId: string; reason: string },
  ) {
    return this.ordersService.requestTransfer(id, body.navigatorId, body.reason);
  }

  /** 商户批量确认订单 */
  @Put('batch-confirm')
  async batchConfirm(@Body() body: { ids: string[]; shopId: string }) {
    return this.ordersService.batchConfirm(body.ids, body.shopId);
  }

  /** 通用状态更新 */
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; operatorType: string },
  ) {
    return this.ordersService.updateStatus(id, body.status, body.operatorType);
  }
}
