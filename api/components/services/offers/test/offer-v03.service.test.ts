import { ConfigService } from '@nestjs/config';
import { SupportedCurrencies } from '@nftfi.api/core';
import { OfferRepository } from '@nftfi.api/repositories/postgres/offer';
import { MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { GnosisFacade } from '@nftfi.api/facades/gnosis';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { AssetContract } from '@nftfi.api/services/assets';
import { OfferV03Service } from '../src/offer-legacy';
import { OfferNotificationService } from '../src/offer-notification';

describe(OfferV03Service.name, () => {
  const offerRepository = {} as OfferRepository;
  const marketLoanRepository = {} as MarketLoanRepository;
  const supportedCurrencies = {
    getByContract: jest.fn().mockReturnValue({ denomination: 'ether' })
  } as unknown as SupportedCurrencies;
  const configService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'gnosis.urlTransaction':
          return 'https://safe.example';
        case 'validation':
          return { minimumLoanDurationSeconds: 86400, createLimit: { asset: 5, collection: 5, contract: 5 } };
        case 'pagination':
          return { limit: 20, page: 1 };
        case 'integrators':
          return JSON.stringify([{ integrator: '0x123', apiKeys: ['key'], nftAddresses: ['0xabc'] }]);
        case 'contracts':
          return { nftfi: { escrowV3: '0xescrow' } };
        case 'legacy':
          return {
            v03: {
              contractNameByType: { asset: 'v2-3.loan.fixed', collection: 'v2-3.loan.fixed.collection' },
              adminFeeBps: 200
            }
          };
        default:
          return undefined;
      }
    })
  } as unknown as ConfigService;
  const offerNotificationService = {} as OfferNotificationService;
  const assetContract = { isOwnerOf: jest.fn() } as unknown as AssetContract;
  const assetsFacade = {} as unknown as AssetsFacade;
  const gnosisFacade = { getSafes: jest.fn() } as unknown as GnosisFacade;

  const service = new OfferV03Service(
    offerRepository,
    marketLoanRepository,
    supportedCurrencies,
    configService,
    offerNotificationService,
    assetContract,
    assetsFacade,
    gnosisFacade
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe(OfferV03Service.prototype.isIntegratorContractOwner.name, () => {
    it('returns true when integrator owns contract address (case-insensitive)', () => {
      const integrator = {
        integrator: '0x123',
        apiKeys: ['key'],
        nftAddresses: ['0xAbC']
      };

      const result = service.isIntegratorContractOwner(integrator as never, '0xabc');

      expect(result).toBe(true);
    });

    it('returns false when integrator does not own contract address', () => {
      const integrator = {
        integrator: '0x123',
        apiKeys: ['key'],
        nftAddresses: ['0xdef']
      };

      const result = service.isIntegratorContractOwner(integrator as never, '0xabc');

      expect(result).toBe(false);
    });
  });
});
