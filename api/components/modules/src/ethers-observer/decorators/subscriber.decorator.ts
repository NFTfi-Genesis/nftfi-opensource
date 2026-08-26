import { Injectable } from '@nestjs/common';
import { MetadataKey } from './constants';
import { ContractEventMetatype, EventBlockKeys, EventLogKeys } from './subscriber.types';

export function Subscriber(contract?: ContractEventMetatype): ClassDecorator {
  return function (target) {
    Injectable()(target);
    Reflect.defineMetadata(MetadataKey.ETHERS_CONTRACT_SUBSCRIBER, contract, target);
  };
}

export function EventHandler(eventName: string, contract?: ContractEventMetatype) {
  return function (target: object, key: string): void {
    Reflect.defineMetadata(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER, { event: eventName, contract }, target, key);
  };
}

function assignMetadata(
  args: Record<string, unknown>,
  paramtype: string,
  index: number,
  data: unknown
): Record<string, unknown> {
  return {
    ...args,
    [`${paramtype}:${index}`]: {
      index,
      data
    }
  };
}

function createParamDecorator<T = void>(paramtype: string) {
  return (data: T) =>
    (target: object, key: string, parameterIndex: number): void => {
      const args = Reflect.getMetadata(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAMS, target, key) || {};
      Reflect.defineMetadata(
        MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAMS,
        assignMetadata(args, paramtype, parameterIndex, data),
        target,
        key
      );
    };
}

export const LogArgs = createParamDecorator(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_ARGS);
export const TxHash = createParamDecorator(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_TXHASH);
export const Contract = createParamDecorator(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_CONTRACT);
export const InternalId = createParamDecorator(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_INTERNALID);
export const EmittedAt = createParamDecorator(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_EMITTEDAT);
export const Log = createParamDecorator<void | EventLogKeys>(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_LOG);
export const Block = createParamDecorator<void | EventBlockKeys>(
  MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_BLOCK
);
