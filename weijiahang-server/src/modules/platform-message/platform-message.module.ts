import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplate } from '../../database/entities/message-template.entity';
import { User } from '../../database/entities/user.entity';
import { PlatformMessageService } from './platform-message.service';
import { PlatformMessageController } from './platform-message.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageTemplate, User]),
    NotificationModule,
  ],
  controllers: [PlatformMessageController],
  providers: [PlatformMessageService],
  exports: [PlatformMessageService],
})
export class PlatformMessageModule {}
