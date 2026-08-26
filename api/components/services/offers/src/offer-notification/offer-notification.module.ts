import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer, OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { OfferNotificationService } from './offer-notification.service';
import { OfferNotificationScheduler } from './offer-notification.scheduler';
import { OfferNotificationContextService } from './offer-notification-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Offer, MarketLoan])],
  providers: [
    OfferNotificationScheduler,
    OfferNotificationService,
    OfferNotificationContextService,
    OfferRepository,
    MarketLoanRepository
  ],
  exports: [OfferNotificationService]
})
export class OfferNotificationModule {}
