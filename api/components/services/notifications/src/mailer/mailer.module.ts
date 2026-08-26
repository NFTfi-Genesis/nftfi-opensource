import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, NotificationRepository } from '@nftfi.api/repositories/postgres/notification';
import { MailerController } from './mailer.controller';
import { MailerScheduler } from './mailer.scheduler';
import { TransportProvider } from './transport.provider';
import { MailerService } from './mailer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [TransportProvider, MailerService, MailerScheduler, NotificationRepository],
  controllers: [MailerController]
})
export class MailerModule {}
