import { ClientRMQ } from '@nestjs/microservices';
import { DynamicModule, INestApplication, Inject, Injectable } from '@nestjs/common';
import {
  type QueueFacadeConfig,
  ClientOptions,
  ConfigCallback,
  QueueFacade,
  QueueFacadeConfigToken
} from '@nftfi.api/facades/queue';
import { SendEmailPayload } from './email-notifications.types';

const ServiceToken = `EmailNotificationsFacadeToken`;

export const QueueChannel = 'mailer';
export enum QueueTopic {
  Message = `${QueueChannel}_message`
}

@Injectable()
export class EmailNotificationsFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async sendMessage(payload: SendEmailPayload): Promise<void> {
    await this.emit(QueueTopic.Message, payload);
  }

  static override forRoot(options: Pick<ClientOptions, 'configCallback' | 'caller'>): DynamicModule {
    return super.forRoot({
      configCallback: options.configCallback,
      token: ServiceToken,
      queue: QueueChannel,
      caller: options.caller
    });
  }

  static override setupMicroservice(app: INestApplication, configCallback: ConfigCallback): void {
    return super.setupMicroservice(app, configCallback, QueueChannel, {});
  }
}
