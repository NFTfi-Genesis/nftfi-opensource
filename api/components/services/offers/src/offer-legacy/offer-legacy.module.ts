import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer, OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { AssetContract } from '@nftfi.api/services/assets';
import { OfferNotificationModule } from '../offer-notification';
import { OfferController } from './offer-base.controller';
import { OfferV01Controller } from './offer-v01.controller';
import { OfferV01Service } from './offer-v01.service';
import { OfferCountV01Controller } from './offer-count-v01.controller';
import { OfferCountV01Service } from './offer-count-v01.service';
import { OfferV02Controller } from './offer-v02.controller';
import { OfferV03Controller } from './offer-v03.controller';
import { OfferV03Service } from './offer-v03.service';

@Module({
  imports: [TypeOrmModule.forFeature([Offer, MarketLoan]), OfferNotificationModule, AssetContract.forRoot()],
  controllers: [OfferController, OfferV01Controller, OfferCountV01Controller, OfferV02Controller, OfferV03Controller],
  providers: [OfferV01Service, OfferCountV01Service, OfferV03Service, OfferRepository, MarketLoanRepository]
})
export class OfferLegacyModule {}
