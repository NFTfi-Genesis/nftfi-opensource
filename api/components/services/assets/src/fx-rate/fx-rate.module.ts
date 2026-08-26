import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FxRateRepository, FxRate } from '@nftfi.api/repositories/postgres/fx-rate';
import { FxRateService } from './fx-rate.service';
import { FxRateController } from './fx-rate.controller';
import { FxRateClientProvider } from './fx-rate-client.provider';
import { FxRateScheduler } from './fx-rate.scheduler';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([FxRate])],
  providers: [FxRateClientProvider, FxRateRepository, FxRateService, FxRateScheduler],
  controllers: [FxRateController],
  exports: []
})
export class FxRateModule {}
