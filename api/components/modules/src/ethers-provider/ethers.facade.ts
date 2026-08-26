import { Block, StaticJsonRpcProvider, TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { Injectable, Logger } from '@nestjs/common';
import { InjectEthersProvider } from 'nestjs-ethers';
import { Cache } from '@nftfi.api/core/decorators';

const ns = 'ethers-provider'; // namespace

const BLOCK_LATEST_TTL = 5000; // 5 seconds
const CHAIN_ID_TTL = 60000 * 60 * 24 * 7; // 7 days
const BLOCK_TTL = 60000 * 60 * 24 * 7; // 7 days
const TRANSACTION_TTL = 60000 * 60 * 24 * 7; // 7 days

@Injectable()
export class EthersFacade {
  private readonly logger = new Logger(EthersFacade.name);

  constructor(@InjectEthersProvider() private readonly provider: StaticJsonRpcProvider) {}

  @Cache(`${ns}:chain-id`, CHAIN_ID_TTL) // 24 hours
  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  @Cache(`${ns}:latest-block`, BLOCK_LATEST_TTL)
  async getLatestBlock(): Promise<Block> {
    return await this.retry(() => this.provider.getBlock('latest'), 10);
  }

  @Cache((instance, ...args) => `${ns}:block:${args[0]}`, BLOCK_TTL)
  async getBlock(blockNumber: number): Promise<Block> {
    return await this.retry(() => this.provider.getBlock(blockNumber), 10);
  }

  @Cache((instance, ...args) => `${ns}:transaction:${args[0]}`, TRANSACTION_TTL)
  async getTransaction(txHash: string): Promise<TransactionResponse> {
    return await this.retry(() => this.provider.getTransaction(txHash), 3);
  }

  @Cache((instance, ...args) => `${ns}:transaction-receipt:${args[0]}`, TRANSACTION_TTL)
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt> {
    return await this.retry(() => this.provider.getTransactionReceipt(txHash), 3);
  }

  async isWithinBlockRange(targetBlock: number, range: number): Promise<boolean> {
    const latestBlock = await this.getLatestBlock();
    return Math.abs(latestBlock.number - targetBlock) <= range;
  }

  private async retry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        if (retries >= maxRetries - 1) {
          this.logger.error('Max retries reached', error);
          throw error;
        }

        this.logger.warn(`Retrying... (${retries + 1}/${maxRetries})`);
        retries++;
      }
    }
  }
}
