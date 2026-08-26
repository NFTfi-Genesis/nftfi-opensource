import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { HttpResponseHeader } from '@nftfi.api/core/dtos';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { HttpLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { OffersFacade } from '@nftfi.api/facades/offers';
import { ListingsFacade } from '@nftfi.api/facades/listings';

import { AppModule } from './app.module';
import { Config } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  OffersFacade.setupMicroservice(app, (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq')!.url]
  }));

  ListingsFacade.setupMicroservice(app, (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq')!.url]
  }));

  app.useGlobalPipes(httpValidationPipe);
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
    .setTitle('Offers')
    .setDescription('The offers API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, openapiConfig);
  SwaggerModule.setup(openapiGlobalPrefix, app, document);

  const port = configService.get<Config['port']>('port')!;

  await app.startAllMicroservices();
  await app.listen(port).then(() => {
    Logger.log(`🚀 Application is running on: http://localhost:${port}`);
    Logger.log(`🌍 OpenApi specification is running on: http://localhost:${port}/${openapiGlobalPrefix}`);
  });
}

bootstrap();
