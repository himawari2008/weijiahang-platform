import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsLog } from '../../database/entities/points-log.entity';
import { ReferralRecord } from '../../database/entities/referral-record.entity';
import { User } from '../../database/entities/user.entity';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointsLog, ReferralRecord, User])],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
