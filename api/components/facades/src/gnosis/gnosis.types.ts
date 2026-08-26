import { FactoryProvider } from '@nestjs/common';

export const ConfigToken = 'GnosisModuleConfig';

export interface GnosisModuleConfig {
  url: string;
}

export type GnosisModuleAsyncOptions = Pick<FactoryProvider<GnosisModuleConfig>, 'inject' | 'useFactory'>;

export const getModuleConfigFactoryProvider = (options: GnosisModuleAsyncOptions): FactoryProvider => ({
  provide: ConfigToken,
  useFactory: options.useFactory,
  inject: options.inject
});

export interface GnosisSafesResponse {
  safes: string[];
}
