import { ClientRMQ } from '@nestjs/microservices';
import { DynamicModule, INestApplication, Inject, Injectable } from '@nestjs/common';
import {
  type QueueFacadeConfig,
  ConfigCallback,
  ForRootOptions,
  QueueFacade,
  QueueFacadeConfigToken,
  RPCResponse
} from '../queue';
import {
  AccountsQueueTopic,
  AccountWithEmail,
  GetAccountWithEmailParams,
  QueueChannel,
  ServiceToken
} from './accounts.types';

@Injectable()
export class AccountsFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async getAccountWithEmail(wallet: string): Promise<AccountWithEmail | null> {
    const { data } = await this.send<GetAccountWithEmailParams, RPCResponse<AccountWithEmail | null>>(
      AccountsQueueTopic.GetAccountWithEmail,
      { wallet }
    );
    return data;
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
