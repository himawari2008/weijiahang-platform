import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTier } from '../../database/entities/customer-tier.entity';
import { CustomerTierConfig } from '../../database/entities/customer-tier-config.entity';
import { User } from '../../database/entities/user.entity';
import { CustomerTierService } from './customer-tier.service';
import { CustomerTierController } from './customer-tier.controller';

/**
 * 客户分层模块
 * 提供客群等级计算、阈值配置、自动评估等功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerTier, CustomerTierConfig, User]),
  ],
  controllers: [CustomerTierController],
  providers: [CustomerTierService],
  exports: [CustomerTierService],
})
export class CustomerTierModule {}
