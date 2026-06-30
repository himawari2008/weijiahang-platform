import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  /**
   * 创建通知
   */
  async create(data: {
    targetId: string;
    targetType: 'user' | 'navigator' | 'shop';
    type: 'order_new' | 'order_status' | 'system' | 'tier_change' | 'badge_earned' | 'fatigue' | 'earning';
    title: string;
    body?: string;
    data?: any;
  }): Promise<Notification> {
    const notification = this.notificationRepo.create({
      targetId: data.targetId,
      targetType: data.targetType,
      type: data.type,
      title: data.title,
      body: data.body || null,
      data: data.data || {},
      isRead: 0,
      readAt: null,
    } as any);

    const saved = await this.notificationRepo.save(notification as unknown as Notification);
    this.logger.log(`通知已创建: ${saved.id} -> ${data.targetType}:${data.targetId}`);
    return saved;
  }

  /**
   * 按目标查询通知列表（分页）
   */
  async findByTarget(
    targetId: string,
    targetType: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: Notification[]; total: number; page: number; pageSize: number }> {
    const [items, total] = await this.notificationRepo.findAndCount({
      where: { targetId, targetType },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  /**
   * 标记单条通知为已读
   */
  async markRead(id: string): Promise<Notification> {
    await this.notificationRepo.update(
      { id },
      { isRead: 1, readAt: new Date() } as any,
    );
    const updated = await this.notificationRepo.findOne({ where: { id } });
    return updated!;
  }

  /**
   * 标记目标所有通知为已读
   */
  async markAllRead(targetId: string, targetType: string): Promise<number> {
    const result = await this.notificationRepo.update(
      { targetId, targetType, isRead: 0 },
      { isRead: 1, readAt: new Date() } as any,
    );
    return result.affected || 0;
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(targetId: string, targetType: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { targetId, targetType, isRead: 0 },
    });
    return { count };
  }

  /**
   * 获取指定类型的未读通知列表
   */
  async findByType(
    targetId: string,
    targetType: string,
    type: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: Notification[]; total: number }> {
    const [items, total] = await this.notificationRepo.findAndCount({
      where: { targetId, targetType, type },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  /**
   * 删除通知
   */
  async delete(id: string): Promise<void> {
    await this.notificationRepo.delete({ id });
  }

  /**
   * 批量删除（按目标）
   */
  async deleteByTarget(targetId: string, targetType: string): Promise<number> {
    const result = await this.notificationRepo.delete({ targetId, targetType });
    return result.affected || 0;
  }
}
