import { EventFragment, FunctionFragment, ParamType, Result } from '@ethersproject/abi';
import * as ethers from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';
import { Provider } from '@ethersproject/providers';
import { Cache as CacheManager } from 'cache-manager';
import { utils as ethersUtils } from 'ethers';
import { Cache } from '@nftfi.api/core';
import { ContractMetadata } from './decorators';

export type Event = ethers.Event;
export type ContractInterface = ethers.ContractInterface;
export type RunningEvent = ethers.Contract['_runningEvents'][number];
export type FragmentRunningEvent = RunningEvent & { fragment: EventFragment };

const TTL_30_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

const CacheDeploymentBlock = Cache((instance: Contract) => `ethers:deployment-block:${instance.address}`, TTL_30_DAYS);

export class Contract extends ethers.Contract {
  protected readonly cacheManager: CacheManager;
  readonly metadata: ContractMetadata;
  public replayed = false;

  constructor(
    addressOrName: string,
    contractInterface: ethers.ContractInterface,
    signerOrProvider?: Signer | Provider,
    cacheManager?: CacheManager,
    metadata?: ContractMetadata
  ) {
    super(addressOrName, contractInterface, signerOrProvider);
    this.cacheManager = cacheManager;
    this.metadata = metadata;
  }

  async call<T>(methodName: string, ...args: unknown[]): Promise<T> {
    const metadata = this.getFunctionMetadata(methodName);
    const response = await this.functions[methodName](...args);
    return Contract.parseParams(response, metadata.outputs) as T;
  }

  async hasFunction(methodName: string, ...args: unknown[]): Promise<boolean> {
    try {
      const metadata = this.getFunctionMetadata(methodName);
      const fragment = new ethersUtils.Interface([metadata]);
      void fragment;
      const methodSignature = fragment.getFunction(methodName).format();
      await this.provider.call({
        to: this.address,
        data: fragment.encodeFunctionData(methodSignature, args)
      });
      return true;
    } catch {
      return false;
    }
  }

  getEventPayload<T extends object>(event: Event): T {
    const { inputs } = this.interface.getEvent(event.topics[0]);
    const payload = Contract.parseParams(event.args, inputs);
    return payload as T;
  }

  @CacheDeploymentBlock
  async getDeploymentBlock(): Promise<number> {
    let low = 0;
    let high = await this.provider.getBlockNumber();
    let deployBlock = null;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const code = await this.provider.getCode(this.address, mid);

      if (code === '0x') {
        low = mid + 1;
      } else {
        deployBlock = mid;
        high = mid - 1;
      }
    }

    return deployBlock;
  }

  static parseParams<T extends object>(args: Result, params: ParamType[]): T {
    // Note: uint values above uint32 are not safe to store as JS numbers; keep as strings to avoid precision loss.
    const parseUintGte64Value = (arg: bigint): string => arg.toString();
    const result = params.reduce((acc: Record<string, unknown>, param: ParamType, index: number) => {
      switch (param.type) {
        case 'uint64':
        case 'uint96':
        case 'uint160':
        case 'uint256': {
          acc[param.name] = parseUintGte64Value(args[index] as bigint);
          break;
        }
        case 'uint256[]': {
          acc[param.name] = args[index].map((item: bigint) => parseUintGte64Value(item));
          break;
        }
        case 'tuple': {
          acc[param.name] = Contract.parseParams(args[index], param.components);
          break;
        }
        case 'tuple[]': {
          acc[param.name] = args[index].map((item: Result) => Contract.parseParams(item, param.components));
          break;
        }
        default:
          acc[param.name] = args[index];
      }

      return acc;
    }, {});

    return result as T;
  }

  private getFunctionMetadata(name: string): FunctionFragment {
    const metadata = this.interface.getFunction(name);
    if (!metadata) {
      throw new Error(`Method ${name} not found in contract interface`);
    }

    if (!metadata.outputs) {
      throw new Error(`Method ${name} does not have outputs`);
    }

    return metadata;
  }
}
