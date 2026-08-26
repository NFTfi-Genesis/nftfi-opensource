import { DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FxRate, FxRateRepository } from '@nftfi.api/repositories/postgres/fx-rate';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { FxRateMockFacade } from './fx-rate-mock.facade';

export class FxRateModule {
  static forRoot(): DynamicModule {
    return {
      module: FxRateModule,
      global: true,
      imports: [TypeOrmModule.forFeature([FxRate])],
      providers: [
        FxRateRepository,
        FxRateMockFacade,
        { provide: FxRatesFacade, useExisting: FxRateMockFacade },
        { provide: FxRateConfigToken, useValue: { ethusdt: 0 } }
      ],
      exports: [FxRatesFacade, FxRateConfigToken]
    };
  }
}
