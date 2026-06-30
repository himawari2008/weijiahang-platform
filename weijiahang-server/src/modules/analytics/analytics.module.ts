import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { User } from '../../database/entities/user.entity';
import { Shop } from '../../database/entities/shop.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { Market } from '../../database/entities/market.entity';
import { Beacon } from '../../database/entities/beacon.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, User, Shop, Navigator, Market, Beacon]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
