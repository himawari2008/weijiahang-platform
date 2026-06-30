import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Beacon } from '../../database/entities/beacon.entity';
import { BeaconsService } from './beacons.service';
import { BeaconsController } from './beacons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Beacon])],
  controllers: [BeaconsController],
  providers: [BeaconsService],
  exports: [BeaconsService],
})
export class BeaconsModule {}
