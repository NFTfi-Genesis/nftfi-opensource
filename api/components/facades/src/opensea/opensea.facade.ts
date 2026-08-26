import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { isAxiosError } from 'axios';
import { Cache } from '@nftfi.api/core';
import { HttpFacade } from '../http-facade';
import { OpenSeaNotFoundError, OpenSeaUnknownError } from './opensea.errors';
import { OpenseaCollection, OpenseaContractMetadata, OpenseaNft } from './opensea.types';

const TTL_1_DAY = 1000 * 60 * 60 * 24;
const TTL_1_HOUR = 1000 * 60 * 60;
const TTL_2_MINUTES = 1000 * 60 * 2;

interface PaginationOptions {
  limit: number;
  next?: string;
}

const CacheNftsByContract = Cache(
  (_i, contract, options: PaginationOptions) => `opensea:nfts-by-contract:${contract}:${options.limit}-${options.next}`,
  TTL_1_HOUR
);

const CacheNftsByAccount = Cache(
  (_i, account, options: PaginationOptions) => `opensea:nfts-by-account:${account}:${options.limit}-${options.next}`,
  TTL_2_MINUTES
);
const CacheNft = Cache((_i, contract, tokenId) => `opensea:nft:${contract}-${tokenId}`, TTL_1_DAY);
const CacheContract = Cache((_i, contract) => `opensea:contract:${contract}`, TTL_1_DAY);
const CacheCollection = Cache((_i, slug) => `opensea:collection:${slug}`, TTL_1_DAY);

@Injectable()
export class OpenSeaFacade extends HttpFacade {
  constructor(private readonly httpService: HttpService) {
    super({ maxRetries: 5 });

    this.logger = new Logger(OpenSeaFacade.name);
  }

  @CacheNftsByContract
  async getNftsByContract(contract: string, options: PaginationOptions): Promise<[OpenseaNft[], string]> {
    const { data } = await this.wrapCall(
      this.httpService.get<{ nfts: OpenseaNft[]; next: string }>(`/api/v2/chain/ethereum/contract/${contract}/nfts`, {
        params: { limit: options.limit, ...(options.next ? { next: options.next } : {}) }
      })
    );
    return [data.nfts, data.next];
  }

  @CacheNftsByAccount
  async getNftsByAccount(account: string, options: PaginationOptions): Promise<[OpenseaNft[], string]> {
    const { data } = await this.wrapCall(
      this.httpService.get<{ nfts: OpenseaNft[]; next: string }>(`/api/v2/chain/ethereum/account/${account}/nfts`, {
        params: { limit: options.limit, ...(options.next ? { next: options.next } : {}) }
      })
    );
    return [data.nfts, data.next];
  }

  async *iterateOverNftsByContract(
    contract: string,
    options: { limit: number; next?: string }
  ): AsyncGenerator<OpenseaNft[]> {
    let next = options.next || '';
    while (true) {
      const [data, newNext] = await this.getNftsByContract(contract, { limit: options.limit, next });
      yield data;
      if (!newNext) break;
      next = newNext;
    }
  }

  async *iterateOverNftsByAccount(
    account: string,
    options: { limit: number; next?: string }
  ): AsyncGenerator<OpenseaNft[]> {
    let next = options.next || '';
    while (true) {
      const [data, newNext] = await this.getNftsByAccount(account, { limit: options.limit, next });
      yield data;
      if (!newNext) break;
      next = newNext;
    }
  }

  @CacheNft
  async getNft(contract: string, tokenId: string): Promise<OpenseaNft> {
    const { data } = await this.wrapCall(
      this.httpService.get<{ nft: OpenseaNft }>(`/api/v2/chain/ethereum/contract/${contract}/nfts/${tokenId}`)
    );
    return data.nft;
  }

  @CacheContract
  async getContract(contract: string): Promise<OpenseaContractMetadata> {
    const { data } = await this.wrapCall(
      this.httpService.get<OpenseaContractMetadata>(`/api/v2/chain/ethereum/contract/${contract}`)
    );
    return data;
  }

  @CacheCollection
  async getCollectionBySlug(slug: string): Promise<OpenseaCollection> {
    const { data } = await this.wrapCall(this.httpService.get<OpenseaCollection>(`/api/v2/collections/${slug}`));
    return data;
  }

  protected handleUnknownError(error: Error): Observable<unknown> {
    return throwError(() => {
      if (isAxiosError(error) && error.response?.status === HttpStatus.NOT_FOUND) {
        return new OpenSeaNotFoundError(error.message);
      }
      return new OpenSeaUnknownError(error.message);
    });
  }
}
