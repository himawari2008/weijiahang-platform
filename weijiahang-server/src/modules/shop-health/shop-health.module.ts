import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from '../../database/entities/shop.entity';
import { Product } from '../../database/entities/product.entity';
import { Order } from '../../database/entities/order.entity';
import { ShopHealthService } from './shop-health.service';
import { ShopHealthController } from './shop-health.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop, Product, Order]),
  ],
  controllers: [ShopHealthController],
  providers: [ShopHealthService],
  exports: [ShopHealthService],
})
export class ShopHealthModule {}
