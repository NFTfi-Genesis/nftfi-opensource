import { Module } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '@nftfi.api/modules/auth-guard';
import { ListingRepository } from '@nftfi.api/repositories/postgres/listing';
import { RenegotiationRepository } from '@nftfi.api/repositories/postgres/renegotiation';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import * as Offers from '@nftfi.api/services/offers';

@Module({
  controllers: [
    Offers.OfferV01Controller,
    Offers.OfferCountV01Controller,
    Offers.OfferV03Controller,
    Offers.RenegotiationV1Controller,
    Offers.ListingV1Controller,
    Offers.ListingV01Controller,
    Offers.ListingLegacyController
  ],
  providers: [
    { provide: Offers.OfferV01Service, useValue: {} },
    { provide: Offers.OfferCountV01Service, useValue: {} },
    { provide: Offers.OfferV03Service, useValue: {} },
    { provide: Offers.RenegotiationV1Service, useValue: {} },
    { provide: Offers.RenegotiationV1DurationValidationPipe, useValue: {} },
    { provide: Offers.RenegotiationV1OfferValidationPipe, useValue: {} },
    { provide: RenegotiationRepository, useValue: {} },
    { provide: MarketLoanRepository, useValue: {} },
    { provide: Offers.ListingV1Service, useValue: {} },
    { provide: Offers.ListingPipe, useValue: {} },
    { provide: ListingRepository, useValue: {} },
    { provide: CACHE_MANAGER, useValue: {} },
    { provide: AuthService, useValue: {} },
    { provide: JwtService, useValue: {} }
  ]
})
export class ApiControllersOffersDocsModule {}
