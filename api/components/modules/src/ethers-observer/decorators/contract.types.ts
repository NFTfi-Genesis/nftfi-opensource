import { ConfigService } from '@nestjs/config';
import { ContractInterface } from '../contract';

type ExtractConfigValue<T> = T | ((configService: ConfigService) => T);

export interface ContractMetadata {
  replay: {
    enabled: boolean;
    startAt: number;
  };
}

export interface ContractBuilderMetadata {
  address: ExtractConfigValue<string>;
  replay: {
    enabled: ExtractConfigValue<boolean>;
    startAt: ExtractConfigValue<number>;
  };
  ABI: ContractInterface;
}
