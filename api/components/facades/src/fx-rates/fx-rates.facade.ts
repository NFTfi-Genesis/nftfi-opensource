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
import { FxRatesQueueTopic, FxSymbol, QueueChannel, ServiceToken } from './fx-rates.types';
import { FxRateDto, GetLatestFxRateParamsDto, GetToDateFxRateParamsDto } from './fx-rates.dto';

@Injectable()
export class FxRatesFacade extends QueueFacade {
  constructor(@Inject(ServiceToken) client: ClientRMQ, @Inject(QueueFacadeConfigToken) config: QueueFacadeConfig) {
    super(client, config);
  }

  async getLatestRate(): Promise<number> {
    const { data } = await this.send<GetLatestFxRateParamsDto, RPCResponse<FxRateDto>>(FxRatesQueueTopic.GetLatest, {
      symbol: FxSymbol.ETH_USDT
    });
    return data?.rate ?? 0;
  }

  async getRateAtDate(date: Date): Promise<number> {
    const { data } = await this.send<GetToDateFxRateParamsDto, RPCResponse<FxRateDto>>(FxRatesQueueTopic.GetAtDate, {
      symbol: FxSymbol.ETH_USDT,
      date
    });
    return data?.rate ?? 0;
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
