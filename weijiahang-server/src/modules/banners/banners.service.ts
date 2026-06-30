import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '../../database/entities/banner.entity';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepo: Repository<Banner>,
  ) {}

  /** 获取指定位置的有效 Banner（按排序权重排列） */
  async findActive(position?: string): Promise<Banner[]> {
    const qb = this.bannerRepo.createQueryBuilder('banner')
      .where('banner.isActive = :isActive', { isActive: true });

    if (position) {
      qb.andWhere('banner.position = :position', { position });
    }

    return qb.orderBy('banner.sortOrder', 'ASC')
      .addOrderBy('banner.createdAt', 'DESC')
      .getMany();
  }

  /** 所有 Banner（管理端） */
  async findAll(): Promise<Banner[]> {
    return this.bannerRepo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  /** 创建 Banner */
  async create(data: Partial<Banner>): Promise<Banner> {
    const banner = this.bannerRepo.create(data as any);
    return this.bannerRepo.save(banner) as unknown as Banner;
  }

  /** 更新 Banner */
  async update(id: string, data: Partial<Banner>): Promise<Banner> {
    await this.bannerRepo.update(id, data as any);
    return (await this.bannerRepo.findOne({ where: { id } })) as Banner;
  }

  /** 删除 Banner */
  async delete(id: string): Promise<void> {
    await this.bannerRepo.delete(id);
  }
}
