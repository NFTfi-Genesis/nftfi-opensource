import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoreThanOrEqual } from 'typeorm';
import { SupportedCurrencies } from '@nftfi.api/core';
import { FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { Offer, OfferRepository, OfferType } from '@nftfi.api/repositories/postgres/offer';
import { createTypeormQueryBuilderMock, createTypeormRepositoryMock, MockTypeormRepository } from '../factories';
import { buildPostgresOffer } from './offer.factory';

describe(OfferRepository.name, () => {
  let repository: OfferRepository;
  let model: MockTypeormRepository<Offer>;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-10T00:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        OfferRepository,
        {
          provide: getRepositoryToken(Offer),
          useValue: createTypeormRepositoryMock<Offer>()
        },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
          })
        },
        { provide: FxRateConfigToken, useValue: { ethusdt: 2000 } }
      ]
    }).compile();

    repository = moduleRef.get(OfferRepository);
    model = moduleRef.get(getRepositoryToken(Offer));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe(OfferRepository.prototype.create.name, () => {
    it('persists the draft via create and save', async () => {
      const draft = {
        type: OfferType.Asset,
        borrower: '0xborrower',
        lender: '0xlender',
        lenderNonce: '1',
        nftContract: '0xnft',
        nftTokenIdFrom: '1',
        nftTokenIdTo: '1',
        collection: { id: 7 },
        currency: '0xcurrency',
        principal: '1000000000000000000',
        repaymentMax: '1100000000000000000',
        originationFee: '0',
        apr: 10,
        eapr: 10,
        duration: 86400,
        expiresAt: new Date('2033-05-18T03:33:19.000Z'),
        prorated: false,
        signature: '0xsig'
      };
      const built = { ...draft, id: 7 } as unknown as Offer;
      const saved = { ...built } as Offer;
      model.create.mockReturnValue(built);
      model.save.mockResolvedValue(saved);

      const result = await repository.create(draft);

      expect(model.create).toHaveBeenCalledWith(draft);
      expect(model.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });
  });

  describe(OfferRepository.prototype.count.name, () => {
    it('delegates to model.count with the where clause', async () => {
      model.count.mockResolvedValue(3);

      const result = await repository.count({ borrower: '0xb' });

      expect(model.count).toHaveBeenCalledWith({
        where: { borrower: '0xb' }
      });
      expect(result).toBe(3);
    });
  });

  describe(OfferRepository.prototype.findById.name, () => {
    it('returns the offer matching the id', async () => {
      const offer = buildPostgresOffer({ id: 42 });
      model.findOne.mockResolvedValue(offer);

      const result = await repository.findById(42);

      expect(model.findOne).toHaveBeenCalledWith({ where: { id: 42 } });
      expect(result).toBe(offer);
    });

    it('returns null when not found', async () => {
      model.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe(OfferRepository.prototype.softDelete.name, () => {
    it('soft-deletes the offer, clears the signature, and returns the affected count', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 })
      };
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDelete(17);

      expect(qb.update).toHaveBeenCalledTimes(1);
      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: new Date('2024-04-10T00:00:00.000Z'),
        signature: null
      });
      expect(qb.where).toHaveBeenCalledWith('id = :id', { id: 17 });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(qb.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
    });

    it('returns zero when affected is undefined', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({})
      };
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDelete(17);

      expect(result).toBe(0);
    });
  });

  describe(OfferRepository.prototype.softDeleteExpired.name, () => {
    it('soft-deletes offers whose expires_at is in the past with the EXPIRED reason', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 4 })
      };
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDeleteExpired('EXPIRED');

      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: new Date('2024-04-10T00:00:00.000Z'),
        deletedReason: 'EXPIRED',
        signature: null
      });
      expect(qb.where).toHaveBeenCalledWith('expires_at < :now', { now: new Date('2024-04-10T00:00:00.000Z') });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(result).toBe(4);
    });

    it('returns zero when affected is undefined', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({})
      };
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDeleteExpired('EXPIRED');

      expect(result).toBe(0);
    });
  });

  describe(OfferRepository.prototype.softDeleteWinningOffer.name, () => {
    it('soft-deletes the winning offer matching lender, nft and loan terms and returns affected count', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 })
      };
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDeleteWinningOffer(
        {
          lender: '0xLENDER',
          nftContract: '0xNFTaddr',
          nftTokenId: '777',
          currency: '0xERC20',
          principal: '100',
          repaymentMax: '110',
          duration: 86400
        },
        'LOAN_STARTED'
      );

      expect(qb.update).toHaveBeenCalledTimes(1);
      expect(qb.set).toHaveBeenCalledWith({
        deletedAt: new Date('2024-04-10T00:00:00.000Z'),
        deletedReason: 'LOAN_STARTED',
        signature: null
      });
      expect(qb.where).toHaveBeenCalledWith('type = :type', { type: 'asset' });
      expect(qb.andWhere).toHaveBeenCalledWith('lender = :lender', { lender: '0xlender' });
      expect(qb.andWhere).toHaveBeenCalledWith('nft_contract = :nftContract', { nftContract: '0xnftaddr' });
      expect(qb.andWhere).toHaveBeenCalledWith('nft_token_id_from = :nftTokenId', { nftTokenId: '777' });
      expect(qb.andWhere).toHaveBeenCalledWith('nft_token_id_to = :nftTokenId', { nftTokenId: '777' });
      expect(qb.andWhere).toHaveBeenCalledWith('currency = :currency', { currency: '0xerc20' });
      expect(qb.andWhere).toHaveBeenCalledWith('principal = :principal', { principal: '100' });
      expect(qb.andWhere).toHaveBeenCalledWith('repayment_max = :repaymentMax', { repaymentMax: '110' });
      expect(qb.andWhere).toHaveBeenCalledWith('duration = :duration', { duration: 86400 });
      expect(qb.andWhere).toHaveBeenCalledWith('deleted_at IS NULL');
      expect(qb.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
    });

    it('returns zero when affected is undefined', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({})
      };
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.softDeleteWinningOffer(
        {
          lender: '0xlender',
          nftContract: '0xnft',
          nftTokenId: '1',
          currency: '0xerc20',
          principal: '100',
          repaymentMax: '110',
          duration: 86400
        },
        'LOAN_STARTED'
      );

      expect(result).toBe(0);
    });
  });

  describe(OfferRepository.prototype.findByBorrower.name, () => {
    it('looks up non-expired offers by lowercased borrower', async () => {
      const offer = buildPostgresOffer();
      model.find.mockResolvedValue([offer]);

      const result = await repository.findByBorrower('0xABCDEF');

      expect(model.find).toHaveBeenCalledWith({
        where: {
          borrower: '0xabcdef',
          expiresAt: MoreThanOrEqual(new Date('2024-04-10T00:00:00.000Z'))
        }
      });
      expect(result).toEqual([offer]);
    });
  });

  describe(OfferRepository.prototype.findActiveBorrowers.name, () => {
    it('returns distinct borrowers from raw query', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getRawMany!.mockResolvedValue([{ borrower: '0xa' }, { borrower: '0xb' }]);
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.findActiveBorrowers();

      expect(model.createQueryBuilder).toHaveBeenCalledWith('offers');
      expect(qb.select).toHaveBeenCalledWith('DISTINCT offers.borrower', 'borrower');
      expect(qb.where).toHaveBeenCalledWith('offers.deleted_at IS NULL');
      expect(result).toEqual(['0xa', '0xb']);
    });
  });

  describe(OfferRepository.prototype.countBy.name, () => {
    it('returns the count from the built query', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getCount!.mockResolvedValue(5);
      model.createQueryBuilder.mockReturnValue(qb as never);

      const result = await repository.countBy({});

      expect(model.createQueryBuilder).toHaveBeenCalledWith('offers');
      expect(qb.where).toHaveBeenCalledWith('offers.expires_at >= :now', { now: new Date('2024-04-10T00:00:00.000Z') });
      expect(qb.withDeleted).not.toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('calls withDeleted when requested', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({ withDeleted: true });

      expect(qb.withDeleted).toHaveBeenCalledTimes(1);
    });

    it('applies all string filters', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({
        type: OfferType.Asset,
        lender: '0xLENDER',
        lenderNe: '0xLENDERNE',
        borrower: '0xBORROWER',
        borrowerNe: '0xBORROWERNE',
        nftContract: '0xNFT',
        currency: '0xCURRENCY',
        lenderNonce: 'n-1',
        nftTokenId: '42'
      });

      expect(qb.andWhere).toHaveBeenCalledWith('offers.type = :type', { type: 'asset' });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.lender = :lender', { lender: '0xlender' });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.lender != :lenderNe', { lenderNe: '0xlenderne' });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.borrower = :borrower', { borrower: '0xborrower' });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.borrower != :borrowerNe', { borrowerNe: '0xborrowerne' });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.nft_contract = :nftContract', { nftContract: '0xnft' });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.currency = :currency', { currency: '0xcurrency' });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.lender_nonce = :lenderNonce', { lenderNonce: 'n-1' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('offers.type = :assetType AND offers.nft_token_id_from = :tokenId'),
        { assetType: 'asset', collectionType: 'collection', contractType: 'contract', tokenId: '42' }
      );
    });

    it('applies array, number and boolean filters', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({
        typeIn: [OfferType.Asset, OfferType.Collection],
        duration: 86400,
        durationNin: [172800, 259200],
        aprLte: 50,
        prorated: true
      });

      expect(qb.andWhere).toHaveBeenCalledWith('offers.type IN (:...typeIn)', { typeIn: ['asset', 'collection'] });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.duration = :duration', { duration: 86400 });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.duration NOT IN (:...durationNin)', {
        durationNin: [172800, 259200]
      });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.apr <= :aprLte', { aprLte: 50 });
      expect(qb.andWhere).toHaveBeenCalledWith('offers.prorated = :prorated', { prorated: true });
    });

    it('skips empty array filters', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({ typeIn: [], durationNin: [], collectionIds: [] });

      expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('offers.type IN'), expect.anything());
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('offers.duration NOT IN'),
        expect.anything()
      );
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('offers.collection_id IN'),
        expect.anything()
      );
    });

    it('applies the collectionIds filter on the collection_id column', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({ collectionIds: [10, 20] });

      expect(qb.andWhere).toHaveBeenCalledWith('offers.collection_id IN (:...collectionIds)', {
        collectionIds: [10, 20]
      });
    });
  });

  describe(OfferRepository.prototype.findSortPaginateBy.name, () => {
    it('paginates, orders by the requested column, and returns rows', async () => {
      const offers = [buildPostgresOffer({ id: 1 }), buildPostgresOffer({ id: 2 })];
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getMany!.mockResolvedValue(offers);
      model.createQueryBuilder.mockReturnValue(qb as never);
      (model.metadata!.findColumnWithPropertyName as jest.Mock).mockReturnValue({ propertyName: 'principal' });

      const result = await repository.findSortPaginateBy(
        {},
        { skip: 10, limit: 5, sort: { by: 'principal', direction: 'ASC' } }
      );

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(qb.orderBy).toHaveBeenCalledWith('offers.principal', 'ASC', 'NULLS LAST');
      expect(qb.addOrderBy).toHaveBeenCalledWith('offers.id', 'ASC');
      expect(result).toBe(offers);
    });

    it('defaults sort to createdAt DESC when no sort provided', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(qb as never);
      (model.metadata!.findColumnWithPropertyName as jest.Mock).mockReturnValue({ propertyName: 'createdAt' });

      await repository.findSortPaginateBy({}, { skip: 0, limit: 10 });

      expect(qb.orderBy).toHaveBeenCalledWith('offers.createdAt', 'DESC', 'NULLS LAST');
    });

    it('falls back to createdAt when column metadata is missing', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(qb as never);
      (model.metadata!.findColumnWithPropertyName as jest.Mock).mockReturnValue(undefined);

      await repository.findSortPaginateBy({}, { skip: 0, limit: 10, sort: { by: 'principal', direction: 'ASC' } });

      expect(qb.orderBy).toHaveBeenCalledWith('offers.createdAt', 'ASC', 'NULLS LAST');
    });

    it('sorts by principalUsd using a WETH-to-USD conversion select', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.findSortPaginateBy({}, { skip: 0, limit: 10, sort: { by: 'principalUsd', direction: 'DESC' } });

      expect(qb.addSelect).toHaveBeenCalledWith(
        `case when ("offers"."currency" = '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6') then "offers"."principal" * 2000 else "offers"."principal" end`,
        'offers_principalusd'
      );
      expect(qb.orderBy).toHaveBeenCalledWith('offers_principalusd', 'DESC', 'NULLS LAST');
      expect(qb.addOrderBy).toHaveBeenCalledWith('offers.id', 'ASC');
    });

    it('sorts by repaymentMaxUsd using a WETH-to-USD conversion select on repayment_max', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getMany!.mockResolvedValue([]);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.findSortPaginateBy(
        {},
        { skip: 0, limit: 10, sort: { by: 'repaymentMaxUsd', direction: 'ASC' } }
      );

      expect(qb.addSelect).toHaveBeenCalledWith(
        `case when ("offers"."currency" = '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6') then "offers"."repayment_max" * 2000 else "offers"."repayment_max" end`,
        'offers_repaymentmaxusd'
      );
      expect(qb.orderBy).toHaveBeenCalledWith('offers_repaymentmaxusd', 'ASC', 'NULLS LAST');
    });
  });

  describe('id filter', () => {
    it('applies the id filter with the numeric value', async () => {
      const qb = createTypeormQueryBuilderMock<Offer>();
      qb.getCount!.mockResolvedValue(0);
      model.createQueryBuilder.mockReturnValue(qb as never);

      await repository.countBy({ id: 99 });

      expect(qb.andWhere).toHaveBeenCalledWith('offers.id = :id', { id: 99 });
    });
  });
});
