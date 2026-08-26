import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { GnosisFacade } from './gnosis.facade';
import { GnosisModuleAsyncOptions, GnosisModuleConfig, getModuleConfigFactoryProvider } from './gnosis.types';

@Global()
@Module({})
export class GnosisModule {
  static forRootAsync(options: GnosisModuleAsyncOptions): DynamicModule {
    const configFactoryProvider = getModuleConfigFactoryProvider(options);
    return {
      module: GnosisModule,
      global: true,
      imports: [
        HttpModule.registerAsync({
          ...options,
          async useFactory(...args: unknown[]) {
            const httpModuleOptions: GnosisModuleConfig = configFactoryProvider.useFactory(...args);
            return {
              baseURL: httpModuleOptions.url
            };
          }
        })
      ],
      providers: [configFactoryProvider, GnosisFacade],
      exports: [GnosisFacade]
    };
  }
}
