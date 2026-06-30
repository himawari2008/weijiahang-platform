import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ProductOrder } from '../../database/entities/product-order.entity';
import { ProductOrderItem } from '../../database/entities/product-order-item.entity';
import { Product } from '../../database/entities/product.entity';
import { User } from '../../database/entities/user.entity';
import { CustomerTier } from '../../database/entities/customer-tier.entity';
import { CreateProductOrderDto } from './dto/create-product-order.dto';
import { PricingService } from '../pricing/pricing.service';
import { NotificationService } from '../notification/notification.service';

/** 采购订单状态流转校验矩阵 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_merchant: ['merchant_confirmed', 'cancelled'],
  merchant_confirmed: ['paid', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['received', 'cancelled'],
  received: ['completed'],
  completed: ['refunding'],
  refunding: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** 可取消的状态（付款前可自由取消） */
const CANCELABLE_STATUSES = ['pending_merchant', 'merchant_confirmed'];

@Injectable()
export class ProductOrderService {
  private readonly logger = new Logger(ProductOrderService.name);

  constructor(
    @InjectRepository(ProductOrder)
    private readonly orderRepo: Repository<ProductOrder>,
    @InjectRepository(ProductOrderItem)
    private readonly itemRepo: Repository<ProductOrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CustomerTier)
    private readonly tierRepo: Repository<CustomerTier>,
    private readonly pricingService: PricingService,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  /* ═══════════════════════════════════════════
     创建订单（事务包裹，防止半写入）
     ═══════════════════════════════════════════ */

  async create(userId: string, dto: CreateProductOrderDto): Promise<ProductOrder> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // 去重 productId 后再查询（同一商品分两行下单不应报错）
    const uniqueProductIds = [...new Set(dto.items.map(i => i.productId))];
    const products = await this.productRepo.find({
      where: { id: In(uniqueProductIds), isOnSale: true },
      relations: ['shop'],
    });
    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException('部分商品已下架或不存在');
    }

    // 检测首单
    const orderCount = await this.orderRepo.count({ where: { userId } });
    const isFirstOrder = orderCount === 0;

    // FIX: 从 CustomerTier 表读取真实等级，而非硬编码 tierLevel=1
    const customerType = user.customerType || 'retail';
    let tierLevel = 1;
    const tierRecord = await this.tierRepo.findOne({ where: { userId } });
    if (tierRecord) {
      tierLevel = tierRecord.currentLevel || 1;
    }

    // 构建订单
    const orderNo = this.generateOrderNo();

    // 使用事务：确保订单、明细、库存扣减全部原子执行
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepo = queryRunner.manager.getRepository(ProductOrder);
      const itemRepo = queryRunner.manager.getRepository(ProductOrderItem);
      const productRepo = queryRunner.manager.getRepository(Product);

      const order = orderRepo.create({
        orderNo,
        userId,
        customerType,
        tierLevel,
        status: 'pending_merchant',
        deliveryMethod: dto.deliveryMethod || 'self_pickup',
        addressId: dto.addressId || null,
        appointedDate: dto.appointedDate ? new Date(dto.appointedDate) : null,
        appointedTimeSlot: dto.appointedTimeSlot || null,
        deliveryFee: dto.deliveryFee || 0,
        firstOrder: isFirstOrder,
        remark: dto.remark || null,
        source: 'miniapp',
      } as any);

      const savedOrder = await orderRepo.save(order as unknown as ProductOrder);

      // 创建订单明细
      let itemsTotal = 0;
      let totalTierDiscount = 0;

      for (const item of dto.items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new BadRequestException(`商品 ${item.productId} 不存在`);
        }

        // 原子扣减库存（UPDATE SET stock = stock - ? WHERE id = ? AND stock >= ?）
        if (product.stock >= 0) {
          const updateResult = await productRepo
            .createQueryBuilder()
            .update(Product)
            .set({
              stock: () => `stock - ${item.quantity}`,
              salesCount: () => `COALESCE(sales_count, 0) + ${item.quantity}`,
            })
            .where('id = :id AND stock >= :qty', { id: product.id, qty: item.quantity })
            .execute();

          if (updateResult.affected === 0) {
            throw new BadRequestException(`${product.name} 库存不足`);
          }
        }

        // 调用定价服务
        const pricing = this.pricingService.calculateItemPrice(
          product, customerType, tierLevel, item.quantity,
        );

        const orderItem = itemRepo.create({
          orderId: savedOrder.id,
          productId: product.id,
          shopId: product.shopId,
          productName: product.name,
          productSpec: product.spec || '',
          productGrade: product.productGrade || 'standard',
          productImage: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '',
          priceUnit: product.priceUnit || '㎡',
          unitPrice: product.price || 0,
          customerPrice: pricing.customerPrice,
          quantity: item.quantity,
          subtotal: (product.price || 0) * item.quantity,
          tierDiscountAmount: pricing.tierDiscount * item.quantity,
          rowTotal: pricing.finalUnitPrice * item.quantity,
          remark: item.remark || null,
        } as any);

        const savedItem = await itemRepo.save(orderItem as unknown as ProductOrderItem);

        itemsTotal += Number(savedItem.subtotal);
        totalTierDiscount += Number(savedItem.tierDiscountAmount);
      }

      // 更新订单价格汇总
      savedOrder.itemsTotal = itemsTotal;
      savedOrder.tierDiscount = totalTierDiscount;
      savedOrder.finalAmount = itemsTotal - totalTierDiscount + Number(savedOrder.deliveryFee);
      await orderRepo.save(savedOrder as unknown as ProductOrder);

      await queryRunner.commitTransaction();

      // 事务完成后发送通知（不阻塞）
      try {
        await this.notificationService.create({
          targetId: userId,
          targetType: 'user',
          type: 'order_new',
          title: '订单已创建',
          body: `订单 ${orderNo} 已创建，等待商家确认。金额：¥${savedOrder.finalAmount}`,
          data: { orderId: savedOrder.id, orderNo },
        });
      } catch (e) {
        this.logger.warn('通知发送失败，不阻塞流程', e);
      }

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /* ═══════════════════════════════════════════
     查询
     ═══════════════════════════════════════════ */

  /** 用户采购订单列表 */
  async findByUser(userId: string, status?: string, page = 1, pageSize = 20): Promise<{ items: ProductOrder[]; total: number }> {
    const where: any = { userId };
    if (status) where.status = status;
    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 订单详情（含商品明细） */
  async findById(orderId: string): Promise<ProductOrder & { items: ProductOrderItem[] }> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    const items = await this.itemRepo.find({ where: { orderId }, relations: ['product'] });
    return { ...order, items } as any;
  }

  /** 商户订单列表 */
  async findByShop(shopId: string, status?: string, page = 1, pageSize = 20): Promise<{ items: ProductOrder[]; total: number }> {
    const itemQuery = this.itemRepo.createQueryBuilder('item')
      .select('DISTINCT item.order_id')
      .where('item.shop_id = :shopId', { shopId });

    const orderIds = (await itemQuery.getRawMany()).map(r => r.order_id);
    if (orderIds.length === 0) return { items: [], total: 0 };

    const where: any = { id: In(orderIds) };
    if (status) where.status = status;

    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 管理员：全量订单列表 */
  async findAllForAdmin(params: { status?: string; page?: number; pageSize?: number }): Promise<{ items: ProductOrder[]; total: number }> {
    const where: any = {};
    if (params.status) where.status = params.status;
    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: ((params.page || 1) - 1) * (params.pageSize || 20),
      take: params.pageSize || 20,
    });
    return { items, total };
  }

  /* ═══════════════════════════════════════════
     状态流转
     ═══════════════════════════════════════════ */

  /** 取消订单（用户端） */
  async cancelByUser(orderId: string, userId: string, reason?: string): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
    if (!CANCELABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('当前状态不可取消');
    }

    order.status = 'cancelled';
    order.cancelReason = reason || '用户取消';
    order.cancelBy = 'user';
    order.cancelAt = new Date();

    // 归还库存
    await this.restoreStock(orderId);

    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 商家确认订单 — FIX: 校验 shopId 是否拥有订单中至少一个商品 */
  async merchantConfirm(orderId: string, shopId: string, adjustments?: { amount?: number; note?: string }): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');

    // 校验该商家是否拥有此订单中的商品
    if (shopId) {
      const ownItem = await this.itemRepo.findOne({ where: { orderId, shopId } });
      if (!ownItem) throw new BadRequestException('无权操作此订单——订单中无贵店商品');
    }

    this.validateTransition(order.status, 'merchant_confirmed');

    order.status = 'merchant_confirmed';
    if (adjustments?.amount !== undefined) {
      order.adjustmentAmount = adjustments.amount;
      order.finalAmount = Number(order.finalAmount) + adjustments.amount;
      order.internalNote = (adjustments.note || '') as string;
    }

    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 用户支付（Mock — 后续接入微信支付） */
  async userPay(orderId: string, userId: string, paymentMethod = 'wechat_pay'): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
    this.validateTransition(order.status, 'paid');

    order.status = 'paid';
    order.payStatus = 1;
    order.paymentMethod = paymentMethod;
    order.payTime = new Date();
    order.payTransaction = `MOCK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 商家备货 */
  async merchantPrepare(orderId: string, shopId: string): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (shopId) {
      const ownItem = await this.itemRepo.findOne({ where: { orderId, shopId } });
      if (!ownItem) throw new BadRequestException('无权操作此订单');
    }
    this.validateTransition(order.status, 'preparing');
    order.status = 'preparing';
    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 商家发货 */
  async merchantShip(orderId: string, shopId: string): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (shopId) {
      const ownItem = await this.itemRepo.findOne({ where: { orderId, shopId } });
      if (!ownItem) throw new BadRequestException('无权操作此订单');
    }
    this.validateTransition(order.status, 'shipped');
    order.status = 'shipped';
    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 用户确认收货 */
  async userReceive(orderId: string, userId: string): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
    this.validateTransition(order.status, 'received');

    order.status = 'received';

    // 更新用户统计
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.totalOrders = (user.totalOrders || 0) + 1;
      user.totalSpent = Number(user.totalSpent || 0) + Number(order.finalAmount);
      await this.userRepo.save(user);
    }

    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 完成订单 */
  async complete(orderId: string): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    this.validateTransition(order.status, 'completed');
    order.status = 'completed';
    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 申请退款 */
  async requestRefund(orderId: string, userId: string, reason: string, amount?: number): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
    this.validateTransition(order.status, 'refunding');

    order.status = 'refunding';
    order.refundReason = reason;
    order.refundAmount = amount || Number(order.finalAmount);
    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /** 完成退款（管理员操作） */
  async completeRefund(orderId: string): Promise<ProductOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    this.validateTransition(order.status, 'refunded');

    order.status = 'refunded';
    order.payStatus = 2;
    order.refundAt = new Date();

    // 归还库存
    await this.restoreStock(orderId);

    return this.orderRepo.save(order as unknown as ProductOrder);
  }

  /* ═══════════════════════════════════════════
     工具方法
     ═══════════════════════════════════════════ */

  private validateTransition(currentStatus: string, targetStatus: string): void {
    const allowed = STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `不允许从「${currentStatus}」变更为「${targetStatus}」`,
      );
    }
  }

  private async restoreStock(orderId: string): Promise<void> {
    const items = await this.itemRepo.find({ where: { orderId } });
    for (const item of items) {
      // 原子归还库存
      await this.productRepo
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `stock + ${item.quantity}` })
        .where('id = :id AND stock >= 0', { id: item.productId })
        .execute();
    }
  }

  private generateOrderNo(): string {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WJHPD${date}${rand}`;
  }
}
