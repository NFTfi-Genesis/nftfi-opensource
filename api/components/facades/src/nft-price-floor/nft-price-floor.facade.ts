import { Observable, throwError } from 'rxjs';
import { isAxiosError } from 'axios';
import { getAddress } from 'ethers/lib/utils';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cache } from '@nftfi.api/core';
import { HttpFacade } from '../http-facade';
import { NftPriceFloorNotFoundError, NftPriceFloorUnknownError } from './nft-price-floor.errors';
import type {
  NpfProject,
  ProjectsAndMeta,
  ProjectPrice,
  ProjectDetails,
  GetProjectsOptions,
  GetHistoricalPricesOptions
} from './nft-price-floor.types';

const PROJECTS_TTL = 1000 * 60 * 60 * 12; // 12 hours
const PROJECT_DETAILS_TTL = 1000 * 60 * 60 * 1; // 1 hour

const CacheProjects = Cache(
  (_i, options: GetProjectsOptions): string =>
    `nft-price-floor-projects-${options.page}-${options.limit}-${options.blockchains.join(',')}`,
  PROJECTS_TTL
);

const CacheHistoricalPrices = Cache(
  (_i, slug: string, { start, end }: GetHistoricalPricesOptions): string =>
    `nft-price-floor-project-prices-${slug}-${start.getTime()}-${end.getTime()}`,
  PROJECTS_TTL
);

const CacheProjectDetails = Cache(
  (_i, slug: string): string => `nft-price-floor-project-details-${slug}`,
  PROJECT_DETAILS_TTL
);

@Injectable()
export class NftPriceFloorFacade extends HttpFacade {
  constructor(private readonly httpService: HttpService) {
    super({ maxRetries: 3 });

    this.logger = new Logger(NftPriceFloorFacade.name);
  }

  async *iterateProjects(): AsyncGenerator<NpfProject[]> {
    let page = 0;
    let finished = false;

    do {
      page++;
      const data = await this.getProjects({ page, limit: 100, blockchains: ['ethereum'] });
      if (!data.length) {
        finished = true;
        break;
      }
      yield data;
    } while (!finished);
  }

  @CacheProjects
  async getProjects(options: GetProjectsOptions): Promise<NpfProject[]> {
    const { data } = await this.wrapCall(
      this.httpService.get<ProjectsAndMeta>('/projects-v2', {
        params: { page: options.page, limit: options.limit, blockchains: options.blockchains.join(',') }
      })
    );
    return data.projects;
  }

  @CacheProjectDetails
  async getDetails(slug: string): Promise<ProjectDetails> {
    const { data } = await this.wrapCall(this.httpService.get<ProjectDetails>(`/projects/${slug}`));
    return data;
  }

  @CacheHistoricalPrices
  async getHistoricalPrices(slug: string, { start, end }: GetHistoricalPricesOptions): Promise<ProjectPrice[]> {
    const { data } = await this.wrapCall(
      this.httpService.get<ProjectPrice[]>(`/projects/${slug}/history/pricefloor/1d`, {
        params: { start: start.getTime() / 1000, end: end.getTime() / 1000 }
      })
    );

    return data;
  }

  protected handleUnknownError(error: Error): Observable<unknown> {
    return throwError(() => {
      if (isAxiosError(error) && error.response?.status === HttpStatus.NOT_FOUND) {
        return new NftPriceFloorNotFoundError('Project not found');
      }
      return new NftPriceFloorUnknownError(`Unknown error occurred while fetching project data: ${error.message}`);
    });
  }

  static parseMask(mask: string): { contract: string; range?: [string, string] } {
    const rangeParts = (mask || '').split(':');
    const contract = getAddress(rangeParts[0]).toLowerCase();
    if (rangeParts.length < 3) {
      return { contract };
    }

    if (rangeParts.length === 3 && isBigNumberish(rangeParts[1]) && isBigNumberish(rangeParts[2])) {
      return { contract, range: [rangeParts[1], rangeParts[2]] };
    }

    throw new Error(`Invalid collection range format: ${mask}`);
  }
}
