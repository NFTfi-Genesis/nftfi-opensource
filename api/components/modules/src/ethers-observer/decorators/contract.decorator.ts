import { MetadataKey } from './constants';
import { ContractBuilderMetadata } from './contract.types';

export function ContractBuilder(metadata: ContractBuilderMetadata): ClassDecorator {
  return function (target) {
    Reflect.defineMetadata(MetadataKey.ETHERS_CONTRACT_BUILDER, metadata, target);
  };
}
