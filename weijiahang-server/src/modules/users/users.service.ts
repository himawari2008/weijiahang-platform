import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UserAddress } from '../../database/entities/user-address.entity';
import { ShopFavorite } from '../../database/entities/shop-favorite.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserAddress)
    private readonly addressRepo: Repository<UserAddress>,

    @InjectRepository(ShopFavorite)
    private readonly favoriteRepo: Repository<ShopFavorite>,
  ) {}

  /** 微信登录：根据openid查找或创建用户 */
  async findByOpenidOrCreate(
    openid: string,
    unionid?: string,
  ): Promise<User> {
    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      user = this.userRepo.create({ openid, unionid });
      await this.userRepo.save(user);
    } else if (unionid && !user.unionid) {
      user.unionid = unionid;
      await this.userRepo.save(user);
    }
    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserDto | UpdateProfileDto): Promise<User> {
    await this.userRepo.update(id, dto as any);
    return this.findById(id);
  }

  // ---- 收货地址 ----

  /** 创建收货地址 */
  async createAddress(userId: string, dto: CreateAddressDto): Promise<UserAddress> {
    // 如果是第一个地址或标记为默认，先取消其他默认
    const count = await this.addressRepo.count({ where: { userId, status: 1 } });
    const isDefault = dto.isDefault ?? count === 0;

    if (isDefault) {
      await this.addressRepo.update({ userId, isDefault: true }, { isDefault: false });
    }

    const address = this.addressRepo.create({ ...dto, userId, isDefault });
    return this.addressRepo.save(address);
  }

  /** 获取用户收货地址列表 */
  async getAddresses(userId: string): Promise<UserAddress[]> {
    return this.addressRepo.find({
      where: { userId, status: 1 },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  // ---- 收藏 ----

  /** 获取用户收藏列表（目前仅支持店铺收藏） */
  async getFavorites(userId: string, type?: string): Promise<ShopFavorite[]> {
    return this.favoriteRepo.find({
      where: { userId },
      relations: ['shop'],
      order: { createdAt: 'DESC' },
    });
  }

  /** 添加店铺收藏 */
  async addFavorite(userId: string, shopId: string): Promise<ShopFavorite> {
    const existing = await this.favoriteRepo.findOne({ where: { userId, shopId } });
    if (existing) {
      throw new ConflictException('已收藏该店铺');
    }
    const fav = this.favoriteRepo.create({ userId, shopId });
    return this.favoriteRepo.save(fav);
  }

  /** 删除店铺收藏 */
  async removeFavorite(userId: string, shopId: string): Promise<void> {
    const result = await this.favoriteRepo.delete({ userId, shopId });
    if (result.affected === 0) {
      throw new NotFoundException('未找到该收藏记录');
    }
  }
}
