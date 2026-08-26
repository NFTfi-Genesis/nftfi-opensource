import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { HealthModule } from '@nftfi.api/modules/health';
import { HttpLoggingInterceptor } from '@nftfi.api/core/interceptors';
import { buildAppModule } from './app.module';
import { Config } from './config';
import { buildOpenapiDocument } from './openapi-document';

async function bootstrap(): Promise<void> {
  const app = await buildAppModule({ extraModules: [HealthModule] });
  const configService = app.get(ConfigService);

  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.enableCors();

  const openapiGlobalPrefix = 'openapi';

  const document = await buildOpenapiDocument();

  SwaggerModule.setup(openapiGlobalPrefix, app, document);

  const port = configService.get<Config['port']>('port');

  await app.listen(port).then(() => {
    Logger.log(`🚀 Application is running on: http://localhost:${port}`);
    Logger.log(`🌍 OpenApi specification is running on: http://localhost:${port}/${openapiGlobalPrefix}`);
  });
}

bootstrap();
