import { DynamicModule, INestApplication, Inject, Injectable } from '@nestjs/common';
import { ClientRMQ } from '@nestjs/microservices';
import { type QueueFacadeConfig, ClientOptions, ConfigCallback, QueueFacade, QueueFacadeConfigToken } from '../queue';
import { DiscordMessageDto } from './discord-message.dto';

const ServiceToken = `DiscordNotificationsFacadeToken`;

export const QueueChannel = 'discord';
export enum QueueTopic {
  Message = `${QueueChannel}_message`
}

@Injectable()
export class DiscordNotificationsFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async sendMessage(payload: DiscordMessageDto): Promise<void> {
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
