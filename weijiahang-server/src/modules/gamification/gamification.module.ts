import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NavigatorBadge } from '../../database/entities/navigator-badge.entity';
import { Order } from '../../database/entities/order.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { NavigatorsModule } from '../navigators/navigators.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NavigatorBadge, Order, Navigator]),
    forwardRef(() => NavigatorsModule),
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
