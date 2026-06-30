import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  /** 搜索商品：按品类/关键词/城市/店铺搜索，分页，按价格/新品/销量排序 */
  async search(dto: QueryProductDto): Promise<{ list: Product[]; total: number }> {
    const { shopId, marketId, category, keyword, city, page = 1, pageSize = 20, sort, limit } = dto;

    // limit 作为 pageSize 别名
    const effectivePageSize = limit || pageSize;

    // 映射 sort 值：前端可能传 sales / newest / price_asc / price_desc / popular
    const sortBy = sort || 'newest';

    const qb = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('shop.market', 'market')
      .where('product.isOnSale = :isOnSale', { isOnSale: true });

    // 按城市过滤（通过 Shop → Market 关联）
    if (city) {
      qb.andWhere('market.city = :city', { city });
    }

    // 按店铺过滤
    if (shopId) {
      qb.andWhere('product.shopId = :shopId', { shopId });
    }

    // 按市场过滤（通过 Shop → Market 关联）
    if (marketId) {
      qb.andWhere('shop.marketId = :marketId', { marketId });
    }

    // 按品类过滤
    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    // 关键词模糊搜索（名称/描述）
    if (keyword) {
      qb.andWhere(
        '(product.name ILIKE :kw OR product.description ILIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    // 排序
    switch (sortBy) {
      case 'sales':
      case 'popular':
        qb.orderBy('product.salesCount', 'DESC');
        break;
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }

    const [list, total] = await qb
      .skip((page - 1) * effectivePageSize)
      .take(effectivePageSize)
      .getManyAndCount();

    return { list, total };
  }

  /** 商品详情 */
  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  /** 某店铺所有在售商品 */
  async findByShop(shopId: string): Promise<Product[]> {
    return this.productRepo.find({
      where: { shopId, isOnSale: true },
      order: { sortOrder: 'DESC', createdAt: 'DESC' },
    });
  }

  /** 商户上架商品 */
  async create(shopId: string, dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create({
      shopId,
      name: dto.name,
      category: dto.category,
      spec: dto.spec || null,
      price: dto.price || null,
      priceUnit: dto.priceUnit || '㎡',
      images: dto.images || [],
      description: dto.description || null,
      isOnSale: dto.isOnSale !== undefined ? dto.isOnSale : true,
      sortOrder: dto.sortOrder || 0,
    } as any);

    return this.productRepo.save(product as unknown as Product);
  }

  /** 编辑商品 */
  async update(id: string, dto: Partial<CreateProductDto>): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');

    Object.assign(product, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.spec !== undefined && { spec: dto.spec }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.priceUnit !== undefined && { priceUnit: dto.priceUnit }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isOnSale !== undefined && { isOnSale: dto.isOnSale }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    });

    return this.productRepo.save(product);
  }

  /** 下架商品（软删除） */
  async delete(id: string): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('商品不存在');

    product.isOnSale = false;
    await this.productRepo.save(product);
  }

  /** 批量更新商品 */
  async batchUpdate(ids: string[], data: Record<string, any>): Promise<{ updated: number }> {
    const updateData: any = {};
    if (data.isOnSale !== undefined) updateData.isOnSale = data.isOnSale;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.category !== undefined) updateData.category = data.category;

    const result = await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set(updateData)
      .where('id IN (:...ids)', { ids })
      .execute();

    return { updated: result.affected || 0 };
  }

  /** 批量删除商品（软下架） */
  async batchDelete(ids: string[]): Promise<void> {
    await this.productRepo
      .createQueryBuilder()
      .update(Product)
      .set({ isOnSale: false })
      .where('id IN (:...ids)', { ids })
      .execute();
  }

  /** 热门品类统计 */
  async getHotCategories(): Promise<{ category: string; count: number }[]> {
    const raw = await this.productRepo
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .addSelect('COUNT(product.id)', 'count')
      .where('product.isOnSale = :isOnSale', { isOnSale: true })
      .groupBy('product.category')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    return raw.map((r: any) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));
  }
}
