import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Order } from '../../database/entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { WsJwtAuthGuard } from '../../common/guards/ws-jwt-auth.guard';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    forwardRef(() => SettlementModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret'),
      }),
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, WsJwtAuthGuard],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
