import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NavigatorTier } from '../../database/entities/navigator-tier.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { NavigatorTierService } from './navigator-tier.service';
import { NavigatorTierController } from './navigator-tier.controller';
import { NavigatorsModule } from '../navigators/navigators.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NavigatorTier, Navigator]),
    forwardRef(() => NavigatorsModule),
  ],
  controllers: [NavigatorTierController],
  providers: [NavigatorTierService],
  exports: [NavigatorTierService],
})
export class NavigatorTierModule {}
