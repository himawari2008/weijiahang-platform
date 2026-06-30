import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { MerchantWithdraw } from '../../database/entities/merchant-withdraw.entity';
import { Order } from '../../database/entities/order.entity';

@Injectable()
export class MerchantFinanceService {
  constructor(
    @InjectRepository(MerchantWithdraw)
    private readonly withdrawRepo: Repository<MerchantWithdraw>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  // Get finance overview for a shop
  async getFinanceOverview(shopId: string): Promise<{
    todayIncome: number;
    monthIncome: number;
    pendingSettlement: number;
    totalWithdrawn: number;
    availableBalance: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayIncomeResult, monthIncomeResult, pendingResult, withdrawnResult] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.amount), 0)', 'total')
        .where('order.shopId = :shopId', { shopId })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt >= :today', { today: todayStart })
        .getRawOne<{ total: number }>(),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.amount), 0)', 'total')
        .where('order.shopId = :shopId', { shopId })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.createdAt >= :monthStart', { monthStart })
        .getRawOne<{ total: number }>(),
      this.orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.amount), 0)', 'total')
        .where('order.shopId = :shopId', { shopId })
        .andWhere('order.status = :status', { status: 'completed' })
        .andWhere('order.payStatus = :payStatus', { payStatus: 0 })
        .getRawOne<{ total: number }>(),
      this.withdrawRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.amount), 0)', 'total')
        .where('w.shopId = :shopId', { shopId })
        .andWhere('w.status = :status', { status: 'completed' })
        .getRawOne<{ total: number }>(),
    ]);

    const todayIncome = Number(todayIncomeResult?.total || 0);
    const monthIncome = Number(monthIncomeResult?.total || 0);
    const pendingSettlement = Number(pendingResult?.total || 0);
    const totalWithdrawn = Number(withdrawnResult?.total || 0);
    const availableBalance = monthIncome - totalWithdrawn;

    return {
      todayIncome,
      monthIncome,
      pendingSettlement,
      totalWithdrawn,
      availableBalance: Math.max(0, availableBalance),
    };
  }

  // Get transaction records
  async getTransactionRecords(
    shopId: string,
    page: number = 1,
    pageSize: number = 20,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ items: Order[]; total: number; page: number; pageSize: number }> {
    const where: any = { shopId, status: 'completed' };

    if (dateFrom && dateTo) {
      where.createdAt = Between(new Date(dateFrom), new Date(dateTo));
    }

    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  // Get withdrawal history
  async getWithdrawHistory(shopId: string): Promise<MerchantWithdraw[]> {
    return this.withdrawRepo.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
    });
  }

  // Request withdrawal
  async requestWithdraw(
    shopId: string,
    amount: number,
    method: string,
  ): Promise<MerchantWithdraw> {
    const overview = await this.getFinanceOverview(shopId);
    if (amount > overview.availableBalance) {
      throw new BadRequestException('可提现余额不足');
    }

    const record = this.withdrawRepo.create({
      shopId,
      amount,
      method,
      status: 'pending',
      appliedAt: new Date(),
    } as any);

    return this.withdrawRepo.save(record as unknown as MerchantWithdraw);
  }

  // Approve withdrawal (admin)
  async approveWithdraw(id: string): Promise<MerchantWithdraw> {
    const record = await this.withdrawRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('提现记录不存在');
    if (record.status !== 'pending') throw new BadRequestException('只能审批待审核的提现');

    record.status = 'approved';
    record.approvedAt = new Date();
    return this.withdrawRepo.save(record as unknown as MerchantWithdraw);
  }

  // Reject withdrawal (admin)
  async rejectWithdraw(id: string, reason: string): Promise<MerchantWithdraw> {
    const record = await this.withdrawRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('提现记录不存在');
    if (record.status !== 'pending') throw new BadRequestException('只能驳回待审核的提现');

    record.status = 'rejected';
    record.remark = reason;
    return this.withdrawRepo.save(record as unknown as MerchantWithdraw);
  }
}
