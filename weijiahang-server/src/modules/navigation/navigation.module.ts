import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NavigationService } from './navigation.service';
import { NavigationController } from './navigation.controller';
import { BeaconsModule } from '../beacons/beacons.module';
import { NavTrack } from '../../database/entities/nav-track.entity';
import { Shop } from '../../database/entities/shop.entity';
import { Market } from '../../database/entities/market.entity';
import { Beacon } from '../../database/entities/beacon.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NavTrack, Shop, Market, Beacon]),
    BeaconsModule,
  ],
  controllers: [NavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}
