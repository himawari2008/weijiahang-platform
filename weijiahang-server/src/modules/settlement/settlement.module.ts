import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementRecord } from '../../database/entities/settlement-record.entity';
import { Order } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { NavigatorTierModule } from '../navigator-tier/navigator-tier.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettlementRecord, Order, Navigator]),
    forwardRef(() => NavigatorTierModule),
  ],
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
