import { FactoryProvider } from '@nestjs/common';

export const AuthModuleConfigToken = 'AuthModuleConfig';

export interface AuthModuleConfig {
  secret: string;
}

export type AuthModuleAsyncOptions = Pick<FactoryProvider<AuthModuleConfig>, 'inject' | 'useFactory'>;

export const getModuleConfigFactoryProvider = (options: AuthModuleAsyncOptions): FactoryProvider => ({
  provide: AuthModuleConfigToken,
  useFactory: options.useFactory,
  inject: options.inject
});

export type AuthTokenPayload = {
  account: string;
  multisig: { type?: 'gnosis' };
  iat: number;
  exp: number;
};
