import { ClientRMQ } from '@nestjs/microservices';
import { DynamicModule, INestApplication, Inject, Injectable } from '@nestjs/common';
import { type QueueFacadeConfig, ForRootOptions, ConfigCallback, QueueFacade, QueueFacadeConfigToken } from '../queue';
import { DeleteListingPayload, ListingsQueueTopic } from './listings.types';

const ServiceToken = 'ListingsFacadeToken';
const QueueChannel = 'listings';

@Injectable()
export class ListingsFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async deleteByNftKey(nftContract: string, nftTokenId: string, reason: DeleteListingPayload['reason']): Promise<void> {
    await this.emit<DeleteListingPayload>(ListingsQueueTopic.DeleteListing, {
      nftContract,
      nftTokenId,
      reason
    });
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
