import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispatchRecord } from '../../database/entities/dispatch-record.entity';
import { Order } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { OrdersModule } from '../orders/orders.module';

/**
 * 智能派单模块
 * 负责领航员匹配、派单、广播通知
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DispatchRecord, Order, Navigator]),
    forwardRef(() => OrdersModule),
  ],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
