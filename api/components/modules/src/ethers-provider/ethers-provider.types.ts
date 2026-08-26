import { FactoryProvider } from '@nestjs/common';

export const ConfigToken = 'EthersProviderModuleConfig';

type EthersProviderOptions = { url: string };

export interface EthersProviderModuleConfig {
  provider: EthersProviderOptions;
}

export type EthersProviderModuleAsyncOptions = Pick<
  FactoryProvider<EthersProviderModuleConfig>,
  'inject' | 'useFactory'
>;

export const getModuleConfigFactoryProvider = (options: EthersProviderModuleAsyncOptions): FactoryProvider => ({
  provide: ConfigToken,
  useFactory: options.useFactory,
  inject: options.inject
});
