import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ShopsModule } from './modules/shops/shops.module';
import { MarketsModule } from './modules/markets/markets.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NavigatorsModule } from './modules/navigators/navigators.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AdsModule } from './modules/ads/ads.module';
import { AiModule } from './modules/ai/ai.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProductsModule } from './modules/products/products.module';
import { BeaconsModule } from './modules/beacons/beacons.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { DynamicPricingModule } from './modules/dynamic-pricing/dynamic-pricing.module';
import { NotificationModule } from './modules/notification/notification.module';
import { FatigueModule } from './modules/fatigue/fatigue.module';
// Phase 1 — 客户分层（核心交易链路改造）
import { CustomerTierModule } from './modules/customer-tier/customer-tier.module';
// Phase 2 — 采购订单系统
import { ProductOrderModule } from './modules/product-order/product-order.module';
import { PricingModule } from './modules/pricing/pricing.module';
// Phase 3 — 优惠券 & 积分
import { CouponModule } from './modules/coupon/coupon.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
// Phase 4 — 平台话术
import { PlatformMessageModule } from './modules/platform-message/platform-message.module';
// Phase 2 modules
import { NavigatorTierModule } from './modules/navigator-tier/navigator-tier.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { TrainingModule } from './modules/training/training.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MerchantCrmModule } from './modules/merchant-crm/merchant-crm.module';
import { MerchantFinanceModule } from './modules/merchant-finance/merchant-finance.module';
import { ShopHealthModule } from './modules/shop-health/shop-health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { BannersModule } from './modules/banners/banners.module';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // 数据库 — 开发用SQLite免安装，生产切PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('NODE_ENV') === 'development';
        return {
          type: isDev ? 'sqlite' : 'postgres',
          database: isDev ? 'weijiahang-dev.sqlite' : config.get<string>('DB_DATABASE', 'weijiahang'),
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: isDev,
          logging: isDev,
        };
      },
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // 业务模块
    AuthModule,
    UsersModule,
    ShopsModule,
    MarketsModule,
    OrdersModule,
    NavigatorsModule,
    ReviewsModule,
    AdsModule,
    AiModule,
    NavigationModule,
    AdminModule,
    ProductsModule,
    BeaconsModule,
    DispatchModule,
    DynamicPricingModule,
    NotificationModule,
    FatigueModule,
    // Phase 1 — 客户分层
    CustomerTierModule,
    // Phase 2 — 采购订单系统
    ProductOrderModule,
    PricingModule,
    // Phase 3 — 优惠券 & 积分
    CouponModule,
    LoyaltyModule,
    // Phase 4 — 平台话术
    PlatformMessageModule,
    // Phase 2 modules
    NavigatorTierModule,
    GamificationModule,
    SettlementModule,
    TrainingModule,
    MarketingModule,
    MerchantCrmModule,
    MerchantFinanceModule,
    ShopHealthModule,
    AnalyticsModule,
    // 审计日志
    AuditLogModule,
    // Banner 轮播
    BannersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局JWT认证守卫 — 所有接口默认需要登录，@Public() 标记的除外
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 全局审计日志拦截器 — 自动记录所有写操作
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  /**
   * 配置全局中间件
   * CSRF 保护应用于所有非安全方法的写操作请求
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      .forRoutes('*'); // 全局应用，中间件内部通过 skipPaths 和安全方法判断
  }
}
