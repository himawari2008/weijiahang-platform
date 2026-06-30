import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantCustomer } from '../../database/entities/merchant-customer.entity';
import { MerchantCrmService } from './merchant-crm.service';
import { MerchantCrmController } from './merchant-crm.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantCustomer]),
  ],
  controllers: [MerchantCrmController],
  providers: [MerchantCrmService],
  exports: [MerchantCrmService],
})
export class MerchantCrmModule {}
