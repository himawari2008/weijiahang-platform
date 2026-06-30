import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { SettlementRecord } from '../../database/entities/settlement-record.entity';
import { Order } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { NavigatorTierService } from '../navigator-tier/navigator-tier.service';

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(SettlementRecord)
    private readonly settlementRepo: Repository<SettlementRecord>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Navigator)
    private readonly navRepo: Repository<Navigator>,
    private readonly tierService: NavigatorTierService,
  ) {}

  // Settle an order when completed
  async settleOrder(orderId: string): Promise<SettlementRecord> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (!order.navigatorId) throw new BadRequestException('订单没有关联领航员');
    if (order.status !== 'completed') throw new BadRequestException('订单未完成');

    // Check if already settled
    const existing = await this.settlementRepo.findOne({ where: { orderId } });
    if (existing) throw new BadRequestException('订单已结算');

    // Get tier commission
    const tierInfo = await this.tierService.calculateTier(order.navigatorId);
    const commissionRate = tierInfo.commissionRate / 100;

    const amount = order.amount;
    const platformCommission = Math.round(amount * commissionRate * 100) / 100;
    const navigatorIncome = Math.round((amount - platformCommission) * 100) / 100;
    const originalCommission = Math.round(amount * 0.2 * 100) / 100;
    const tierDiscount = Math.round((originalCommission - platformCommission) * 100) / 100;

    const record = this.settlementRepo.create({
      navigatorId: order.navigatorId,
      orderId,
      amount,
      platformCommission,
      navigatorIncome,
      tierDiscount: tierDiscount > 0 ? tierDiscount : 0,
      status: 'pending',
    } as any);

    const saved = await this.settlementRepo.save(record as unknown as SettlementRecord);

    // Auto-credit to navigator balance
    const nav = await this.navRepo.findOne({ where: { id: order.navigatorId } });
    if (nav) {
      nav.balance = Number(nav.balance) + navigatorIncome;
      nav.totalEarned = Number(nav.totalEarned) + navigatorIncome;
      await this.navRepo.save(nav as unknown as Navigator);
    }

    // Update record status
    saved.status = 'credited';
    saved.creditedAt = new Date();
    return this.settlementRepo.save(saved as unknown as SettlementRecord);
  }

  // Get paginated settlement records for a navigator
  async getNavigatorSettlements(
    navigatorId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ items: SettlementRecord[]; total: number; page: number; pageSize: number }> {
    const [items, total] = await this.settlementRepo.findAndCount({
      where: { navigatorId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  // Get all pending settlements (admin)
  async getPendingSettlements(): Promise<SettlementRecord[]> {
    return this.settlementRepo.find({ where: { status: 'pending' }, order: { createdAt: 'DESC' } });
  }

  /** 管理员：获取所有结算记录（分页） */
  async findAll(page = 1, pageSize = 20): Promise<{ items: SettlementRecord[]; total: number }> {
    const [items, total] = await this.settlementRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 管理员：驳回结算 */
  async rejectSettlement(id: string, reason?: string): Promise<SettlementRecord> {
    const record = await this.settlementRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('结算记录不存在');
    record.status = 'rejected';
    if (reason) (record as any).remark = reason;
    record.creditedAt = new Date();
    return this.settlementRepo.save(record as unknown as SettlementRecord);
  }

  /** 管理员：批量打款 */
  async batchPay(ids: string[]): Promise<{ paid: string[]; failed: string[] }> {
    const paid: string[] = [];
    const failed: string[] = [];
    for (const id of ids) {
      try {
        const record = await this.settlementRepo.findOne({ where: { id } });
        if (record && record.status === 'credited') {
          record.status = 'paid';
          (record as any).paidAt = new Date();
          await this.settlementRepo.save(record as unknown as SettlementRecord);
          paid.push(id);
        } else {
          failed.push(id);
        }
      } catch {
        failed.push(id);
      }
    }
    return { paid, failed };
  }

  // Approve a settlement (admin)
  async approveSettlement(id: string): Promise<SettlementRecord> {
    const record = await this.settlementRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('结算记录不存在');
    record.status = 'credited';
    record.creditedAt = new Date();
    return this.settlementRepo.save(record as unknown as SettlementRecord);
  }

  // Get today's total settlement for a navigator
  async getTodaySettlementTotal(navigatorId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const result = await this.settlementRepo
      .createQueryBuilder('sr')
      .select('COALESCE(SUM(sr.navigatorIncome), 0)', 'total')
      .where('sr.navigatorId = :navId', { navId: navigatorId })
      .andWhere('sr.createdAt >= :today', { today: todayStart })
      .getRawOne<{ total: number }>();

    return Number(result?.total || 0);
  }

  // Get monthly stats for a navigator
  async getMonthlyStats(navigatorId: string): Promise<{
    monthlyIncome: number;
    monthlyOrders: number;
    totalIncome: number;
    totalOrders: number;
    pendingAmount: number;
  }> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthIncomeResult, monthOrders, totalIncomeResult, totalOrders, pendingResult] = await Promise.all([
      this.settlementRepo
        .createQueryBuilder('sr')
        .select('COALESCE(SUM(sr.navigatorIncome), 0)', 'total')
        .where('sr.navigatorId = :navId', { navId: navigatorId })
        .andWhere('sr.createdAt >= :monthStart', { monthStart })
        .getRawOne<{ total: number }>(),
      this.settlementRepo.count({
        where: { navigatorId, createdAt: { $gte: monthStart } } as any,
      }),
      this.settlementRepo
        .createQueryBuilder('sr')
        .select('COALESCE(SUM(sr.navigatorIncome), 0)', 'total')
        .where('sr.navigatorId = :navId', { navId: navigatorId })
        .getRawOne<{ total: number }>(),
      this.settlementRepo.count({ where: { navigatorId } }),
      this.settlementRepo
        .createQueryBuilder('sr')
        .select('COALESCE(SUM(sr.navigatorIncome), 0)', 'total')
        .where('sr.navigatorId = :navId', { navId: navigatorId })
        .andWhere('sr.status = :status', { status: 'pending' })
        .getRawOne<{ total: number }>(),
    ]);

    return {
      monthlyIncome: Number(monthIncomeResult?.total || 0),
      monthlyOrders: monthOrders,
      totalIncome: Number(totalIncomeResult?.total || 0),
      totalOrders,
      pendingAmount: Number(pendingResult?.total || 0),
    };
  }
}
