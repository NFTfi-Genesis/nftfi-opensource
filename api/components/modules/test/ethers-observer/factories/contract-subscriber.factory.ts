import { Injectable, Type } from '@nestjs/common';
import { EventHandler, Subscriber, ContractBuilder } from '../../../src/ethers-observer/decorators';
import { Contract as BaseContract } from '../../../src/ethers-observer';

type ContractBuilderOptions = Parameters<typeof ContractBuilder>[0];

export const buildContractType = (overrides: Partial<ContractBuilderOptions> = {}): typeof BaseContract => {
  class TestContract extends BaseContract {}
  ContractBuilder({
    address: '0x12345',
    ABI: [],
    replay: {
      startAt: 0,
      enabled: false
    },
    ...overrides
  })(TestContract);

  return TestContract;
};

interface ContractSubscriberOptions {
  subscriberClass?: Type;
  contract?: typeof BaseContract;
}

export const buildContractSubscriber = (options: ContractSubscriberOptions): Type => {
  let subscriberClass = options.subscriberClass;
  if (!subscriberClass) {
    class ContractSubscriber {
      @EventHandler('Event')
      onEvent(): void {
        void 0;
      }
    }

    subscriberClass = ContractSubscriber;
  }

  Injectable()(subscriberClass);
  Subscriber(options.contract)(subscriberClass);

  return subscriberClass;
};
