import { ClientRMQ } from '@nestjs/microservices';
import { DynamicModule, INestApplication, Inject, Injectable } from '@nestjs/common';
import { type QueueFacadeConfig, ForRootOptions, ConfigCallback, QueueFacade, QueueFacadeConfigToken } from '../queue';

import { LoansQueueTopic } from './loans.types';

const ServiceToken = `LoansFacadeToken`;
const QueueChannel = 'loans';

@Injectable()
export class LoansFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async invalidateCache(): Promise<void> {
    await this.emit(LoansQueueTopic.InvalidateCache);
  }

  static override forRoot(options: ForRootOptions): DynamicModule {
    return super.forRoot({
      caller: options.caller,
      timeout: options.timeout,
      queue: QueueChannel,
      token: ServiceToken,
      configCallback: options.configCallback
    });
  }

  static override setupMicroservice(app: INestApplication, configCallback: ConfigCallback): void {
    return super.setupMicroservice(app, configCallback, QueueChannel, {});
  }
}
