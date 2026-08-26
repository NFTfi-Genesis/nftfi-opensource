import { HttpModuleOptions } from '@nestjs/axios';
import { FactoryProvider } from '@nestjs/common';

export const ConfigToken = 'HttpFacadeModuleConfig';

export type HttpFacadeModuleAsyncOptions = Pick<FactoryProvider<HttpModuleOptions>, 'inject' | 'useFactory'>;
