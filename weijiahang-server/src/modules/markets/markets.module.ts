import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Market } from '../../database/entities/market.entity';
import { SystemConfig } from '../../database/entities/system-config.entity';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { ShopsModule } from '../shops/shops.module';

@Module({
  imports: [TypeOrmModule.forFeature([Market, SystemConfig]), ShopsModule],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
