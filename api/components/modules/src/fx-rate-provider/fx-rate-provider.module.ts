import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FxRateProviderService } from './fx-rate-provider.service';
import { FxRateConfigToken } from './fx-rate-provider.types';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [FxRateProviderService, { provide: FxRateConfigToken, useValue: { ethusdt: 0 } }],
  exports: [FxRateConfigToken]
})
export class FxRateProviderModule {}
