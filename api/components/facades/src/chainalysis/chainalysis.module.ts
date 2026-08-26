import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ChainalysisFacade } from './chainalysis.facade';
import {
  ChainalysisModuleAsyncOptions,
  ChainalysisModuleConfig,
  getModuleConfigFactoryProvider
} from './chainalysis.types';

@Global()
@Module({})
export class ChainalysisModule {
  static forRootAsync(options: ChainalysisModuleAsyncOptions): DynamicModule {
    const configFactoryProvider = getModuleConfigFactoryProvider(options);
    return {
      module: ChainalysisModule,
      global: true,
      imports: [
        HttpModule.registerAsync({
          ...options,
          async useFactory(...args: unknown[]) {
            const httpModuleOptions: ChainalysisModuleConfig = configFactoryProvider.useFactory(...args);
            return {
              baseURL: httpModuleOptions.url,
              headers: {
                'X-API-KEY': httpModuleOptions.apiKey
              }
            };
          }
        })
      ],
      providers: [configFactoryProvider, ChainalysisFacade],
      exports: [ChainalysisFacade]
    };
  }
}
