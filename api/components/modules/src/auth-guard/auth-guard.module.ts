import { JwtModule, JwtService } from '@nestjs/jwt';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthModuleAsyncOptions, getModuleConfigFactoryProvider } from './auth.types';

@Global()
@Module({})
export class AuthGuardModule {
  static forRootAsync(params: AuthModuleAsyncOptions): DynamicModule {
    const configFactoryProvider = getModuleConfigFactoryProvider(params);
    return {
      module: AuthGuardModule,
      imports: [JwtModule],
      global: true,
      providers: [configFactoryProvider, AuthService, JwtService],
      exports: [AuthService, JwtService]
    };
  }
}
