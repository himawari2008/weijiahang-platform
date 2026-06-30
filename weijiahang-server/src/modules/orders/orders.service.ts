import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, ServiceType } from '../../database/entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { SettlementService } from '../settlement/settlement.service';

/** 订单状态流转校验映射：当前状态 → 允许的下一个状态集合 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.ARRIVED, OrderStatus.CANCELLED, OrderStatus.ABNORMAL],
  [OrderStatus.ARRIVED]: [OrderStatus.PREPARING, OrderStatus.SERVING, OrderStatus.CANCELLED, OrderStatus.ABNORMAL],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.ABNORMAL],
  [OrderStatus.READY]: [OrderStatus.SERVING, OrderStatus.CANCELLED, OrderStatus.ABNORMAL],
  [OrderStatus.SERVING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.ABNORMAL],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.ABNORMAL]: [OrderStatus.CANCELLED],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly settlementService: SettlementService,
  ) {}

  /** 创建订单 */
  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    const orderNo = this.generateOrderNo();
    const amount = this.calculatePrice(dto.serviceType);
    const platformFee = Math.round(amount * 0.2 * 100) / 100;
    const navigatorIncome = amount - platformFee;

    const order = this.orderRepo.create({
      orderNo, userId, amount, platformFee, navigatorIncome,
      serviceType: dto.serviceType,
      title: dto.title,
      description: dto.description,
      targetShops: dto.targetShops || [],
      targetMarketId: dto.targetMarketId,
      budgetRange: dto.budgetRange,
      expectedStart: dto.expectedStart || new Date(),
      status: OrderStatus.PENDING,
    } as any);

    return this.orderRepo.save(order as unknown as Order);
  }

  /** 领航员接单 */
  async accept(orderId: string, navigatorId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('订单已被抢走或已取消');
    }

    order.navigatorId = navigatorId;
    order.status = OrderStatus.ACCEPTED;
    order.actualStart = new Date();
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'accepted', 'navigator', navigatorId, {});
    return order;
  }

  /** 领航员到达店铺 */
  async arrive(orderId: string, navigatorId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, navigatorId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.ACCEPTED) {
      throw new BadRequestException('订单状态不正确');
    }

    order.status = OrderStatus.ARRIVED;
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'arrived', 'navigator', navigatorId, {});
    return order;
  }

  /** 开始服务（验货） */
  async startServing(orderId: string, navigatorId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, navigatorId } });
    if (!order) throw new NotFoundException('订单不存在');

    order.status = OrderStatus.SERVING;
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'serving', 'navigator', navigatorId, {});
    return order;
  }

  /** 提交验货报告 */
  async submitInspection(
    orderId: string,
    navigatorId: string,
    report: { photos: string[]; notes: string; checklist: any[] },
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, navigatorId } });
    if (!order) throw new NotFoundException('订单不存在');

    order.inspectionReport = {
      ...order.inspectionReport,
      photos: report.photos,
      notes: report.notes,
      checklist: report.checklist,
      submittedAt: new Date(),
    };
    await this.orderRepo.save(order as unknown as Order);
    return order;
  }

  /** 完成服务 */
  async complete(orderId: string, navigatorId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, navigatorId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.ARRIVED && order.status !== OrderStatus.SERVING && order.status !== OrderStatus.READY) {
      throw new BadRequestException('订单状态不正确');
    }

    order.status = OrderStatus.COMPLETED;
    order.actualEnd = new Date();
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'completed', 'navigator', navigatorId, {});

    // 自动结算领航员余额（失败不阻塞订单完成）
    try {
      await this.settlementService.settleOrder(orderId);
    } catch (err) {
      this.logger.warn(`订单 ${orderId} 完成，结算失败: ${err.message}`);
    }
    return order;
  }

  /** 用户取消订单 */
  async cancelByUser(orderId: string, userId: string, reason?: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('只能取消待接单状态的订单');
    }
    order.status = OrderStatus.CANCELLED;
    order.cancelReason = reason || null;
    order.cancelBy = 'user';
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'cancelled', 'user', userId, { reason });
    return order;
  }

  // ===== 订单状态机扩展 (P1.11) =====

  /**
   * 商户标记备货中
   * 状态: ARRIVED → PREPARING
   */
  async preparing(orderId: string, shopId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.ARRIVED) {
      throw new BadRequestException('订单状态不正确，当前状态: ' + order.status);
    }

    order.status = OrderStatus.PREPARING;
    order.shopId = shopId;
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'preparing', 'shop', shopId, {});
    return order;
  }

  /**
   * 商户标记备货完成
   * 状态: PREPARING → READY
   */
  async ready(orderId: string, shopId: string, fulfillmentData?: { photos?: string[]; notes?: string; estimatedPickupTime?: string }): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PREPARING) {
      throw new BadRequestException('订单状态不正确，当前状态: ' + order.status);
    }
    if (order.shopId !== shopId) {
      throw new BadRequestException('商户ID不匹配');
    }

    order.status = OrderStatus.READY;
    order.fulfillmentData = {
      ...(order.fulfillmentData || {}),
      photos: fulfillmentData?.photos || [],
      notes: fulfillmentData?.notes || '',
      estimatedPickupTime: fulfillmentData?.estimatedPickupTime || new Date().toISOString(),
      completedAt: new Date(),
    };
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'ready', 'shop', shopId, { fulfillmentData });
    return order;
  }

  /**
   * 领航员确认取货
   * 状态: READY → SERVING
   */
  async navigatorPickup(orderId: string, navigatorId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, navigatorId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('订单状态不正确，当前状态: ' + order.status);
    }

    order.status = OrderStatus.SERVING;
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'pickup', 'navigator', navigatorId, {});
    return order;
  }

  /**
   * 领航员申请转单（退回订单池）
   * 状态: ACCEPTED | ARRIVED → PENDING
   */
  async requestTransfer(orderId: string, navigatorId: string, reason: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, navigatorId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.ACCEPTED && order.status !== OrderStatus.ARRIVED) {
      throw new BadRequestException('只能转单已接单或已到达状态的订单');
    }

    order.status = OrderStatus.PENDING;
    order.navigatorId = null as any;
    order.transferReason = reason;
    order.actualStart = null as any;
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, 'transfer', 'navigator', navigatorId, { reason });
    return order;
  }

  /**
   * 商户查询订单列表
   */
  async findByShop(
    shopId: string,
    status?: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: Order[]; total: number; page: number; pageSize: number }> {
    const where: any = { shopId };
    if (status) where.status = status;

    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  /** 商户批量确认订单 */
  async batchConfirm(ids: string[], shopId: string): Promise<{ confirmed: string[]; failed: string[] }> {
    const confirmed: string[] = [];
    const failed: string[] = [];
    for (const id of ids) {
      try {
        const order = await this.orderRepo.findOne({ where: { id } });
        if (order && order.status === 'pending') {
          await this.preparing(id, shopId);
          confirmed.push(id);
        } else {
          failed.push(id);
        }
      } catch {
        failed.push(id);
      }
    }
    return { confirmed, failed };
  }

  /**
   * 通用状态更新（带流转校验）
   */
  async updateStatus(orderId: string, status: string, operatorType: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');

    // 校验状态流转合法性
    const allowedNextStatuses = STATUS_TRANSITIONS[order.status as string] || [];
    if (!allowedNextStatuses.includes(status)) {
      throw new BadRequestException(
        `非法状态流转: ${order.status} → ${status}，允许的下一个状态: [${allowedNextStatuses.join(', ')}]`,
      );
    }

    order.status = status as OrderStatus;
    await this.orderRepo.save(order as unknown as Order);
    this.logAction(orderId, `status:${status}`, operatorType, order[operatorType === 'user' ? 'userId' : 'navigatorId'], {});
    return order;
  }

  /** 获取可接订单列表（领航员端） */
  async findAvailable(marketId?: string): Promise<Order[]> {
    const qb = this.orderRepo.createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.PENDING });

    if (marketId) {
      qb.andWhere('order.targetMarketId = :marketId', { marketId });
    }

    return qb.orderBy('order.createdAt', 'DESC').take(50).getMany();
  }

  /** 获取用户订单列表 */
  async findByUser(userId: string, status?: string): Promise<Order[]> {
    const where: any = { userId };
    if (status) where.status = status;
    return this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** 获取领航员订单列表 */
  async findByNavigator(navigatorId: string, status?: string): Promise<Order[]> {
    const where: any = { navigatorId };
    if (status) where.status = status;
    return this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** 订单详情 */
  async findById(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  // ---- 私有方法 ----

  private generateOrderNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WJH${date}${rand}`;
  }

  private calculatePrice(serviceType: ServiceType): number {
    const prices = {
      [ServiceType.NAVIGATION]: 39,
      [ServiceType.ACCOMPANY]: 150,
      [ServiceType.INSPECTION]: 25,
    };
    return prices[serviceType] || 39;
  }

  /** 记录订单操作日志（简化版，直接打log，正式版写order_logs表） */
  private logAction(
    orderId: string, action: string,
    operatorType: string, operatorId: string, detail: any,
  ) {
    this.logger.log(`[订单日志] ${orderId} | ${action} | ${operatorType}:${operatorId}`);
  }
}
