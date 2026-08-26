import { NestApplication, NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { HttpLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { AccountsFacade } from '@nftfi.api/facades/accounts';
import { AppModule } from './app.module';
import { Config } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger(NestApplication.name);
  const configService = app.get(ConfigService);

  AccountsFacade.setupMicroservice(app, (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq')!.url]
  }));

  app.useGlobalPipes(httpValidationPipe);
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.enableCors();
  app.enableShutdownHooks();

  const openapiGlobalPrefix = 'openapi';
  const openapiConfig = new DocumentBuilder()
    .setTitle('Accounts')
    .setDescription('The accounts API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openapiConfig);
  SwaggerModule.setup(openapiGlobalPrefix, app, document);

  const port = configService.get<Config['port']>('port')!;

  await app.startAllMicroservices();
  await app.listen(port).then(() => {
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`🌍 OpenApi specification is running on: http://localhost:${port}/${openapiGlobalPrefix}`);
  });
}

bootstrap();
