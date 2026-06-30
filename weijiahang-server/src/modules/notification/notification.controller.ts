import {
  Controller, Get, Put, Delete, Param, Query, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 查询通知列表
   * GET /notifications?targetId=&targetType=&page=1&pageSize=20
   */
  @Get()
  async findAll(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.findByTarget(
      targetId,
      targetType,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /**
   * 按类型查询通知
   * GET /notifications/by-type?targetId=&targetType=&type=&page=1&pageSize=20
   */
  @Get('by-type')
  async findByType(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: string,
    @Query('type') type: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.findByType(
      targetId,
      targetType,
      type,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /**
   * 获取未读通知数量
   * GET /notifications/unread-count?targetId=&targetType=
   */
  @Get('unread-count')
  async unreadCount(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: string,
  ) {
    return this.notificationService.getUnreadCount(targetId, targetType);
  }

  /**
   * 标记单条通知为已读
   * PUT /notifications/:id/read
   */
  @Put(':id/read')
  async markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.markRead(id);
  }

  /**
   * 标记所有通知为已读
   * PUT /notifications/read-all?targetId=&targetType=
   */
  @Put('read-all')
  async markAllRead(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: string,
  ) {
    const count = await this.notificationService.markAllRead(targetId, targetType);
    return { affected: count, message: `已标记 ${count} 条通知为已读` };
  }

  /**
   * 删除通知
   * DELETE /notifications/:id
   */
  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationService.delete(id);
    return { message: '通知已删除' };
  }

  /**
   * 批量删除通知
   * DELETE /notifications?targetId=&targetType=
   */
  @Delete()
  async deleteByTarget(
    @Query('targetId') targetId: string,
    @Query('targetType') targetType: string,
  ) {
    const count = await this.notificationService.deleteByTarget(targetId, targetType);
    return { affected: count, message: `已删除 ${count} 条通知` };
  }
}
