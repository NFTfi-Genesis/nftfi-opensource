import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportedCurrencies } from '@nftfi.api/core';
import { OfferRepository, OfferType } from '@nftfi.api/repositories/postgres/offer';
import {
  OfferAddressDto,
  OfferCountDto,
  OfferCountFiltersNftDto,
  OfferCountFiltersNftfiDto,
  OfferCountQueryDto
} from './dtos';
import type { Config } from '../config';

interface CurrencyGroup {
  currency: string;
  count: number;
  group: string;
  interestProrated: {
    prorated: { count: number };
    nonProrated: { count: number };
  };
}

@Injectable()
export class OfferCountV01Service {
  constructor(
    private readonly offerRepository: OfferRepository,
    private readonly supportedCurrencies: SupportedCurrencies,
    private readonly configService: ConfigService
  ) {}

  async getOfferCount(params: OfferCountQueryDto): Promise<OfferCountDto> {
    const type = params.nftId ? OfferType.Asset : OfferType.Collection;
    const contractNameMap = this.configService.get<Config['legacy']['v03']['contractNameByType']>(
      'legacy.v03.contractNameByType'
    )!;
    const contractName = contractNameMap[type];
    const options = {
      lenderAddress: params.lenderAddress,
      nftAddress: params.nftAddress,
      nftId: params.nftId || '0',
      group: (params.group || 'termsCurrencyAddress') as string,
      contractName,
      type
    };
    const data: CurrencyGroup[] = [];

    if (params.group === 'termsCurrencyAddress') {
      data.push(...(await this.groupByCurrency(options)));
    }

    return this.toDto({
      nft: { address: options.nftAddress, id: options.nftId } as OfferCountFiltersNftDto,
      lender: { address: options.lenderAddress } as OfferAddressDto,
      nftfi: { contract: { name: contractName } } as OfferCountFiltersNftfiDto,
      type,
      counts: data
    });
  }

  private async groupByCurrency(options: {
    lenderAddress: string;
    nftAddress: string;
    nftId: string;
    group: string;
    type: OfferType;
  }): Promise<CurrencyGroup[]> {
    const result = [];
    const currencies = this.supportedCurrencies.getContracts().map(c => c.toLowerCase());
    const countPromises = [];
    const { group, lenderAddress, nftAddress, nftId, type } = options;
    for (const currency of currencies) {
      const baseFilter = {
        lender: lenderAddress,
        nftContract: nftAddress,
        nftTokenId: nftId,
        currency,
        type
      };
      countPromises.push(
        this.offerRepository.countBy({ ...baseFilter, prorated: false }),
        this.offerRepository.countBy({ ...baseFilter, prorated: true })
      );
    }
    const counts = await Promise.all(countPromises);

    currencies.forEach((currency, index) => {
      result.push({
        group,
        count: counts[index * 2] + counts[index * 2 + 1],
        currency,
        interestProrated: { nonProrated: { count: counts[index * 2] }, prorated: { count: counts[index * 2 + 1] } }
      });
    });
    return result;
  }

  private toDto(options: {
    nft: OfferCountFiltersNftDto;
    lender: OfferAddressDto;
    nftfi: OfferCountFiltersNftfiDto;
    type: OfferType;
    counts: CurrencyGroup[];
  }): OfferCountDto {
    return {
      filters: {
        nft: options.nft,
        lender: options.lender,
        nftfi: options.nftfi,
        type: options.type
      },
      counts: options.counts.map(({ count, group, currency, interestProrated }) => ({
        group: { key: group, value: currency },
        count,
        interestProrated
      }))
    };
  }
}
