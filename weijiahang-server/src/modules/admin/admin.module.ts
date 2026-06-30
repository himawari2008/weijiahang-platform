import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CircuitBreakerController } from '../../common/circuit-breaker/circuit-breaker.controller';
import { SettlementModule } from '../settlement/settlement.module';
import { MerchantFinanceModule } from '../merchant-finance/merchant-finance.module';
import { AdsModule } from '../ads/ads.module';
import { MarketingModule } from '../marketing/marketing.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CouponModule } from '../coupon/coupon.module';
import { ProductOrderModule } from '../product-order/product-order.module';
import { CustomerTierModule } from '../customer-tier/customer-tier.module';
import { PlatformMessageModule } from '../platform-message/platform-message.module';
import { BeaconsModule } from '../beacons/beacons.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MarketsModule } from '../markets/markets.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { User } from '../../database/entities/user.entity';
import { Shop } from '../../database/entities/shop.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { Order } from '../../database/entities/order.entity';
import { AdminUser } from '../../database/entities/admin-user.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Shop, Navigator, Order, AdminUser, SystemConfig]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
    SettlementModule,
    MerchantFinanceModule,
    AdsModule,
    MarketingModule,
    ReviewsModule,
    CouponModule,
    ProductOrderModule,
    CustomerTierModule,
    PlatformMessageModule,
    BeaconsModule,
    AuditLogModule,
    MarketsModule,
    AnalyticsModule,
  ],
  controllers: [AdminController, CircuitBreakerController],
  providers: [AdminService, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
