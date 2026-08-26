import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants } from 'ethers';
import { first, flatten, isNumber, uniq } from 'lodash';
import { plainToInstance } from 'class-transformer';
import { BN } from 'bn.js';
import { SupportedCurrencies } from '@nftfi.api/core';
import { Errors } from '@nftfi.api/core/dtos';
import {
  DraftOffer,
  FindConditions,
  Offer,
  OfferRepository,
  OfferSortKeys,
  OfferType
} from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';
import { type AuthTokenPayload } from '@nftfi.api/modules/auth-guard';
import { AssetContract } from '@nftfi.api/services/assets';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { GnosisFacade } from '@nftfi.api/facades/gnosis';
import { NftfiLoanMath } from '@nftfi.api/services/loans/subscribers/nftfi/nftfi-loan-math';
import { Config } from '../config';
import { OfferNotificationService } from '../offer-notification';
import { OfferType as MongoOfferType } from './offer.types';
import {
  DraftOfferTypeDto,
  DraftOfferV03Dto,
  OfferTermsLoanDto,
  OfferV03BalanceDto,
  OfferV03Dto,
  OfferV03FlagsDto,
  OfferV03NftDto,
  OfferV03QueryDto,
  ParamsDirection,
  ParamsSort
} from './dtos';
import { DtoTransformParams, Integrator, OfferV03Config } from './offer-v03.types';

type SortDirection = 'ASC' | 'DESC';

const MONGO_TO_PG_TYPE: Record<MongoOfferType, OfferType> = {
  [MongoOfferType.Asset]: OfferType.Asset,
  [MongoOfferType.Collection]: OfferType.Collection
};

const PG_TO_MONGO_TYPE: Record<OfferType, MongoOfferType> = {
  [OfferType.Asset]: MongoOfferType.Asset,
  [OfferType.Collection]: MongoOfferType.Collection,
  [OfferType.Contract]: MongoOfferType.Collection
};

const SORT_FIELD: Record<ParamsSort, { by: keyof OfferSortKeys; default: SortDirection }> = {
  [ParamsSort.Expiry]: { by: 'expiresAt', default: 'DESC' },
  [ParamsSort.Lender]: { by: 'lender', default: 'ASC' },
  [ParamsSort.LoanDuration]: { by: 'duration', default: 'ASC' },
  [ParamsSort.LoanPrincipalAmount]: { by: 'principalUsd', default: 'DESC' },
  [ParamsSort.MaximumRepaymentAmount]: { by: 'repaymentMaxUsd', default: 'DESC' },
  [ParamsSort.OfferDate]: { by: 'createdAt', default: 'DESC' },
  [ParamsSort.Apr]: { by: 'apr', default: 'ASC' },
  [ParamsSort.EffectiveApr]: { by: 'apr', default: 'ASC' },
  [ParamsSort.InterestProrated]: { by: 'prorated', default: 'ASC' },
  [ParamsSort.ContractName]: { by: 'createdAt', default: 'DESC' },
  [ParamsSort.InterestPercentage]: { by: 'apr', default: 'ASC' }
};

@Injectable()
export class OfferV03Service {
  private readonly logger = new Logger(OfferV03Service.name);
  private readonly config: OfferV03Config;

  constructor(
    private readonly offerRepository: OfferRepository,
    private readonly marketLoanRepository: MarketLoanRepository,
    private readonly supportedCurrencies: SupportedCurrencies,
    private readonly configService: ConfigService,
    private readonly offerNotificationService: OfferNotificationService,
    private readonly assetContractService: AssetContract,
    private readonly assetsFacade: AssetsFacade,
    private readonly gnosisFacade: GnosisFacade
  ) {
    this.config = {
      gnosis: {
        urlTransaction: this.configService.get<string>('gnosis.urlTransaction')!
      },
      validation: this.configService.get<Config['validation']>('validation')!,
      pagination: this.configService.get<Config['pagination']>('pagination')!,
      integrators: this.configService.get<string>('integrators')!,
      contracts: this.configService.get<Config['contracts']>('contracts')!,
      legacy: this.configService.get<Config['legacy']>('legacy')!
    };
  }

  async getMany(
    query: OfferV03QueryDto,
    { account, multisig }: AuthTokenPayload,
    apiKey: string
  ): Promise<[OfferV03Dto[], number]> {
    const filters = this.buildFilters(query, account);
    const total = await this.offerRepository.countBy(filters);
    const data = await this.offerRepository.findSortPaginateBy(filters, this.buildPaginationOptions(query));
    const redactedOffers = await Promise.all(
      data.map(offer => this.redactSignature(offer, account, multisig?.type, apiKey))
    );
    const dtos = await this.toDtos(redactedOffers, query);
    return [dtos, total];
  }

  async create(offer: DraftOfferV03Dto): Promise<OfferV03Dto> {
    const errors = await this.validateOffer(offer);
    if (Object.keys(errors).length) {
      throw new UnprocessableEntityException({ errors });
    }

    const pgType = this.resolvePgType(offer);
    const tokenIdRange = this.getTokenIdRange(offer, pgType);
    const collection = await this.resolveCollection(offer.nft.address, tokenIdRange, pgType);

    const principal = String(offer.terms.loan.principal);
    const repayment = String(offer.terms.loan.repayment);
    const origination = String(offer.terms.loan.origination ?? 0);

    const draft: DraftOffer = {
      type: pgType,
      lender: offer.lender.address,
      lenderNonce: offer.lender.nonce,
      borrower: offer.borrower?.address ?? constants.AddressZero,
      nftContract: offer.nft.address,
      nftTokenIdFrom: tokenIdRange.from,
      nftTokenIdTo: tokenIdRange.to,
      collection: { id: collection.id },
      currency: offer.terms.loan.currency,
      principal,
      repaymentMax: repayment,
      originationFee: origination,
      apr: NftfiLoanMath.calculateApr(principal, repayment, offer.terms.loan.duration),
      eapr: NftfiLoanMath.calculateEffectiveApr(principal, repayment, offer.terms.loan.duration, origination),
      duration: offer.terms.loan.duration,
      expiresAt: new Date(offer.terms.loan.expiry * 1000),
      prorated: offer.terms.loan.interest.prorated,
      signature: offer.signature
    };

    try {
      const entity = await this.offerRepository.create(draft);
      await this.offerNotificationService.notifyBorrowerReceivedOffer(entity);
      return this.toDto(entity);
    } catch (e) {
      this.logger.error(`Failed to create offer: ${e.message}`);
      throw new UnprocessableEntityException({
        errors: { offer: ['Failed to create offer'] }
      });
    }
  }

  private async resolveCollection(
    contract: string,
    tokenIdRange: { from: string; to: string },
    type: OfferType
  ): Promise<{ id: number }> {
    const collections = await this.assetsFacade.getCollectionsByContract(contract);
    if (!collections.length) {
      throw new UnprocessableEntityException({
        errors: { 'nft.address': [`No collection found for contract ${contract}`] }
      });
    }
    if (type === OfferType.Contract) {
      return collections[0];
    }
    const matched = collections.find(c => {
      const range = c.tokenRange.split(':') as [string, string];
      return AssetsFacade.isInRange(range, tokenIdRange.from) && AssetsFacade.isInRange(range, tokenIdRange.to);
    });
    if (!matched) {
      throw new UnprocessableEntityException({
        errors: {
          'nft.id': [`Token range ${tokenIdRange.from}:${tokenIdRange.to} is not within any collection of ${contract}`]
        }
      });
    }
    return matched;
  }

  private resolvePgType(offer: DraftOfferV03Dto): OfferType {
    if (offer.type === MongoOfferType.Collection && 'ids' in offer.nft && offer.nft.ids) {
      return OfferType.Collection;
    }
    if (offer.type === MongoOfferType.Collection) {
      return OfferType.Contract;
    }
    return OfferType.Asset;
  }

  private getTokenIdRange(offer: DraftOfferV03Dto, pgType: OfferType): { from: string; to: string } {
    if (pgType === OfferType.Asset) {
      return { from: offer.nft.id, to: offer.nft.id };
    }
    if (pgType === OfferType.Collection && 'ids' in offer.nft && offer.nft.ids) {
      return { from: String(offer.nft.ids.from), to: String(offer.nft.ids.to) };
    }
    return { from: '0', to: '0' };
  }

  private validateTermsDuration(offer: DraftOfferTypeDto, errors: Errors): Errors {
    const minDuration = Number(this.config.validation.minimumLoanDurationSeconds);
    const modDuration = isNaN(minDuration) ? 86400 : minDuration;
    const isValidDuration = offer.terms.loan.duration > 0 && offer.terms.loan.duration % modDuration === 0;
    if (!isValidDuration) {
      errors['terms.loan.duration'] = [
        `duration must be specified in seconds, and in ${minDuration} seconds increments (eg. ${minDuration}, ${
          minDuration * 2
        }, ${minDuration * 3})`
      ];
    }
    return errors;
  }

  private async validateOfferLimit(offer: DraftOfferTypeDto, errors: Errors): Promise<Errors> {
    const pgType = this.resolvePgType(offer as DraftOfferV03Dto);
    const max = this.config.validation.createLimit[pgType];
    const baseFilter: FindConditions = {
      type: pgType,
      lender: offer.lender.address,
      nftContract: offer.nft.address,
      currency: offer.terms.loan.currency,
      prorated: offer.terms.loan.interest.prorated
    };
    if (pgType === OfferType.Asset) {
      baseFilter.nftTokenId = offer.nft.id;
    }
    const count = await this.offerRepository.countBy(baseFilter);
    if (count >= max) {
      const dim = pgType === OfferType.Asset ? 'asset' : 'collection';
      errors['limit'] = [`Cannot make more than ${max} offers per lender, per currency, per loan type and per ${dim}`];
    }
    return errors;
  }

  private async validateOffer(offer: DraftOfferTypeDto): Promise<Errors> {
    let errors: Errors = {};
    errors = this.validateTermsDuration(offer, errors);
    if (Object.keys(errors).length) {
      return errors;
    }
    errors = await this.validateOfferLimit(offer, errors);
    return errors;
  }

  private buildFilters(query: OfferV03QueryDto, account: string): FindConditions {
    const includeDeleted =
      query.withDeleted &&
      query.lenderAddress &&
      account &&
      query.lenderAddress.toLowerCase() === account.toLowerCase();

    const filters: FindConditions = {};
    if (query.lenderAddress) filters.lender = query.lenderAddress;
    if (query.borrowerAddress) filters.borrower = query.borrowerAddress;
    if (query.lenderAddressNe) filters.lenderNe = query.lenderAddressNe;
    if (query.borrowerAddressNe) filters.borrowerNe = query.borrowerAddressNe;
    if (query.nftAddress) filters.nftContract = query.nftAddress;
    if (query.termsCurrencyAddress) filters.currency = query.termsCurrencyAddress;
    if (query.termsDuration) filters.duration = Number(query.termsDuration);
    if (Array.isArray(query.termsDurationNin) && query.termsDurationNin.length > 0) {
      filters.durationNin = query.termsDurationNin;
    }
    if (typeof query.termsAprLte === 'number') filters.aprLte = query.termsAprLte;
    if (typeof query.interestProrated === 'boolean') filters.prorated = query.interestProrated;
    if (query.type) filters.type = MONGO_TO_PG_TYPE[query.type];
    if (Array.isArray(query.typeIn) && query.typeIn.length > 0) {
      filters.typeIn = query.typeIn.map(t => MONGO_TO_PG_TYPE[t]);
    }
    if (query.nftId) filters.nftTokenId = query.nftId;
    if (query.offerId) {
      const parsed = Number(query.offerId);
      if (Number.isInteger(parsed)) {
        filters.id = parsed;
      }
    }
    if (includeDeleted) filters.withDeleted = true;
    return filters;
  }

  private buildPaginationOptions(query: OfferV03QueryDto): {
    skip: number;
    limit: number;
    sort: { by: keyof OfferSortKeys; direction: SortDirection };
  } {
    const page = query.page ?? this.config.pagination.page;
    const limit = query.limit ?? this.config.pagination.limit;
    const sortKey = SORT_FIELD[query.sort] ?? SORT_FIELD[ParamsSort.OfferDate];
    const direction: SortDirection =
      query.direction === ParamsDirection.Asc
        ? 'ASC'
        : query.direction === ParamsDirection.Desc
        ? 'DESC'
        : sortKey.default;
    return {
      skip: (page - 1) * limit,
      limit,
      sort: { by: sortKey.by, direction }
    };
  }

  private getIntegrators(): Integrator[] {
    let integrators: Integrator[] = [];
    try {
      integrators = JSON.parse(this.config.integrators) as Integrator[];
    } catch {}
    return integrators;
  }

  getIntegrator(apiKey: string): Integrator | undefined {
    const integrators = this.getIntegrators();
    return integrators.find(i => i.apiKeys.includes(apiKey));
  }

  isIntegratorContractOwner(integrator: Integrator, nftAddress: string): boolean {
    const lc = nftAddress.toLowerCase();
    return integrator.nftAddresses.some(address => address.toLowerCase() === lc);
  }

  async isGnosisSafeOwner(account: string, borrower: string): Promise<boolean> {
    const safes = await this.gnosisFacade.getSafes(account);
    return safes.includes(borrower.toLowerCase());
  }

  private async redactSignature(
    offer: Offer,
    tokenAccount: string,
    multisigType: string | undefined,
    apiKey: string
  ): Promise<Offer> {
    if (this.isCollectionOffer(offer)) {
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
      this.logger.warn(
        `Failed to check ${tokenAccount} ownership of ${offer.nftContract}:${offer.nftTokenIdFrom}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  async toDtos(offers: Offer[], params: DtoTransformParams = {}): Promise<OfferV03Dto[]> {
    const assetOffers = offers.filter(offer => !this.isCollectionOffer(offer));
    const collectionOffers = offers.filter(offer => this.isCollectionOffer(offer));
    const [assets, collections] = await Promise.all([
      assetOffers.length
        ? this.assetsFacade.getAssets({
            keys: assetOffers.map(offer => ({
              contract: offer.nftContract,
              tokenId: offer.nftTokenIdFrom
            }))
          })
        : [],
      collectionOffers.length
        ? flatten(
            await Promise.all(
              uniq(collectionOffers.map(offer => offer.nftContract)).map(contract =>
                this.assetsFacade.getCollectionsByContract(contract)
              )
            )
          )
        : []
    ]);

    const dtos: OfferV03Dto[] = [];
    for (const offer of offers) {
      const contractName = this.config.legacy.v03.contractNameByType[offer.type];
      const adminFeeBps = this.config.legacy.v03.adminFeeBps;
      dtos.push({
        id: String(offer.id),
        nft: this.buildNftDto(offer, assets, collections),
        date: { offered: offer.createdAt },
        lender: { address: offer.lender, nonce: offer.lenderNonce },
        borrower: { address: offer.borrower },
        signature: offer.signature,
        flags: await this.toFlagsDto(offer, params),
        type: PG_TO_MONGO_TYPE[offer.type],
        terms: this.buildTermsDto(offer),
        nftfi: { contract: { name: contractName }, fee: { bps: adminFeeBps } },
        referrer: { address: constants.AddressZero },
        deleted: !!offer.deletedAt
      });
    }

    return plainToInstance(OfferV03Dto, dtos);
  }

  private async toDto(offer: Offer, params: DtoTransformParams = {}): Promise<OfferV03Dto> {
    return first(await this.toDtos([offer], params))!;
  }

  private buildNftDto(
    offer: Offer,
    assets: Awaited<ReturnType<AssetsFacade['getAssets']>>,
    collections: Awaited<ReturnType<AssetsFacade['getCollectionsByContract']>>
  ): OfferV03NftDto {
    if (this.isCollectionOffer(offer)) {
      const tokenId = String(offer.nftTokenIdFrom);
      const collection = AssetsFacade.getClosestCollectionToTokenId(collections, offer.nftContract, tokenId);
      const isRange = offer.type === OfferType.Collection && isNumber(Number(offer.nftTokenIdFrom));
      return {
        id: offer.nftTokenIdFrom,
        address: offer.nftContract,
        imageUrl: collection?.imageUrl,
        project: { name: collection?.name },
        ...(isRange && offer.type === OfferType.Collection
          ? { ids: { from: Number(offer.nftTokenIdFrom), to: Number(offer.nftTokenIdTo) } }
          : {})
      };
    }
    const asset = assets.find(a => a.contract === offer.nftContract && a.tokenId === offer.nftTokenIdFrom);
    return {
      id: offer.nftTokenIdFrom,
      address: offer.nftContract,
      name: asset?.name,
      imageUrl: asset?.imageMediumUrl,
      project: { name: asset?.collection?.name }
    };
  }

  private buildTermsDto(offer: Offer): OfferV03Dto['terms'] {
    const crypto = this.supportedCurrencies.getByContract(offer.currency);
    const principal = Number(offer.principal);
    const repayment = Number(offer.repaymentMax);
    const interestBps = principal > 0 ? Math.floor(((repayment - principal) * 10000) / principal) : 0;
    const cost = principal > 0 ? (repayment / principal - 1) * 100 : 0;
    const base: OfferTermsLoanDto = {
      unit: crypto.denomination,
      duration: offer.duration,
      repayment,
      principal,
      apr: offer.apr,
      effectiveApr: offer.eapr,
      cost,
      currency: offer.currency,
      expiry: Math.floor(offer.expiresAt.getTime() / 1000),
      origination: Number(offer.originationFee),
      interest: { prorated: offer.prorated, bps: interestBps }
    };
    return { loan: base };
  }

  private async toFlagsDto(offer: Offer, query: DtoTransformParams = {}): Promise<OfferV03FlagsDto> {
    let balance: OfferV03FlagsDto['balance'] = null;
    if (Array.isArray(query.lenderBalances)) {
      balance = { underfunded: await this.getUnderfundedBalanceFlag(offer, query.lenderBalances) };
    }
    return { balance };
  }

  private async getUnderfundedBalanceFlag(offer: Offer, balances: OfferV03BalanceDto[] = []): Promise<boolean> {
    const lenderOfferCurrency = balances.find(entry => entry.currency === offer.currency);
    if (!lenderOfferCurrency) return false;

    const lenderBalance = new BN(lenderOfferCurrency.balance.toString());
    const offerPrincipal = new BN(offer.principal.toString());

    if (lenderBalance.gt(offerPrincipal)) return false;

    const [loan] = await this.marketLoanRepository.find(
      {
        statuses: [MarketLoanStatus.Active],
        nftContracts: [offer.nftContract],
        nftIds: [offer.nftTokenIdFrom],
        currencies: [offer.currency]
      },
      { skip: 0, limit: 1, sort: { by: 'repaymentMax', direction: 'DESC' } }
    );
    if (!loan) return true;

    const loanRepayment = new BN(loan.repaymentMax.toString());
    const lenderRefiBalance = lenderBalance.add(loanRepayment);
    return !lenderRefiBalance.gt(offerPrincipal);
  }

  private isCollectionOffer(offer: Offer): boolean {
    return offer.type === OfferType.Collection || offer.type === OfferType.Contract;
  }
}
