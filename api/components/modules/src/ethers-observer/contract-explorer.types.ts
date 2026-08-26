import { Fragment } from '@ethersproject/abi';
import { Contract, Event } from './contract';

export type DecoratorPayload = Record<string, unknown>;
export type ListenerCallback = (...args: unknown[]) => void;
export type ListenerCallbackParams = Record<string, { index: number; data: unknown }>;

export type ContractListenerMetadata = {
  key: string;
  contract: Contract;
  eventName: string;
  handler: ListenerCallback;
  params: ListenerCallbackParams;
};

export type ContractToListenerMap = Record<string, ContractListenerMetadata>;

export interface HandlerDecoratorParams {
  contract: Contract;
  log: Event;
  fragment: Fragment;
  payload: DecoratorPayload;
}

export type HandlerDecorator = Record<string, (params: HandlerDecoratorParams) => unknown>;
