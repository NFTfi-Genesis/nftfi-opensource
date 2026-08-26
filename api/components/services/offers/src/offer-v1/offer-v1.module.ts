import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer, OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { AssetContract } from '@nftfi.api/services/assets';
import { OfferNotificationModule } from '../offer-notification';
import { OfferRpcController } from './offer-rpc.controller';
import { OfferV1Controller } from './offer-v1.controller';
import { OfferV1Scheduler } from './offer-v1.scheduler';
import { OfferV1Service } from './offer-v1.service';
import { OfferV1DurationValidationPipe, OfferV1LimitValidationPipe } from './pipes';

@Module({
  imports: [TypeOrmModule.forFeature([Offer, MarketLoan]), OfferNotificationModule, AssetContract.forRoot()],
  controllers: [OfferV1Controller, OfferRpcController],
  providers: [
    OfferV1Service,
    OfferV1Scheduler,
    OfferRepository,
    MarketLoanRepository,
    OfferV1DurationValidationPipe,
    OfferV1LimitValidationPipe
  ]
})
export class OfferV1Module {}
