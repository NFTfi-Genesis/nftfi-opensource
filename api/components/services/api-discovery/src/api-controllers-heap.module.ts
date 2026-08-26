import { Module } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '@nftfi.api/modules/auth-guard';
import { OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { ListingRepository } from '@nftfi.api/repositories/postgres/listing';
import { RenegotiationRepository } from '@nftfi.api/repositories/postgres/renegotiation';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import * as Accounts from '@nftfi.api/services/accounts';
import * as Assets from '@nftfi.api/services/assets';
import * as FxRates from '@nftfi.api/services/fx-rates';
import * as Offers from '@nftfi.api/services/offers';
import * as Loans from '@nftfi.api/services/loans';

@Module({
  controllers: [
    Accounts.AccountV1Controller,
    Accounts.ContactV1Controller,
    Accounts.AuthV1Controller,
    Accounts.AuthV01Controller,
    Assets.AssetController,
    Assets.AssetV1Controller,
    Assets.CollectionController,
    Assets.CollectionV1Controller,
    FxRates.FxRateController,
    Offers.OfferController,
    Offers.OfferV01Controller,
    Offers.OfferCountV01Controller,
    Offers.OfferV02Controller,
    Offers.OfferV03Controller,
    Offers.OfferV1Controller,
    Offers.RenegotiationV1Controller,
    Loans.LoanController,
    Loans.LoanV01Controller,
    Loans.LoanV02Controller,
    Loans.LoanV1Controller,
    Loans.AnalyticsV1Controller,
    Offers.ListingV1Controller,
    Offers.ListingV01Controller,
    Offers.ListingLegacyController
  ],
  providers: [
    { provide: Accounts.AccountService, useValue: {} },
    { provide: Accounts.ContactService, useValue: {} },
    { provide: Accounts.AuthService, useValue: {} },
    { provide: Assets.AssetService, useValue: {} },
    { provide: Assets.CollectionService, useValue: {} },
    { provide: FxRates.FxRateService, useValue: {} },
    { provide: Offers.OfferV01Service, useValue: {} },
    { provide: Offers.OfferCountV01Service, useValue: {} },
    { provide: Offers.OfferV03Service, useValue: {} },
    { provide: Offers.OfferV1Service, useValue: {} },
    { provide: OfferRepository, useValue: {} },
    { provide: Offers.RenegotiationV1Service, useValue: {} },
    { provide: Offers.RenegotiationV1DurationValidationPipe, useValue: {} },
    { provide: Offers.RenegotiationV1OfferValidationPipe, useValue: {} },
    { provide: RenegotiationRepository, useValue: {} },
    { provide: MarketLoanRepository, useValue: {} },
    { provide: Offers.ListingV1Service, useValue: {} },
    { provide: Offers.ListingPipe, useValue: {} },
    { provide: ListingRepository, useValue: {} },
    { provide: Loans.LoanV02Service, useValue: {} },
    { provide: Loans.LoanV1Service, useValue: {} },
    { provide: Loans.AnalyticsV1Service, useValue: {} },
    { provide: CACHE_MANAGER, useValue: {} },
    { provide: AuthService, useValue: {} },
    { provide: JwtService, useValue: {} }
  ]
})
export class ApiControllersHeapModule {}
