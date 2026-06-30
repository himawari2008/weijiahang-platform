import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import { MerchantCustomer } from '../../database/entities/merchant-customer.entity';

@Injectable()
export class MerchantCrmService {
  constructor(
    @InjectRepository(MerchantCustomer)
    private readonly customerRepo: Repository<MerchantCustomer>,
  ) {}

  // Get paginated customer list with search
  async getCustomers(
    shopId: string,
    page: number = 1,
    pageSize: number = 20,
    keyword?: string,
  ): Promise<{ items: MerchantCustomer[]; total: number; page: number; pageSize: number }> {
    const where: any = { shopId };

    if (keyword) {
      where.tags = Like(`%${keyword}%`);
    }

    const [items, total] = await this.customerRepo.findAndCount({
      where,
      order: { totalAmount: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  // Get customer detail
  async getCustomerDetail(shopId: string, customerId: string): Promise<MerchantCustomer> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, shopId },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    return customer;
  }

  // Update customer tags
  async updateTags(shopId: string, customerId: string, tags: string[]): Promise<MerchantCustomer> {
    const customer = await this.getCustomerDetail(shopId, customerId);
    customer.tags = tags;
    return this.customerRepo.save(customer as unknown as MerchantCustomer);
  }

  // Update customer notes
  async updateNotes(shopId: string, customerId: string, notes: string): Promise<MerchantCustomer> {
    const customer = await this.getCustomerDetail(shopId, customerId);
    customer.notes = notes;
    return this.customerRepo.save(customer as unknown as MerchantCustomer);
  }

  // Get customer stats
  async getCustomerStats(shopId: string): Promise<{
    totalCustomers: number;
    newThisMonth: number;
    repeatRate: number;
    totalRevenue: number;
  }> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalCustomers, newThisMonth, repeatCustomers] = await Promise.all([
      this.customerRepo.count({ where: { shopId } }),
      this.customerRepo.count({
        where: { shopId, createdAt: { $gte: monthStart } } as any,
      }),
      this.customerRepo.count({
        where: { shopId, totalOrders: { $gte: 2 } } as any,
      }),
    ]);

    const revenueResult = await this.customerRepo
      .createQueryBuilder('mc')
      .select('COALESCE(SUM(mc.totalAmount), 0)', 'total')
      .where('mc.shopId = :shopId', { shopId })
      .getRawOne<{ total: number }>();

    return {
      totalCustomers,
      newThisMonth,
      repeatRate: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
      totalRevenue: Number(revenueResult?.total || 0),
    };
  }
}
