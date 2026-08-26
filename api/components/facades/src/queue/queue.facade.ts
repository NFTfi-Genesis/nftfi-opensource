import { EventEmitter } from 'stream';
import chalk from 'chalk';
import { firstValueFrom, MonoTypeOperatorFunction, timeout } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { DynamicModule, INestApplication, Logger, OnModuleInit } from '@nestjs/common';
import { ClientRMQ, ClientsModule, Transport } from '@nestjs/microservices';
import { ClientOptions, ConfigCallback, RmqOptions, QueueFacadeConfig } from './queue.types';

export const QueueFacadeConfigToken = 'QueueFacadeConfigToken';

const DEFAULT_TIMEOUT = 30 * 1000; // 30 seconds

export class QueueFacade implements OnModuleInit {
  protected readonly logger: Logger = new Logger(QueueFacade.name);
  protected readonly emitter = new EventEmitter();
  private readonly client: ClientRMQ;
  protected readonly config: QueueFacadeConfig;
  protected LIFECYCLE_MESSAGE_CONNECTED = 'connected';

  constructor(client: ClientRMQ, config: QueueFacadeConfig) {
    this.client = client;
    this.config = config;
  }

  async onModuleInit(): Promise<void> {
    await this.connectToQueue(this.client, this.config.queue);
  }

  // Send a message to the queue and expect a response
  protected send<T, R>(topic: string, payload: T): Promise<R> {
    return firstValueFrom(
      this.client.send<R, T>(topic, { ...payload, caller: this.config.caller }).pipe(this.timeoutPipe())
    );
  }

  // Emit a message to the queue without expecting a response
  protected async emit<T>(topic: string, payload: T = {} as T): Promise<void> {
    await firstValueFrom(
      this.client.emit<T>(topic, { ...payload, caller: this.config.caller }).pipe(this.timeoutPipe())
    );
  }

  private timeoutPipe<T>(): MonoTypeOperatorFunction<T> {
    return timeout(this.config.timeout || DEFAULT_TIMEOUT);
  }

  protected async connectToQueue(client: ClientRMQ, queue: string): Promise<void> {
    let retries = 0;

    return new Promise(resolve => {
      const connectionAttempt = async (): Promise<void> => {
        try {
          await client.connect();
          this.logger.log(chalk.green(`Successfuly connected ${chalk.cyan(queue)} queue`));
          this.emitter.emit(this.LIFECYCLE_MESSAGE_CONNECTED);
          resolve();
        } catch (error) {
          this.logger.error(
            chalk.green(
              `Unable to connect to the ${chalk.cyan(queue)} queue. Retrying (${retries})... ${JSON.stringify(error)}`
            )
          );
          retries++;
          await new Promise(r => setTimeout(r, 1000));
          await connectionAttempt();
        }
      };

      return connectionAttempt();
    });
  }

  // Static method to setup a client module
  static forRoot(options: ClientOptions): DynamicModule {
    Object.defineProperty(this, 'name', { value: `${this.name}Module` });
    return {
      module: this,
      global: true,
      imports: [this.registerClientProxy(options.configCallback, options.token, options.queue)],
      providers: [
        this,
        {
          provide: QueueFacadeConfigToken,
          useValue: { caller: options.caller, queue: options.queue } as QueueFacadeConfig
        }
      ],
      exports: [this]
    };
  }

  protected static registerClientProxy(configCallback: ConfigCallback, token: string, queue: string): DynamicModule {
    return ClientsModule.registerAsync([
      {
        name: token,
        inject: [ConfigService],
        useFactory: (configService: ConfigService): RmqOptions => {
          const config = configCallback(configService);
          return {
            transport: Transport.RMQ,
            options: {
              urls: config.urls,
              queue,
              queueOptions: {
                durable: true
              }
            }
          };
        }
      }
    ]);
  }

  // Static method to setup a server-side microservice
  static setupMicroservice(
    app: INestApplication,
    configCallback: ConfigCallback,
    queue: string,
    queueOptions: Partial<RmqOptions['options']> = {}
  ): void {
    const configService = app.get(ConfigService);
    const { urls } = configCallback(configService);
    app.connectMicroservice<RmqOptions>({
      transport: Transport.RMQ,
      options: {
        urls,
        queue,
        persistent: true,
        queueOptions: {
          durable: true
        },
        ...queueOptions
      }
    });
  }
}
