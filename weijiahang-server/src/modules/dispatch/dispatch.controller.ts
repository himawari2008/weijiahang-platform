import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { DispatchService } from './dispatch.service';

/**
 * 智能派单控制器
 */
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  /**
   * 管理员触发派单
   * POST /api/v1/dispatch/orders/:id/trigger
   */
  @Post('orders/:id/trigger')
  async trigger(
    @Param('id') id: string,
    @Body('marketId') marketId: string,
    @Body('categories') categories?: string[],
  ) {
    return this.dispatchService.dispatchOrder(id, marketId, categories);
  }

  /**
   * 获取领航员的待处理派单
   * GET /api/v1/dispatch/pending/:navigatorId
   */
  @Get('pending/:navigatorId')
  async pendingDispatches(@Param('navigatorId') navigatorId: string) {
    return this.dispatchService.getPendingDispatches(navigatorId);
  }

  /**
   * 领航员接受派单
   * POST /api/v1/dispatch/:dispatchId/accept
   */
  @Post(':dispatchId/accept')
  async accept(
    @Param('dispatchId') dispatchId: string,
    @Body('navigatorId') navigatorId: string,
  ) {
    return this.dispatchService.acceptOrder(dispatchId, navigatorId);
  }

  /**
   * 领航员拒绝派单
   * POST /api/v1/dispatch/:dispatchId/reject
   */
  @Post(':dispatchId/reject')
  async reject(
    @Param('dispatchId') dispatchId: string,
    @Body('navigatorId') navigatorId: string,
  ) {
    return this.dispatchService.rejectOrder(dispatchId, navigatorId);
  }

  /**
   * 查询派单记录
   * GET /api/v1/dispatch/records?orderId=
   */
  @Get('records')
  async records(@Query('orderId') orderId?: string) {
    return this.dispatchService.queryRecords(orderId);
  }
}
