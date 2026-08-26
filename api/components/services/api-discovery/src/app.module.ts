import { INestApplication, Module, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import config, { Config } from './config';

export interface AppModuleOptions {
  extraModules?: Type[];
  config?: Partial<Pick<Config, 'forwardUrl'>>;
}

export const buildAppModule = async (options: AppModuleOptions = {}): Promise<INestApplication> => {
  @Module({
    imports: [
      ConfigModule.forRoot({
        load: [config, (): Partial<Config> => options.config || {}],
        isGlobal: true
      }),
      ...(options.extraModules || [])
    ]
  })
  class AppModule {}

  const app = await NestFactory.create(AppModule);

  return app;
};
