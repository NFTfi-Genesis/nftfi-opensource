import { FactoryProvider } from '@nestjs/common';

export const ConfigToken = 'ChainalysisModuleConfig';

export interface ChainalysisModuleConfig {
  url: string;
  apiKey: string;
}

export type ChainalysisModuleAsyncOptions = Pick<FactoryProvider<ChainalysisModuleConfig>, 'inject' | 'useFactory'>;

export const getModuleConfigFactoryProvider = (options: ChainalysisModuleAsyncOptions): FactoryProvider => ({
  provide: ConfigToken,
  useFactory: options.useFactory,
  inject: options.inject
});

export interface Identification {}

export interface IdentificationsResponse {
  identifications: Identification[];
}
