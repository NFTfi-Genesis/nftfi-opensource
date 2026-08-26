import { ClientRMQ } from '@nestjs/microservices';
import { DynamicModule, INestApplication, Inject, Injectable } from '@nestjs/common';
import { type QueueFacadeConfig, ForRootOptions, ConfigCallback, QueueFacade, QueueFacadeConfigToken } from '../queue';

import { AcceptRenegotiationPayload, OffersQueueTopic, WinningOfferKey } from './offers.types';

const ServiceToken = `OffersFacadeToken`;
const QueueChannel = 'offers';

@Injectable()
export class OffersFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async deleteWinningOffer(payload: WinningOfferKey): Promise<void> {
    await this.emit(OffersQueueTopic.DeleteWinningOffer, payload);
  }

  async invalidateCache(): Promise<void> {
    await this.emit(OffersQueueTopic.InvalidateCache);
  }

  async acceptRenegotiation(payload: AcceptRenegotiationPayload): Promise<void> {
    await this.emit(OffersQueueTopic.AcceptRenegotiation, payload);
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
