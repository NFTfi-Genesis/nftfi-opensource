import { FactoryProvider } from '@nestjs/common';

export const ConfigToken = 'EthersObserverModuleConfig';

export type EthersObserverModuleConfig = {
  label?: string;
  replay: {
    enabled: boolean;
    chunkSize: number;
  };
};

type ProviderClass<T = unknown> = abstract new (...args: unknown[]) => T;
type TokenProvider = string | symbol | ProviderClass;

export type EthersObserverModuleOptions = {
  tokens: { eventArchiveRepository: TokenProvider };
};

export type EthersObserverModuleAsyncOptions = Pick<
  FactoryProvider<EthersObserverModuleConfig>,
  'inject' | 'useFactory'
> &
  EthersObserverModuleOptions;

export const getModuleConfigFactoryProvider = (options: EthersObserverModuleAsyncOptions): FactoryProvider => ({
  provide: ConfigToken,
  useFactory: options.useFactory,
  inject: options.inject
});
