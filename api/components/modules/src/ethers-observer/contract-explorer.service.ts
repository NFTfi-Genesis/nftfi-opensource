import _ from 'lodash';
import { DiscoveryService } from '@nestjs/core';
import { Logger, Injectable, Inject } from '@nestjs/common';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Fragment } from '@ethersproject/abi';
import { ContractEventListenerMetadata, ContractEventMetatype, MetadataKey } from './decorators';
import {
  ContractListenerMetadata,
  DecoratorPayload,
  HandlerDecorator,
  ListenerCallback,
  ListenerCallbackParams
} from './contract-explorer.types';
import { Contract, Event } from './contract';
import { ContractRepository } from './contract.repository';
import { type EventArchiveRepository, EventArchiveRepositoryToken } from './event-archive.types';

@Injectable()
export class ContractExplorerService {
  private readonly logger = new Logger(ContractExplorerService.name);

  private registeredHandlerGroups: ContractListenerMetadata[][] = [];
  private readonly handlerParams: HandlerDecorator = {
    [MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_ARGS]: params => {
      return params.log.args;
    },

    [MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_TXHASH]: params => {
      return params.log.transactionHash;
    },

    [MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_CONTRACT]: params => {
      return params.contract;
    },

    [MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_LOG]: params => {
      const key = params.payload[MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_LOG] as string;
      return key ? params.log[key] : params.log;
    },

    [MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_BLOCK]: async params => {
      const key = params.payload[MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_BLOCK] as string;
      const block = await params.log.getBlock();
      return key ? block[key] : block;
    },

    [MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_INTERNALID]: ({ log }) => {
      return `${log.address}-${log.event}-${log.transactionHash}`;
    },

    [MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAM_EMITTEDAT]: async params => {
      const block = await params.log.getBlock();
      return new Date(block.timestamp * 1000);
    }
  };

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly contractRepository: ContractRepository,
    @Inject(EventArchiveRepositoryToken) private readonly eventArchiveRepository: EventArchiveRepository
  ) {}

  async onModuleInit(): Promise<void> {
    const handlerGroups = await this.scan();
    this.registeredHandlerGroups = handlerGroups;
  }

  getRegisteredHandlerGroups(): ContractListenerMetadata[][] {
    return this.registeredHandlerGroups;
  }

  getRegisteredHandlers(): ContractListenerMetadata[] {
    return this.registeredHandlerGroups.flat();
  }

  async callHandler(
    callback: ListenerCallback,
    params: ListenerCallbackParams,
    contract: Contract,
    log: Event
  ): Promise<boolean> {
    const decorators = this.getEventCallbackDecorators(params);

    const block = await log.getBlock();
    let played = false;
    try {
      const fragment = contract.interface.getEvent(log.event);
      if (!fragment) {
        throw new Error(`Event fragment not found for ${log.event}`);
      }

      if (!decorators.length) {
        await Promise.resolve(callback(log.args, log));
      } else {
        const eventParams = await this.buildHandlerArgs(contract, log, fragment, decorators);
        await Promise.resolve(callback(...eventParams));
      }
      played = true;
    } catch (e) {
      this.logger.error(`Error while calling handler for event ${log.event} @ ${log.address}: ${e.message}`);
      this.logger.error(e.stack);
    } finally {
      await this.eventArchiveRepository.upsert({
        name: log.event,
        contract: log.address,
        blockNumber: block.number,
        txHash: log.transactionHash,
        index: log.logIndex,
        emittedAt: new Date(block.timestamp * 1000),
        played,
        args: log.args
      });
    }
    return played;
  }

  private async scan(): Promise<ContractListenerMetadata[][]> {
    const subscribers = this.getSubscribers();

    if (!subscribers.length) {
      this.logger.warn('No contract subscribers found');
      return [];
    }

    return subscribers.map(subscriber => this.scanSubscriber(subscriber));
  }

  private scanSubscriber(subscriber: InstanceWrapper): ContractListenerMetadata[] {
    const classContract: ContractEventMetatype = Reflect.getMetadata(
      MetadataKey.ETHERS_CONTRACT_SUBSCRIBER,
      subscriber.metatype
    );

    const methods = this.getSubscriberMethods(subscriber.metatype);
    const collected = methods.map<ContractListenerMetadata>(method => {
      const { event: eventName, contract: methodContract }: ContractEventListenerMetadata = Reflect.getMetadata(
        MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER,
        subscriber.metatype.prototype,
        method
      );

      const contractMetatype = methodContract || classContract;
      if (!contractMetatype) {
        this.logger.warn(`Contract metatype not found for ${subscriber.name}`);
        return null;
      }

      const contract = this.contractRepository.findOrCreate(contractMetatype);

      const params = Reflect.getMetadata(
        MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER_PARAMS,
        subscriber.metatype.prototype,
        method
      );

      const handler = subscriber.instance[method].bind(subscriber.instance);
      const key = ContractRepository.getContractEventKey(contract, eventName);
      return {
        key,
        contract,
        eventName,
        handler,
        params
      };
    });

    return collected.filter(Boolean) as ContractListenerMetadata[];
  }

  private getSubscriberMethods(metatype: InstanceWrapper['metatype']): string[] {
    const methods = Object.getOwnPropertyNames(metatype.prototype);
    return methods.filter(method =>
      Reflect.hasMetadata(MetadataKey.ETHERS_CONTRACT_EVENT_LISTENER, metatype.prototype, method)
    );
  }

  private getSubscribers(): InstanceWrapper[] {
    return this.discoveryService
      .getProviders()
      .filter(
        provider => provider.metatype && Reflect.hasMetadata(MetadataKey.ETHERS_CONTRACT_SUBSCRIBER, provider.metatype)
      );
  }

  private async buildHandlerArgs(
    contract: Contract,
    log: Event,
    fragment: Fragment,
    decorators: DecoratorPayload[]
  ): Promise<unknown[]> {
    return Promise.all(
      decorators.map(async decorator => {
        for (const [key, value] of Object.entries(decorator)) {
          if (key in this.handlerParams) {
            return this.handlerParams[key]({ contract, log, fragment, payload: { [key]: value } });
          }
        }
      })
    );
  }

  private getEventCallbackDecorators(cbParams: Record<string, { index: number; data: unknown }>): DecoratorPayload[] {
    if (typeof cbParams !== 'object') return [];

    const maxParamsIndex = _.maxBy(Object.values(cbParams), 'index').index;
    const paramsStructure = Array(maxParamsIndex + 1).fill(undefined);

    for (const [key, value] of Object.entries(cbParams)) {
      const { index, data } = value;

      for (const paramKey of Object.keys(this.handlerParams)) {
        if (key === `${paramKey}:${index}`) {
          paramsStructure[index] = { [paramKey]: data };
        }
      }
    }

    return paramsStructure;
  }
}
