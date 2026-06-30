import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Navigator } from '../../database/entities/navigator.entity';
import { NavigatorsService } from './navigators.service';
import { NavigatorsController } from './navigators.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Navigator]),
    forwardRef(() => OrdersModule),
  ],
  controllers: [NavigatorsController],
  providers: [NavigatorsService],
  exports: [NavigatorsService],
})
export class NavigatorsModule {}
