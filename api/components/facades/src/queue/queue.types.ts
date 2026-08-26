import { ConfigService } from '@nestjs/config';
import { RmqOptions as BaseRmqOptions } from '@nestjs/microservices';

export type ConfigCallback = (configService: ConfigService) => { urls: string[] };

export interface RPCResponse<T> {
  data: T;
}

export interface ClientOptions {
  configCallback: ConfigCallback;
  token: string;
  queue: string;
  caller: string; // <service-name>
  timeout?: number; // Optional timeout for RPC calls in milliseconds
}

export type QueueFacadeConfig = Pick<ClientOptions, 'caller' | 'queue' | 'timeout'>;

export type ForRootOptions = Pick<ClientOptions, 'configCallback' | 'caller' | 'timeout'>;

export type RmqOptions = BaseRmqOptions & {
  options: BaseRmqOptions['options'] & {
    wildcards?: boolean;
  };
};
