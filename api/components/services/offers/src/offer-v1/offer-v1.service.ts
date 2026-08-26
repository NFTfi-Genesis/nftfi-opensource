import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { RedisStore } from 'cache-manager-ioredis-yet';
import { plainToInstance } from 'class-transformer';
import { constants } from 'ethers';
import { flatten, isArray, isBoolean, isNumber, isString, pickBy, uniq } from 'lodash';
import { SupportedCurrencies, invalidateCacheByScope } from '@nftfi.api/core';
import {
  DraftOffer,
  FindConditions,
  Offer,
  OfferRepository,
  OfferSortKeys,
  OfferStatus,
  OfferType
} from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';
import { type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';
import { AssetContract } from '@nftfi.api/services/assets';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { GnosisFacade } from '@nftfi.api/facades/gnosis';
import { type WinningOfferKey, OffersFacade } from '@nftfi.api/facades/offers';
import { AssetDto, CollectionDto } from '@nftfi.api/facades/assets/dtos';
import { NftfiLoanMath } from '@nftfi.api/services/loans/subscribers/nftfi/nftfi-loan-math';
import { Config } from '../config';
import { OfferNotificationService } from '../offer-notification';
import { DraftOfferV1Dto, OfferV1Dto, OfferV1QueryDto, OfferV1SortDirection, OfferV1SortField } from './dtos';
import {
  DELETE_REASON_EXPIRED,
  DELETE_REASON_LOAN_STARTED,
  OfferV1Config,
  OfferV1Integrator,
  OffersV1CacheScope
} from './offer-v1.types';

const SORT_FIELD_TO_ENTITY: Record<OfferV1SortField, keyof OfferSortKeys> = {
  [OfferV1SortField.CreatedAt]: 'createdAt',
  [OfferV1SortField.Principal]: 'principal',
  [OfferV1SortField.RepaymentMax]: 'repaymentMax',
  [OfferV1SortField.Apr]: 'apr',
  [OfferV1SortField.Duration]: 'duration',
  [OfferV1SortField.ExpiresAt]: 'expiresAt',
  [OfferV1SortField.Lender]: 'lender',
  [OfferV1SortField.Prorated]: 'prorated'
};

@Injectable()
export class OfferV1Service {
  private readonly logger = new Logger(OfferV1Service.name);
  private readonly config: OfferV1Config;

  constructor(
    private readonly offerRepository: OfferRepository,
    private readonly marketLoanRepository: MarketLoanRepository,
    private readonly supportedCurrencies: SupportedCurrencies,
    private readonly assetsFacade: AssetsFacade,
    private readonly assetContractService: AssetContract,
    private readonly notificationService: OfferNotificationService,
    private readonly gnosisFacade: GnosisFacade,
    private readonly configService: ConfigService,
    private readonly offersFacade: OffersFacade,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache<RedisStore>
  ) {
    this.config = {
      integrators: this.configService.get<string>('integrators')!,
      contracts: this.configService.get<Config['contracts']>('contracts')!
    };
  }

  async create(offer: DraftOfferV1Dto, account?: string): Promise<Offer> {
    if (account) {
      this.assertLenderIsCaller(offer.lender.address, account);
    }

    const tokenIdRange = this.getTokenIdRange(offer);
    const collection = await this.resolveCollection(offer, tokenIdRange);
    const draft: DraftOffer = {
      type: offer.type,
      lender: offer.lender.address,
      lenderNonce: offer.lender.nonce,
      borrower: offer.borrower?.address ?? constants.AddressZero,
      nftContract: offer.nft.contract,
      nftTokenIdFrom: tokenIdRange.from,
      nftTokenIdTo: tokenIdRange.to,
      collection: { id: collection.id },
      currency: offer.terms.loan.currency,
      principal: offer.terms.loan.principal,
      repaymentMax: offer.terms.loan.repayment,
      originationFee: offer.terms.loan.origination,
      apr: NftfiLoanMath.calculateApr(
        offer.terms.loan.principal,
        offer.terms.loan.repayment,
        offer.terms.loan.duration
      ),
      eapr: NftfiLoanMath.calculateEffectiveApr(
        offer.terms.loan.principal,
        offer.terms.loan.repayment,
        offer.terms.loan.duration,
        offer.terms.loan.origination
      ),
      duration: offer.terms.loan.duration,
      expiresAt: offer.terms.loan.expiresAt,
      prorated: offer.terms.loan.prorated,
      signature: offer.signature
    };

    const entity = await this.offerRepository.create(draft);
    await this.offersFacade.invalidateCache();
    await this.notificationService.notifyBorrowerReceivedOffer(entity);
    return entity;
  }

  async invalidateCache(): Promise<void> {
    await invalidateCacheByScope(this.cacheManager, OffersV1CacheScope);
  }

  private async resolveCollection(
    offer: DraftOfferV1Dto,
    tokenIdRange: { from: string; to: string }
  ): Promise<CollectionDto> {
    const collections = await this.assetsFacade.getCollectionsByContract(offer.nft.contract);
    if (!collections.length) {
      throw new UnprocessableEntityException({
        errors: { 'nft.contract': [`No collection found for contract ${offer.nft.contract}`] }
      });
    }
    if (offer.type === OfferType.Contract) {
      return collections[0];
    }
    const matched = collections.find(c => {
      const range = c.tokenRange.split(':') as [string, string];
      return AssetsFacade.isInRange(range, tokenIdRange.from) && AssetsFacade.isInRange(range, tokenIdRange.to);
    });
    if (!matched) {
      throw new UnprocessableEntityException({
        errors: {
          'nft.tokenId': [
            `Token range ${tokenIdRange.from}:${tokenIdRange.to} is not within any collection of contract ${offer.nft.contract}`
          ]
        }
      });
    }
    return matched;
  }

  private getTokenIdRange(offer: DraftOfferV1Dto): { from: string; to: string } {
    if (offer.type === OfferType.Asset) {
      const tokenId = (offer.nft as { tokenId: string }).tokenId;
      return { from: tokenId, to: tokenId };
    }
    if (offer.type === OfferType.Collection) {
      return (offer.nft as { tokenId: { from: string; to: string } }).tokenId;
    }
    return { from: '0', to: '0' };
  }

  async getMany(query: OfferV1QueryDto, { account, multisig }: AuthTokenPayload, apiKey: string): Promise<Offer[]> {
    const filters = this.buildFilters(query, account);
    const skip = (query.page - 1) * query.limit;
    const direction = query.direction === OfferV1SortDirection.Asc ? 'ASC' : 'DESC';
    const sortField = query.sort || OfferV1SortField.CreatedAt;

    const data = await this.offerRepository.findSortPaginateBy(filters, {
      skip,
      limit: query.limit,
      sort: { by: SORT_FIELD_TO_ENTITY[sortField], direction }
    });

    return Promise.all(data.map(offer => this.redactSignature(offer, account, multisig?.type, apiKey)));
  }

  async count(query: OfferV1QueryDto, account: string): Promise<number> {
    return this.offerRepository.countBy(this.buildFilters(query, account));
  }

  async deleteById(id: number, account: string): Promise<void> {
    const offer = await this.offerRepository.findById(id);
    if (!offer) {
      throw new NotFoundException({ errors: { id: [`Offer ${id} not found`] } });
    }
    this.assertLenderIsCaller(offer.lender, account);
    await this.offerRepository.softDelete(id);
    await this.offersFacade.invalidateCache();
  }

  private assertLenderIsCaller(lender: string, account: string): void {
    if (lender.toLowerCase() !== account.toLowerCase()) {
      throw new UnauthorizedException({ errors: { lender: ['Offer lender must match the authenticated account'] } });
    }
  }

  async deleteWinningOffer(key: WinningOfferKey): Promise<void> {
    const affected = await this.offerRepository.softDeleteWinningOffer(key, DELETE_REASON_LOAN_STARTED);
    if (affected > 0) {
      await this.offersFacade.invalidateCache();
      this.logger.log(
        `Soft-deleted ${affected} winning offers for lender ${key.lender.toLowerCase()} on asset ${key.nftContract.toLowerCase()}#${
          key.nftTokenId
        }`
      );
    }
  }

  async deleteExpired(): Promise<void> {
    const affected = await this.offerRepository.softDeleteExpired(DELETE_REASON_EXPIRED);
    if (affected > 0) {
      await this.offersFacade.invalidateCache();
      this.logger.log(`Soft-deleted ${affected} expired offers`);
    }
  }

  async toDtos(offers: Offer[]): Promise<OfferV1Dto[]> {
    const assetOffers = offers.filter(offer => offer.type === OfferType.Asset);
    const uniqueContracts = uniq(offers.map(offer => offer.nftContract));

    const [assets, collections] = await Promise.all([
      assetOffers.length
        ? this.assetsFacade.getAssets({
            keys: assetOffers.map(offer => ({
              contract: offer.nftContract,
              tokenId: offer.nftTokenIdFrom
            }))
          })
        : [],
      uniqueContracts.length
        ? flatten(
            await Promise.all(uniqueContracts.map(contract => this.assetsFacade.getCollectionsByContract(contract)))
          )
        : []
    ]);

    return offers.map(offer => this.buildDto(offer, assets, collections));
  }

  async redactSignature(
    offer: Offer,
    tokenAccount: string,
    multisigType: string | undefined,
    apiKey: string
  ): Promise<Offer> {
    if (offer.type === OfferType.Collection || offer.type === OfferType.Contract) {
      return offer;
    }

    const isBorrower = await this.isBorrower(offer, tokenAccount, multisigType);
    let isContractOwner = false;
    if (!isBorrower) {
      const integrator = this.getIntegrator(apiKey);
      if (integrator) {
        isContractOwner = this.isIntegratorContractOwner(integrator, offer.nftContract);
      }
    }

    if (isBorrower || isContractOwner) {
      return offer;
    }

    return { ...offer, signature: null };
  }

  getIntegrator(apiKey: string): OfferV1Integrator | undefined {
    let integrators: OfferV1Integrator[] = [];
    try {
      integrators = JSON.parse(this.config.integrators) as OfferV1Integrator[];
    } catch {}
    return integrators.find(i => i.apiKeys.includes(apiKey));
  }

  isIntegratorContractOwner(integrator: OfferV1Integrator, nftContract: string): boolean {
    const lc = nftContract.toLowerCase();
    return integrator.nftAddresses.some(address => address.toLowerCase() === lc);
  }

  async isGnosisSafeOwner(account: string, borrower: string): Promise<boolean> {
    const safes = await this.gnosisFacade.getSafes(account);
    return safes.includes(borrower.toLowerCase());
  }

  private async isBorrower(offer: Offer, tokenAccount: string, multisigType: string | undefined): Promise<boolean> {
    const escrowV3 = this.config.contracts.nftfi.escrowV3;
    if (escrowV3 && offer.borrower.toLowerCase() === escrowV3.toLowerCase()) {
      const [loan] = await this.marketLoanRepository.find(
        {
          statuses: [MarketLoanStatus.Active],
          nftContracts: [offer.nftContract],
          nftIds: [offer.nftTokenIdFrom]
        },
        { skip: 0, limit: 1, sort: { by: 'startedAt', direction: 'DESC' } }
      );
      if (loan?.borrower) {
        return loan.borrower.toLowerCase() === tokenAccount?.toLowerCase();
      }
    }
    if (multisigType === 'gnosis') {
      return this.isGnosisSafeOwner(tokenAccount, offer.borrower);
    }
    if (offer.borrower.toLowerCase() === tokenAccount?.toLowerCase()) {
      return true;
    }
    if (!tokenAccount) {
      return false;
    }
    try {
      return await this.assetContractService.isOwnerOf(offer.nftContract, offer.nftTokenIdFrom, tokenAccount);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to check ${tokenAccount} ownership of ${offer.nftContract}:${offer.nftTokenIdFrom}: ${message}`
      );
      return false;
    }
  }

  private buildFilters(query: OfferV1QueryDto, account: string): FindConditions {
    const includeDeleted =
      query.withDeleted &&
      isString(query.lender) &&
      isString(account) &&
      query.lender.toLowerCase() === account.toLowerCase();

    return {
      ...pickBy(
        {
          lender: query.lender,
          borrower: query.borrower,
          nftContract: query.nftContract,
          lenderNe: query.lenderNe,
          borrowerNe: query.borrowerNe,
          type: query.type,
          currency: query.currency,
          nftTokenId: query.nftTokenId,
          lenderNonce: query.nonce
        },
        isString
      ),
      ...pickBy(
        {
          duration: query.duration,
          aprLte: query.aprLte
        },
        isNumber
      ),
      ...pickBy({ prorated: query.prorated }, isBoolean),
      ...pickBy(
        {
          typeIn: query.typeIn,
          durationNin: query.durationNin,
          collectionIds: query.collectionIds
        },
        value => isArray(value) && value.length > 0
      ),
      ...(includeDeleted ? { withDeleted: true } : {})
    };
  }

  private buildDto(offer: Offer, assets: AssetDto[], collections: CollectionDto[]): OfferV1Dto {
    const currency = this.supportedCurrencies.getByContract(offer.currency);
    const asset = offer.type === OfferType.Asset ? this.findAsset(offer, assets) : undefined;
    const collection = this.buildCollection(offer, asset, collections);

    const dto: OfferV1Dto = {
      id: offer.id,
      type: offer.type,
      status: offer.deletedAt ? OfferStatus.Deleted : OfferStatus.Active,
      lender: {
        address: offer.lender,
        nonce: offer.lenderNonce
      },
      borrower: { address: offer.borrower },
      collection,
      ...(asset ? { asset } : {}),
      tokenRange: { from: offer.nftTokenIdFrom, to: offer.nftTokenIdTo },
      terms: {
        loan: {
          duration: offer.duration,
          principal: offer.principal,
          repayment: offer.repaymentMax,
          origination: offer.originationFee,
          currency: offer.currency,
          expiresAt: offer.expiresAt,
          apr: offer.apr,
          eapr: offer.eapr,
          prorated: offer.prorated,
          unit: currency.denomination
        }
      },
      signature: offer.signature,
      createdAt: offer.createdAt
    };

    return plainToInstance(OfferV1Dto, dto);
  }

  private findAsset(offer: Offer, assets: AssetDto[]): AssetDto | undefined {
    return assets.find(entry => entry.contract === offer.nftContract && entry.tokenId === offer.nftTokenIdFrom);
  }

  private buildCollection(offer: Offer, asset: AssetDto | undefined, collections: CollectionDto[]): CollectionDto {
    if (offer.type === OfferType.Asset) {
      return asset?.collection!;
    }
    if (offer.type === OfferType.Contract) {
      return collections.find(entry => entry.contract.toLowerCase() === offer.nftContract.toLowerCase())!;
    }
    return AssetsFacade.getClosestCollectionToTokenId(collections, offer.nftContract, offer.nftTokenIdFrom);
  }
}
