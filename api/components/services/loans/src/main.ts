import { Logger } from '@nestjs/common';
import { NestApplication, NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpResponseHeader } from '@nftfi.api/core/dtos';
import { LoansFacade } from '@nftfi.api/facades/loans';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { HttpLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { AppModule } from './app.module';
import { Config } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger(NestApplication.name);
  const configService = app.get(ConfigService);

  LoansFacade.setupMicroservice(app, (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq').url]
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
    .setTitle('Loans')
    .setDescription('The loans API description')
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
