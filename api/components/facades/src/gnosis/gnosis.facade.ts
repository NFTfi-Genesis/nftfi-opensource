import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cache } from '@nftfi.api/core';
import { HttpFacade } from '../http-facade';
import { GnosisSafesResponse } from './gnosis.types';

const CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours

@Injectable()
export class GnosisFacade extends HttpFacade {
  constructor(private readonly httpService: HttpService) {
    super({ maxRetries: 3 });
  }

  @Cache<typeof GnosisFacade>((_i, ...args: unknown[]): string => `gnosis:safes:${args[0] as string}`, CACHE_TTL)
  async getSafes(owner: string): Promise<string[]> {
    const { data } = await this.wrapCall<GnosisSafesResponse>(this.httpService.get(`/owners/${owner}/safes/`));
    return data.safes.map(addr => addr.toLowerCase());
  }
}
