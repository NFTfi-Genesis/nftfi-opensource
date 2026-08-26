import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ApiControllersHeapModule } from './api-controllers-heap.module';
import { ApiControllersOffersDocsModule } from './api-controllers-offers-docs.module';
import { ApiControllersAuthorizationDocsModule } from './api-controllers-authorization-docs.module';
import { ApiControllersLoansDocsModule } from './api-controllers-loans-docs.module';
import { buildAppModule, AppModuleOptions } from './app.module';

export enum ServiceType {
  ALL = 'all',
  OFFERS = 'offers',
  AUTHORIZATION = 'authorization',
  LOANS = 'loans'
}

type Options = Pick<AppModuleOptions, 'config'> & {
  name?: string;
  service?: ServiceType;
};

const SERVICE_CONFIGS = {
  [ServiceType.ALL]: {
    module: ApiControllersHeapModule,
    defaultTitle: 'NFTfi | SDK API v2'
  },
  [ServiceType.OFFERS]: {
    module: ApiControllersOffersDocsModule,
    defaultTitle: 'NFTfi | Offers API v2'
  },
  [ServiceType.AUTHORIZATION]: {
    module: ApiControllersAuthorizationDocsModule,
    defaultTitle: 'NFTfi | Authorization API v2'
  },
  [ServiceType.LOANS]: {
    module: ApiControllersLoansDocsModule,
    defaultTitle: 'NFTfi | Loans API v2'
  }
};

export const buildOpenapiDocument = async (options: Options = {}): Promise<OpenAPIObject> => {
  const serviceType = options.service || ServiceType.ALL;
  const serviceConfig = SERVICE_CONFIGS[serviceType];

  const app = await buildAppModule({ extraModules: [serviceConfig.module], ...options });

  const openapiConfig = new DocumentBuilder()
    .setTitle(options.name || serviceConfig.defaultTitle)
    .setVersion('2.0.0')
    .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' });

  if (options.config?.forwardUrl) {
    openapiConfig.addServer(options.config.forwardUrl);
  }

  process.nextTick(() => app.close());

  return SwaggerModule.createDocument(app, openapiConfig.build());
};
