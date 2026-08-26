import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { httpValidationPipe } from '@nftfi.api/validation/api-validation.pipe';
import { HttpLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { HealthController } from '@nftfi.api/modules/health';
import { ConfigCallback } from '@nftfi.api/facades/queue';
import { EmailNotificationsFacade } from '@nftfi.api/facades/email-notifications';
import { DiscordNotificationsFacade } from '@nftfi.api/facades/discord-notifications';
import { AppModule } from './app.module';
import { Config } from './config';
import * as DiscordCommands from './discord-bot/commands';
import { DiscordBotGateway } from './discord-bot';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const configCallback: ConfigCallback = configService => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq').url]
  });

  EmailNotificationsFacade.setupMicroservice(app, configCallback);
  DiscordNotificationsFacade.setupMicroservice(app, configCallback);

  app.useGlobalPipes(httpValidationPipe);
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor({
      excludeControllers: [HealthController, DiscordBotGateway, ...Object.values(DiscordCommands)]
    })
  );
  app.enableCors();
  app.enableShutdownHooks();

  const openapiGlobalPrefix = 'openapi';
  const openapiConfig = new DocumentBuilder()
    .setTitle('Notifications')
    .setDescription('The notifications API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, openapiConfig);
  SwaggerModule.setup(openapiGlobalPrefix, app, document);

  const port = configService.get<Config['port']>('port');

  await app.startAllMicroservices();
  await app.listen(port).then(() => {
    Logger.log(`🚀 Application is running on: http://localhost:${port}`);
    Logger.log(`🌍 OpenApi specification is running on: http://localhost:${port}/${openapiGlobalPrefix}`);
  });
}

bootstrap();
