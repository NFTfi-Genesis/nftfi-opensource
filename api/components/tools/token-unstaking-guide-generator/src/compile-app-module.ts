import { NestFactory } from '@nestjs/core';
import { DynamicModule, INestApplication, Logger } from '@nestjs/common';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { LockReaderService } from './chain/lock-reader.service';
import { EventDiscoveryService } from './chain/event-discovery.service';
import { SimulationService } from './chain/simulation.service';
import { RPC_PROVIDER } from './chain/provider.token';
import { UnstakingReportService } from './unstaking-report.service';

interface Options {
  rpcUrl: string;
}

export const compileAppModule = async (options: Options): Promise<INestApplication> => {
  const appModule: DynamicModule = {
    module: class AppModule {},
    providers: [
      { provide: RPC_PROVIDER, useFactory: () => new StaticJsonRpcProvider(options.rpcUrl) },
      LockReaderService,
      EventDiscoveryService,
      SimulationService,
      UnstakingReportService,
      { provide: Logger, useValue: new Logger('Token Unstaking Guide Generator') }
    ]
  };

  const app = await NestFactory.create(appModule);
  await app.init();
  return app;
};
