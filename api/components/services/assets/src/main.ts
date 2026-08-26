import { Logger } from '@nestjs/common';
import { NestApplication, NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpResponseHeader } from '@nftfi.api/core/dtos';
import { HttpLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { AppModule } from './app.module';
import { Config } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger(NestApplication.name);
  const configService = app.get(ConfigService);

  AssetsFacade.setupMicroservice(app, (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq').url]
  }));
  FxRatesFacade.setupMicroservice(app, (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq').url]
  }));

  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.enableCors({
    exposedHeaders: [
      HttpResponseHeader.PaginationPage,
      HttpResponseHeader.PaginationLimit,
      HttpResponseHeader.PaginationTotal
    ]
  });
  app.enableShutdownHooks();

  const openapiGlobalPrefix = 'openapi';
  const openapiConfig = new DocumentBuilder()
    .setTitle('Assets API')
    .setDescription('The assets API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, openapiConfig);
  SwaggerModule.setup(openapiGlobalPrefix, app, document);

  await app.startAllMicroservices();

  const port = configService.get<Config['port']>('port');
  await app.listen(port).then(() => {
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`🌍 OpenApi specification is running on: http://localhost:${port}/${openapiGlobalPrefix}`);
  });
}

bootstrap();
