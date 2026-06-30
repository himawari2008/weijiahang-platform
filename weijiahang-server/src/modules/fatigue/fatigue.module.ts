import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NavigatorOnlineRecord } from '../../database/entities/navigator-online-record.entity';
import { Navigator } from '../../database/entities/navigator.entity';
import { FatigueService } from './fatigue.service';
import { FatigueController } from './fatigue.controller';
import { OrdersModule } from '../orders/orders.module';

/**
 * 疲劳监测模块
 * 监测领航员在线时长，定时检查疲劳状态
 * 阈值: 4小时提醒休息，12小时强制下线
 * 休息奖励: 离线满2小时可获奖金
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NavigatorOnlineRecord, Navigator]),
    OrdersModule,
  ],
  controllers: [FatigueController],
  providers: [FatigueService],
  exports: [FatigueService],
})
export class FatigueModule {}
