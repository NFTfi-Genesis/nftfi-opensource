import { FindOptionsWhere, MoreThanOrEqual, Repository as RepositoryType, SelectQueryBuilder } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isArray, isBoolean, isNumber, isString } from 'lodash';
import { SupportedCurrencies, Ticker } from '@nftfi.api/core';
import { type FxRateConfig, FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { FindOptions } from '../types';
import { Repository } from '../repository';
import { Offer } from './offer.entity';
import { DraftOffer, FindConditions, OfferSortKeys, OfferType } from './offer.types';

@Injectable()
export class OfferRepository extends Repository {
  private readonly tableAlias = 'offers';

  constructor(
    @InjectRepository(Offer) private readonly model: RepositoryType<Offer>,
    private readonly supportedCurrencies: SupportedCurrencies,
    @Inject(FxRateConfigToken) readonly fxConfig: FxRateConfig
  ) {
    super();
  }

  async create(draft: DraftOffer): Promise<Offer> {
    return this.model.save(this.model.create(draft));
  }

  async count(where: FindOptionsWhere<Offer>): Promise<number> {
    return this.model.count({ where });
  }

  async findById(id: number): Promise<Offer | null> {
    return this.model.findOne({ where: { id } });
  }

  async softDelete(id: number): Promise<number> {
    const result = await this.model
      .createQueryBuilder()
      .update()
      .set({ deletedAt: new Date(), signature: null })
      .where('id = :id', { id })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async softDeleteWinningOffer(
    key: {
      lender: string;
      nftContract: string;
      nftTokenId: string;
      currency: string;
      principal: string;
      repaymentMax: string;
      duration: number;
    },
    reason: string
  ): Promise<number> {
    const result = await this.model
      .createQueryBuilder()
      .update()
      .set({ deletedAt: new Date(), deletedReason: reason, signature: null })
      .where('type = :type', { type: OfferType.Asset })
      .andWhere('lender = :lender', { lender: key.lender.toLowerCase() })
      .andWhere('nft_contract = :nftContract', { nftContract: key.nftContract.toLowerCase() })
      .andWhere('nft_token_id_from = :nftTokenId', { nftTokenId: key.nftTokenId })
      .andWhere('nft_token_id_to = :nftTokenId', { nftTokenId: key.nftTokenId })
      .andWhere('currency = :currency', { currency: key.currency.toLowerCase() })
      .andWhere('principal = :principal', { principal: key.principal })
      .andWhere('repayment_max = :repaymentMax', { repaymentMax: key.repaymentMax })
      .andWhere('duration = :duration', { duration: key.duration })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async softDeleteExpired(reason: string): Promise<number> {
    const result = await this.model
      .createQueryBuilder()
      .update()
      .set({ deletedAt: new Date(), deletedReason: reason, signature: null })
      .where('expires_at < :now', { now: new Date() })
      .andWhere('deleted_at IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async countBy(filters: FindConditions): Promise<number> {
    return this.buildFindQuery(filters).getCount();
  }

  async findSortPaginateBy(filters: FindConditions, options: FindOptions<OfferSortKeys>): Promise<Offer[]> {
    const query = this.buildFindQuery(filters).skip(options.skip).take(options.limit);
    const direction = options.sort?.direction ?? 'DESC';
    const sortBy = ((): string => {
      switch (options.sort?.by) {
        case 'principalUsd':
        case 'repaymentMaxUsd': {
          const column = options.sort.by === 'principalUsd' ? 'principal' : 'repayment_max';
          const alias = `${this.tableAlias}_${(options.sort.by as string).toLowerCase()}`;
          this.addUsdConversionSelect(query, column, alias);
          return alias;
        }
        default: {
          const columnMeta = this.model.metadata.findColumnWithPropertyName(
            (options.sort?.by as string) ?? 'createdAt'
          );
          return columnMeta ? `${this.tableAlias}.${columnMeta.propertyName}` : `${this.tableAlias}.createdAt`;
        }
      }
    })();
    return query.orderBy(sortBy, direction, 'NULLS LAST').addOrderBy(`${this.tableAlias}.id`, 'ASC').getMany();
  }

  async findByBorrower(borrower: string): Promise<Offer[]> {
    return this.model.find({
      where: {
        borrower: borrower.toLowerCase(),
        expiresAt: MoreThanOrEqual(new Date())
      }
    });
  }

  async findActiveBorrowers(): Promise<string[]> {
    const rows = await this.model
      .createQueryBuilder('offers')
      .select('DISTINCT offers.borrower', 'borrower')
      .where('offers.deleted_at IS NULL')
      .getRawMany<{ borrower: string }>();
    return rows.map(r => r.borrower);
  }

  private addUsdConversionSelect(query: SelectQueryBuilder<Offer>, column: string, alias: string): void {
    const wethAddress = this.supportedCurrencies.getByTicker(Ticker.WETH).contractAddress;
    const selectQuery = `case
        when ("${this.tableAlias}"."currency" = '${wethAddress}')
        then "${this.tableAlias}"."${column}" * ${this.fxConfig.ethusdt}
        else "${this.tableAlias}"."${column}"
      end`.replace(/\s+/g, ' ');
    query.addSelect(selectQuery, alias);
  }

  private buildFindQuery(filters: FindConditions): SelectQueryBuilder<Offer> {
    const alias = this.tableAlias;
    const query = this.model.createQueryBuilder(alias);
    if (filters.withDeleted) {
      query.withDeleted();
    }
    query.where(`${alias}.expires_at >= :now`, { now: new Date() });

    if (isNumber(filters.id)) {
      query.andWhere(`${alias}.id = :id`, { id: filters.id });
    }
    if (isString(filters.type)) {
      query.andWhere(`${alias}.type = :type`, { type: filters.type });
    }
    if (isArray(filters.typeIn) && filters.typeIn.length > 0) {
      query.andWhere(`${alias}.type IN (:...typeIn)`, { typeIn: filters.typeIn });
    }
    if (isString(filters.lender)) {
      query.andWhere(`${alias}.lender = :lender`, { lender: filters.lender.toLowerCase() });
    }
    if (isString(filters.lenderNe)) {
      query.andWhere(`${alias}.lender != :lenderNe`, { lenderNe: filters.lenderNe.toLowerCase() });
    }
    if (isString(filters.borrower)) {
      query.andWhere(`${alias}.borrower = :borrower`, { borrower: filters.borrower.toLowerCase() });
    }
    if (isString(filters.borrowerNe)) {
      query.andWhere(`${alias}.borrower != :borrowerNe`, { borrowerNe: filters.borrowerNe.toLowerCase() });
    }
    if (isString(filters.nftContract)) {
      query.andWhere(`${alias}.nft_contract = :nftContract`, {
        nftContract: filters.nftContract.toLowerCase()
      });
    }
    if (isString(filters.currency)) {
      query.andWhere(`${alias}.currency = :currency`, { currency: filters.currency.toLowerCase() });
    }
    if (isNumber(filters.duration)) {
      query.andWhere(`${alias}.duration = :duration`, { duration: filters.duration });
    }
    if (isArray(filters.durationNin) && filters.durationNin.length > 0) {
      query.andWhere(`${alias}.duration NOT IN (:...durationNin)`, { durationNin: filters.durationNin });
    }
    if (isNumber(filters.aprLte)) {
      query.andWhere(`${alias}.apr <= :aprLte`, { aprLte: filters.aprLte });
    }
    if (isBoolean(filters.prorated)) {
      query.andWhere(`${alias}.prorated = :prorated`, { prorated: filters.prorated });
    }
    if (isString(filters.lenderNonce)) {
      query.andWhere(`${alias}.lender_nonce = :lenderNonce`, { lenderNonce: filters.lenderNonce });
    }
    if (isString(filters.nftTokenId)) {
      query.andWhere(
        `(
          (${alias}.type = :assetType AND ${alias}.nft_token_id_from = :tokenId)
          OR (${alias}.type = :collectionType AND ${alias}.nft_token_id_from <= :tokenId AND ${alias}.nft_token_id_to >= :tokenId)
          OR ${alias}.type = :contractType
        )`,
        {
          assetType: OfferType.Asset,
          collectionType: OfferType.Collection,
          contractType: OfferType.Contract,
          tokenId: filters.nftTokenId
        }
      );
    }
    if (isArray(filters.collectionIds) && filters.collectionIds.length > 0) {
      query.andWhere(`${alias}.collection_id IN (:...collectionIds)`, { collectionIds: filters.collectionIds });
    }

    return query;
  }
}
