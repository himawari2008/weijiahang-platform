import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductOrder } from '../../database/entities/product-order.entity';
import { ProductOrderItem } from '../../database/entities/product-order-item.entity';
import { Product } from '../../database/entities/product.entity';
import { User } from '../../database/entities/user.entity';
import { CustomerTier } from '../../database/entities/customer-tier.entity';
import { ProductOrderService } from './product-order.service';
import { ProductOrderController } from './product-order.controller';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationModule } from '../notification/notification.module';

/**
 * 商品采购订单模块
 * 管理选品→下单→支付→备货→发货→收货→售后全链路
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ProductOrder, ProductOrderItem, Product, User, CustomerTier]),
    PricingModule,
    NotificationModule,
  ],
  controllers: [ProductOrderController],
  providers: [ProductOrderService],
  exports: [ProductOrderService],
})
export class ProductOrderModule {}
