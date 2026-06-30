import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from '../../database/entities/coupon.entity';
import { UserCoupon } from '../../database/entities/user-coupon.entity';
import { User } from '../../database/entities/user.entity';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, UserCoupon, User])],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
