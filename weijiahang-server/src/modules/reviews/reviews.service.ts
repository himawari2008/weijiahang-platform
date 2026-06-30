import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../database/entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

export interface ReviewStats {
  averageRating: number;
  averageQuality: number | null;
  averagePrice: number | null;
  averageService: number | null;
  total: number;
  distribution: { [star: number]: number };
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  /** 提交评价（区分店铺/领航员） */
  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    // 校验：同一订单不能重复评价同一对象
    const existing = await this.reviewRepo.findOne({
      where: {
        orderId: dto.orderId,
        reviewerId: userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
    if (existing) {
      throw new BadRequestException('您已评价过该订单');
    }

    const review = this.reviewRepo.create({
      orderId: dto.orderId,
      reviewerId: userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      rating: dto.rating,
      qualityRating: dto.qualityRating ?? null,
      priceRating: dto.priceRating ?? null,
      serviceRating: dto.serviceRating ?? null,
      tags: dto.tags || [],
      content: dto.content || null,
      images: dto.images || [],
      isAnonymous: dto.isAnonymous || false,
      status: 1,
    } as any);

    return this.reviewRepo.save(review as unknown as Review);
  }

  /** 店铺评价列表（含统计数据） */
  async findByShop(
    shopId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: Review[]; total: number; stats: ReviewStats }> {
    const [list, total] = await this.reviewRepo.findAndCount({
      where: { targetType: 'shop', targetId: shopId, status: 1 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const stats = await this.calcStats(shopId, 'shop');

    return { list, total, stats };
  }

  /** 领航员评价列表 */
  async findByNavigator(
    navId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ list: Review[]; total: number; stats: ReviewStats }> {
    const [list, total] = await this.reviewRepo.findAndCount({
      where: { targetType: 'navigator', targetId: navId, status: 1 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const stats = await this.calcStats(navId, 'navigator');

    return { list, total, stats };
  }

  /** 店铺评分统计（各维度平均分） */
  async getShopRatingStats(shopId: string): Promise<ReviewStats> {
    return this.calcStats(shopId, 'shop');
  }

  /** 商家/领航员回复评价 */
  async reply(reviewId: string, dto: ReplyReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('评价不存在');
    if (review.reply) {
      throw new BadRequestException('该评价已有回复');
    }

    review.reply = dto.replyContent;
    review.repliedAt = new Date();
    return this.reviewRepo.save(review);
  }

  /** 运营隐藏评价 */
  async hide(reviewId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('评价不存在');
    if (review.status === 0) {
      throw new BadRequestException('评价已被隐藏');
    }

    review.status = 0;
    return this.reviewRepo.save(review);
  }

  // ---- Admin 管理方法 ----

  /** 管理员：获取全平台评价（分页+筛选） */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    targetType?: string;
    status?: number;
    keyword?: string;
  } = {}): Promise<{ items: Review[]; total: number }> {
    const { page = 1, pageSize = 20, targetType, status } = params;
    const where: any = {};
    if (targetType) where.targetType = targetType;
    if (status !== undefined) where.status = status;

    const [items, total] = await this.reviewRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 管理员：审核操作（隐藏/显示） */
  async moderate(id: string, action: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('评价不存在');

    switch (action) {
      case 'hide': review.status = 0; break;
      case 'show': review.status = 1; break;
      case 'flag': review.status = -1; break;
      default: throw new BadRequestException('无效操作：' + action);
    }
    return this.reviewRepo.save(review);
  }

  // ---- 私有方法 ----

  /** 计算评价统计 */
  private async calcStats(targetId: string, targetType: string): Promise<ReviewStats> {
    const raw = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avgRating')
      .addSelect('AVG(r.qualityRating)', 'avgQuality')
      .addSelect('AVG(r.priceRating)', 'avgPrice')
      .addSelect('AVG(r.serviceRating)', 'avgService')
      .addSelect('COUNT(r.id)', 'total')
      .where('r.targetId = :targetId', { targetId })
      .andWhere('r.targetType = :targetType', { targetType })
      .andWhere('r.status = 1')
      .getRawOne();

    // 各星级分布
    const distributionRaw = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.rating', 'star')
      .addSelect('COUNT(r.id)', 'cnt')
      .where('r.targetId = :targetId', { targetId })
      .andWhere('r.targetType = :targetType', { targetType })
      .andWhere('r.status = 1')
      .groupBy('r.rating')
      .orderBy('r.rating', 'ASC')
      .getRawMany();

    const distribution: { [star: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distributionRaw) {
      distribution[Number(row.star)] = parseInt(row.cnt, 10);
    }

    return {
      averageRating: raw.avgRating ? parseFloat(Number(raw.avgRating).toFixed(1)) : 0,
      averageQuality: raw.avgQuality !== null ? parseFloat(Number(raw.avgQuality).toFixed(1)) : null,
      averagePrice: raw.avgPrice !== null ? parseFloat(Number(raw.avgPrice).toFixed(1)) : null,
      averageService: raw.avgService !== null ? parseFloat(Number(raw.avgService).toFixed(1)) : null,
      total: raw.total ? parseInt(raw.total, 10) : 0,
      distribution,
    };
  }
}
