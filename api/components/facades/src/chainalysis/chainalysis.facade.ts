import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cache } from '@nftfi.api/core';
import { HttpFacade } from '../http-facade';
import { Identification, IdentificationsResponse } from './chainalysis.types';

@Injectable()
export class ChainalysisFacade extends HttpFacade {
  constructor(private readonly httpService: HttpService) {
    super({ maxRetries: 3 });
  }

  @Cache<typeof ChainalysisFacade, [string]>(
    (_i, address: string): string => `chainalysis:${address}`,
    1000 * 60 * 60 * 1
  )
  async getIdentifications(address: string): Promise<Identification[]> {
    const { data } = await this.wrapCall<IdentificationsResponse>(this.httpService.get(`/address/${address}`));
    return data.identifications;
  }
}
