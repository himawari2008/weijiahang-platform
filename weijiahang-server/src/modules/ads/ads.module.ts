import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ad } from '../../database/entities/ad.entity';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ad])],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
