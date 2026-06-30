import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantWithdraw } from '../../database/entities/merchant-withdraw.entity';
import { Order } from '../../database/entities/order.entity';
import { MerchantFinanceService } from './merchant-finance.service';
import { MerchantFinanceController } from './merchant-finance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantWithdraw, Order]),
  ],
  controllers: [MerchantFinanceController],
  providers: [MerchantFinanceService],
  exports: [MerchantFinanceService],
})
export class MerchantFinanceModule {}
