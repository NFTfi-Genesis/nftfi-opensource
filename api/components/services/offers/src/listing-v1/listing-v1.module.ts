import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing, ListingRepository } from '@nftfi.api/repositories/postgres/listing';
import { AuthGuardModule } from '@nftfi.api/modules/auth-guard';
import { AssetContract } from '@nftfi.api/services/assets';
import { Config } from '../config';
import { ListingV1Controller } from './listing-v1.controller';
import { ListingV01Controller } from './listing-v01.controller';
import { ListingLegacyController } from './listing-legacy.controller';
import { ListingV1Service } from './listing-v1.service';
import { ListingNotificationService } from './listing-notification.service';
import { ListingPipe } from './listing.pipe';
import { ListingScheduler } from './listing-v1.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    AssetContract.forRoot(),
    AuthGuardModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<Config['jwt']['secret']>('jwt.secret')
      })
    })
  ],
  controllers: [ListingV1Controller, ListingV01Controller, ListingLegacyController],
  providers: [ListingV1Service, ListingNotificationService, ListingRepository, ListingPipe, ListingScheduler]
})
export class ListingV1Module {}
