import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { Observable, throwError } from 'rxjs';
import { Cache } from '@nftfi.api/core';
import { HttpFacade } from '../http-facade';
import { AlchemyNotFoundError, AlchemyUnknownError } from './alchemy.errors';
import type { AlchemyContract, AlchemyNft, AlchemyShrunkNft, PaginationOptions } from './alchemy.types';

const TTL_1_HOUR = 1000 * 60 * 60;
const TTL_10_MINUTES = 1000 * 60 * 10;
const TTL_2_MINUTES = 1000 * 60 * 2;

const CacheNftMetadata = Cache((_i, contract, tokenId) => `alchemy:nft:${contract}#${tokenId}`, TTL_1_HOUR);
const CacheContractMetadata = Cache((_i, contract) => `alchemy:сontract:${contract}`, TTL_1_HOUR);
const CacheNftOwners = Cache((_i, contract, tokenId) => `alchemy:nft-owners:${contract}#${tokenId}`, TTL_10_MINUTES);
const CacheNftsByAccount = Cache(
  (_i, account, options: PaginationOptions) => `alchemy:nfts-by-account:${account}:${options.limit}-${options.next}`,
  TTL_2_MINUTES
);

@Injectable()
export class AlchemyFacade extends HttpFacade {
  private readonly apiKey: string;

  constructor(private readonly httpService: HttpService) {
    super({ maxRetries: 3 });

    this.logger = new Logger(AlchemyFacade.name);
    this.apiKey = this.httpService.axiosRef.defaults.headers['x-api-key'] as string;
  }

  @CacheNftMetadata
  async getNftMetadata(contractAddress: string, tokenId: string): Promise<AlchemyNft> {
    const { data } = await this.wrapCall(
      this.httpService.get<AlchemyNft>(`/nft/v3/${this.apiKey}/getNFTMetadata`, {
        params: { contractAddress, tokenId }
      })
    );
    return data;
  }

  @CacheContractMetadata
  async getContractMetadata(contractAddress: string): Promise<AlchemyContract> {
    const { data } = await this.wrapCall(
      this.httpService.get<AlchemyContract>(`/nft/v3/${this.apiKey}/getContractMetadata`, {
        params: { contractAddress }
      })
    );
    return data;
  }

  @CacheNftOwners
  async getNftOwners(contractAddress: string, tokenId: string): Promise<string[]> {
    const { data } = await this.wrapCall(
      this.httpService.get<{ owners: string[] }>(`/nft/v3/${this.apiKey}/getOwnersForNFT`, {
        params: { contractAddress, tokenId }
      })
    );
    return data.owners;
  }

  @CacheNftsByAccount
  async getNftsByAccount(account: string, options: PaginationOptions): Promise<[AlchemyShrunkNft[], string | null]> {
    const { data } = await this.wrapCall(
      this.httpService.get<{ ownedNfts: AlchemyShrunkNft[]; pageKey: string }>(
        `/nft/v3/${this.apiKey}/getNFTsForOwner`,
        {
          params: { owner: account, pageSize: options.limit, pageKey: options.next, withMetadata: false }
        }
      )
    );
    return [data.ownedNfts, data.pageKey];
  }

  async *iterateOverNftsByAccount(
    account: string,
    options: { limit: number; next?: string }
  ): AsyncGenerator<AlchemyShrunkNft[]> {
    let next = options.next || '';
    while (true) {
      const [data, newNext] = await this.getNftsByAccount(account, { limit: options.limit, next });
      yield data;
      if (!newNext) break;
      next = newNext;
    }
  }

  protected handleUnknownError(error: Error): Observable<unknown> {
    return throwError(() => {
      if (isAxiosError(error) && error.response?.status === HttpStatus.NOT_FOUND) {
        return new AlchemyNotFoundError(error.response.data);
      }
      return new AlchemyUnknownError(error.message);
    });
  }
}
