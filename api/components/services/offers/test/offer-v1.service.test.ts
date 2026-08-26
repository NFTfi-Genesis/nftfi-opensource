import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SupportedCurrencies } from '@nftfi.api/core';
import { OfferRepository, OfferType } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository, MarketLoanStatus } from '@nftfi.api/repositories/postgres/market-loan';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { GnosisFacade } from '@nftfi.api/facades/gnosis';
import { OffersFacade } from '@nftfi.api/facades/offers';
import { AssetContract } from '@nftfi.api/services/assets';
import { buildPostgresOffer } from '@nftfi.api/repositories/postgres/factories/offer';
import { buildPostgresMarketLoan } from '@nftfi.api/repositories/postgres/factories/market-loan';
import { OfferNotificationService } from '../src/offer-notification';
import { OfferV1Service } from '../src/offer-v1';
import { OfferV1QueryDto } from '../src/offer-v1/dtos';

describe(OfferV1Service.name, () => {
  let service: OfferV1Service;
  let offerRepository: jest.Mocked<
    Pick<OfferRepository, 'softDeleteWinningOffer' | 'softDeleteExpired' | 'findSortPaginateBy' | 'countBy'>
  >;
  let marketLoanRepository: jest.Mocked<Pick<MarketLoanRepository, 'find'>>;
  let assetsFacade: jest.Mocked<Pick<AssetsFacade, 'getAssets' | 'getCollectionsByContract'>>;
  let cacheClient: { keys: jest.Mock; del: jest.Mock };
  let offersFacade: { invalidateCache: jest.Mock; deleteWinningOffer: jest.Mock };

  beforeEach(async () => {
    jest.resetAllMocks();

    offerRepository = {
      softDeleteWinningOffer: jest.fn(),
      softDeleteExpired: jest.fn(),
      findSortPaginateBy: jest.fn(),
      countBy: jest.fn()
    };
    marketLoanRepository = { find: jest.fn() };
    assetsFacade = { getAssets: jest.fn(), getCollectionsByContract: jest.fn() };
    cacheClient = { keys: jest.fn().mockResolvedValue([]), del: jest.fn() };
    offersFacade = { invalidateCache: jest.fn().mockResolvedValue(undefined), deleteWinningOffer: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              integrators: JSON.stringify([
                {
                  integrator: '0x5f79bd35435a7b98493543db0fec7f55292e9e77',
                  apiKeys: ['test-api-key'],
                  nftAddresses: ['0x145c5e0f3099dff40671d988c30b0e05f5279789']
                }
              ]),
              contracts: { nftfi: { escrowV3: '0xescrow' } }
            })
          ]
        })
      ],
      providers: [
        OfferV1Service,
        { provide: OfferRepository, useValue: offerRepository },
        { provide: MarketLoanRepository, useValue: marketLoanRepository },
        {
          provide: SupportedCurrencies,
          useValue: new SupportedCurrencies({
            WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
            DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
            USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
          })
        },
        { provide: AssetsFacade, useValue: assetsFacade },
        { provide: AssetContract, useValue: { isOwnerOf: jest.fn() } },
        { provide: OfferNotificationService, useValue: { notifyBorrowerReceivedOffer: jest.fn() } },
        { provide: GnosisFacade, useValue: { getSafes: jest.fn() } },
        { provide: OffersFacade, useValue: offersFacade },
        {
          provide: CACHE_MANAGER,
          useValue: { store: { client: cacheClient } }
        }
      ]
    }).compile();

    service = moduleRef.get(OfferV1Service);
  });

  describe(OfferV1Service.prototype.deleteWinningOffer.name, () => {
    const winningOfferKey = {
      lender: '0xLender',
      nftContract: '0xNFT',
      nftTokenId: '99',
      currency: '0xERC20',
      principal: '100',
      repaymentMax: '110',
      duration: 86400
    };

    it('soft-deletes the winning offer with LOAN_STARTED reason and emits cache invalidation', async () => {
      offerRepository.softDeleteWinningOffer.mockResolvedValue(1);

      await service.deleteWinningOffer(winningOfferKey);

      expect(offerRepository.softDeleteWinningOffer).toHaveBeenCalledWith(winningOfferKey, 'LOAN_STARTED');
      expect(offersFacade.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('does not emit cache invalidation when no offers are affected', async () => {
      offerRepository.softDeleteWinningOffer.mockResolvedValue(0);

      await expect(service.deleteWinningOffer(winningOfferKey)).resolves.toBeUndefined();
      expect(offersFacade.invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe(OfferV1Service.prototype.deleteExpired.name, () => {
    it('soft-deletes expired offers with the EXPIRED reason and emits cache invalidation', async () => {
      offerRepository.softDeleteExpired.mockResolvedValue(7);

      await service.deleteExpired();

      expect(offerRepository.softDeleteExpired).toHaveBeenCalledWith('EXPIRED');
      expect(offersFacade.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('does not emit cache invalidation when no offers are expired', async () => {
      offerRepository.softDeleteExpired.mockResolvedValue(0);

      await expect(service.deleteExpired()).resolves.toBeUndefined();
      expect(offersFacade.invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe(OfferV1Service.prototype.invalidateCache.name, () => {
    it('deletes redis keys under the offers-v1 scope', async () => {
      cacheClient.keys.mockResolvedValue(['offers-v1:http:get-many:a', 'offers-v1:http:get-many:b']);

      await service.invalidateCache();

      expect(cacheClient.keys).toHaveBeenCalledWith('offers-v1:*');
      expect(cacheClient.del).toHaveBeenCalledWith('offers-v1:http:get-many:a', 'offers-v1:http:get-many:b');
    });
  });

  describe(OfferV1Service.prototype.getMany.name, () => {
    it('defaults sort to CreatedAt when query.sort is undefined', async () => {
      offerRepository.findSortPaginateBy.mockResolvedValue([]);

      await service.getMany(
        { page: 1, limit: 10 } as OfferV1QueryDto,
        { account: '0xaccount', multisig: {} } as never,
        ''
      );

      expect(offerRepository.findSortPaginateBy).toHaveBeenCalledWith(expect.any(Object), {
        skip: 0,
        limit: 10,
        sort: { by: 'createdAt', direction: 'DESC' }
      });
    });
  });

  describe(OfferV1Service.prototype.redactSignature.name, () => {
    it('redacts signature on escrow-borrower asset offers when tokenAccount is missing', async () => {
      marketLoanRepository.find.mockResolvedValue([buildPostgresMarketLoan({ borrower: '0xrealborrower' })]);

      const offer = buildPostgresOffer({ type: OfferType.Asset, borrower: '0xescrow', signature: '0xsig' });
      const result = await service.redactSignature(offer, undefined as unknown as string, undefined, '');

      expect(result.signature).toBeNull();
      expect(marketLoanRepository.find).toHaveBeenCalledWith(
        { statuses: [MarketLoanStatus.Active], nftContracts: [offer.nftContract], nftIds: [offer.nftTokenIdFrom] },
        { skip: 0, limit: 1, sort: { by: 'startedAt', direction: 'DESC' } }
      );
    });

    it('keeps signature for an integrator contract owner identified by API key', async () => {
      const offer = buildPostgresOffer({
        type: OfferType.Asset,
        borrower: '0xrandomborrower',
        nftContract: '0x145c5e0f3099dff40671d988c30b0e05f5279789',
        signature: '0xsig'
      });

      const result = await service.redactSignature(offer, '0xotheraccount', undefined, 'test-api-key');

      expect(result.signature).toBe('0xsig');
    });
  });

  describe(OfferV1Service.prototype.toDtos.name, () => {
    it('returns undefined collection on asset offers when the asset is not found', async () => {
      assetsFacade.getAssets.mockResolvedValue([]);
      assetsFacade.getCollectionsByContract.mockResolvedValue([]);

      const offer = buildPostgresOffer({ type: OfferType.Asset });
      const [dto] = await service.toDtos([offer]);

      expect(dto.asset).toBeUndefined();
      expect(dto.collection).toBeUndefined();
    });
  });
});
